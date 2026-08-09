import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const host = process.env.SPM_API_HOST || "127.0.0.1";
const port = Number(process.env.SPM_API_PORT || 3110);
const dataDir = process.env.SPM_DATA_DIR || join(process.cwd(), ".data");
mkdirSync(dataDir, { recursive: true, mode: 0o700 });

const db = new DatabaseSync(join(dataDir, "s-pm.sqlite"));
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");

const secretPath = process.env.SPM_SESSION_SECRET_FILE || join(dataDir, "session-secret");
let sessionSecret;
try {
  sessionSecret = readFileSync(secretPath, "utf8").trim();
} catch {
  sessionSecret = randomBytes(48).toString("hex");
}
if (sessionSecret.length < 32) throw new Error("Session secret must contain at least 32 characters");

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const tones = ["peach", "violet", "blue", "green", "gold"];
const colors = ["coral", "violet", "gold", "green"];
const loginAttempts = new Map();

function send(res, status, payload, headers = {}) {
  res.writeHead(status, { ...jsonHeaders, ...headers });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error("Request too large");
  }
  return raw ? JSON.parse(raw) : {};
}

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map(v => v.trim()).filter(Boolean).map(v => {
    const index = v.indexOf("=");
    return [v.slice(0, index), decodeURIComponent(v.slice(index + 1))];
  }));
}

function sign(value) {
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function createToken(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, username: user.username, name: user.display_name, exp: Date.now() + 7 * 86400_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function getUser(req) {
  const token = cookies(req).spm_session;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return user.exp > Date.now() ? user : null;
  } catch { return null; }
}

function verifyPassword(password, stored) {
  const [algorithm, salt, expected] = String(stored).split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function projectRows() {
  return db.prepare(`SELECT id, name, client_name AS client, status, region, start_date AS startDate,
    end_date AS endDate, notes, color, COALESCE(substr(start_date, 6), '') || CASE WHEN end_date IS NULL THEN '' ELSE '—' || substr(end_date, 6) END AS date
    FROM projects ORDER BY created_at DESC`).all().map(row => ({ ...row, id: String(row.id) }));
}

function contactRows() {
  return db.prepare(`SELECT c.id, c.name, c.company, c.role, c.phone, c.email, c.region, c.notes,
    COUNT(pc.project_id) AS count FROM contacts c LEFT JOIN project_contacts pc ON pc.contact_id = c.id
    GROUP BY c.id ORDER BY count DESC, c.created_at DESC`).all().map((row, index) => ({ ...row, id: String(row.id), tone: tones[index % tones.length] }));
}

function scheduleRows() {
  return db.prepare(`SELECT s.id, s.title, s.description, s.location AS place, s.starts_at AS startsAt, s.ends_at AS endsAt,
    sp.project_id AS project, sc.contact_id AS person FROM schedules s
    LEFT JOIN schedule_projects sp ON sp.schedule_id = s.id
    LEFT JOIN schedule_contacts sc ON sc.schedule_id = s.id ORDER BY s.starts_at`).all().map((row, index) => {
      const start = new Date(String(row.startsAt));
      const end = new Date(String(row.endsAt));
      return { ...row, id: Number(row.id), project: row.project == null ? null : String(row.project), person: row.person == null ? null : String(row.person), day: start.getDate(), time: start.toTimeString().slice(0, 5), duration: Math.max(.5, (end.getTime() - start.getTime()) / 3600000), color: colors[index % colors.length] };
    });
}

function bootstrap() {
  const projects = projectRows();
  const people = contactRows();
  const events = scheduleRows();
  return { projects, people, events };
}

function required(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label}不能为空`);
  return text;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/health") return send(res, 200, { ok: true });

    if (req.method === "POST" && url.pathname === "/api/login") {
      const clientIp = String(req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown");
      const attempt = loginAttempts.get(clientIp) || { count: 0, resetAt: Date.now() + 15 * 60_000 };
      if (attempt.resetAt < Date.now()) { attempt.count = 0; attempt.resetAt = Date.now() + 15 * 60_000; }
      if (attempt.count >= 10) return send(res, 429, { error: "尝试次数过多，请稍后再试" });
      const body = await readJson(req);
      const user = db.prepare("SELECT id, username, password_hash, display_name FROM users WHERE username = ?").get(String(body.username || "").trim());
      if (!user || !verifyPassword(String(body.password || ""), user.password_hash)) {
        attempt.count += 1;
        loginAttempts.set(clientIp, attempt);
        return send(res, 401, { error: "账号或密码不正确" });
      }
      loginAttempts.delete(clientIp);
      const secure = req.headers["x-forwarded-proto"] === "https";
      const cookie = `spm_session=${encodeURIComponent(createToken(user))}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure ? "; Secure" : ""}`;
      return send(res, 200, { user: { id: user.id, username: user.username, name: user.display_name } }, { "set-cookie": cookie });
    }

    if (req.method === "POST" && url.pathname === "/api/logout") return send(res, 200, { ok: true }, { "set-cookie": "spm_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" });

    const user = getUser(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    if (req.method === "GET" && url.pathname === "/api/session") return send(res, 200, { user });
    if (req.method === "GET" && url.pathname === "/api/bootstrap") return send(res, 200, bootstrap());

    if (req.method === "POST" && url.pathname === "/api/projects") {
      const body = await readJson(req);
      const result = db.prepare(`INSERT INTO projects (name, client_name, status, region, start_date, end_date, notes, color, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(required(body.name, "项目名称"), body.client || null, body.status || "提案中", body.region || null, body.startDate || null, body.endDate || null, body.notes || null, body.color || "#ff735f", user.id);
      return send(res, 201, { id: String(result.lastInsertRowid) });
    }

    if (req.method === "POST" && url.pathname === "/api/contacts") {
      const body = await readJson(req);
      const result = db.prepare(`INSERT INTO contacts (name, company, role, phone, email, region, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(required(body.name, "姓名"), body.company || null, body.role || null, body.phone || null, body.email || null, body.region || null, body.notes || null, user.id);
      return send(res, 201, { id: String(result.lastInsertRowid) });
    }

    if (req.method === "POST" && url.pathname === "/api/schedules") {
      const body = await readJson(req);
      const startsAt = required(body.startsAt, "开始时间");
      const endsAt = required(body.endsAt, "结束时间");
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = db.prepare(`INSERT INTO schedules (title, description, location, starts_at, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(required(body.title, "日程标题"), body.description || null, body.location || null, startsAt, endsAt, user.id);
        const id = result.lastInsertRowid;
        if (body.projectId) db.prepare("INSERT INTO schedule_projects (schedule_id, project_id) VALUES (?, ?)").run(id, body.projectId);
        if (body.contactId) db.prepare("INSERT INTO schedule_contacts (schedule_id, contact_id) VALUES (?, ?)").run(id, body.contactId);
        db.exec("COMMIT");
        return send(res, 201, { id: String(id) });
      } catch (error) { db.exec("ROLLBACK"); throw error; }
    }

    return send(res, 404, { error: "未找到接口" });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "服务器错误";
    return send(res, message.includes("不能为空") ? 400 : 500, { error: message });
  }
});

server.listen(port, host, () => console.log(`s-PM API listening on http://${host}:${port}`));
