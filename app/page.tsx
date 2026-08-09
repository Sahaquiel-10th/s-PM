"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type Section = "dashboard" | "projects" | "people" | "settings";
type CalendarMode = "日" | "周" | "月" | "年";

const projects = [
  { id: "p1", name: "湖畔新生·品牌升级", client: "美湖文旅", status: "进行中", color: "#ff6b57", region: "杭州", date: "08.02—11.18" },
  { id: "p2", name: "MORI 秋季新品发布", client: "MORI Studio", status: "进行中", color: "#7857d7", region: "上海", date: "07.20—09.30" },
  { id: "p3", name: "云岛社区空间策划", client: "云岛地产", status: "已完成", color: "#28a777", region: "厦门", date: "03.12—07.28" },
  { id: "p4", name: "NOVA 数字展厅", client: "NOVA 科技", status: "提案中", color: "#efaa3d", region: "深圳", date: "08.08—12.20" },
  { id: "p5", name: "山海美术馆导览系统", client: "山海美术馆", status: "已完成", color: "#3987d7", region: "青岛", date: "01.16—06.30" },
];

const people = [
  { id: "c1", name: "林安然", role: "品牌总监", company: "美湖文旅", region: "杭州", count: 8, tone: "peach" },
  { id: "c2", name: "陈序", role: "创意合伙人", company: "MORI Studio", region: "上海", count: 6, tone: "violet" },
  { id: "c3", name: "周慧", role: "市场负责人", company: "NOVA 科技", region: "深圳", count: 5, tone: "blue" },
  { id: "c4", name: "叶澄", role: "项目总监", company: "云岛地产", region: "厦门", count: 4, tone: "green" },
  { id: "c5", name: "赵宁", role: "策展人", company: "山海美术馆", region: "青岛", count: 3, tone: "gold" },
];

const events = [
  { id: 1, title: "项目启动会", day: 11, time: "09:30", duration: 2, project: "p1", person: "c1", color: "coral", place: "线上会议" },
  { id: 2, title: "视觉提案内审", day: 12, time: "14:00", duration: 1.5, project: "p2", person: "c2", color: "violet", place: "创意室" },
  { id: 3, title: "展厅动线沟通", day: 13, time: "10:30", duration: 2, project: "p4", person: "c3", color: "gold", place: "NOVA 总部" },
  { id: 4, title: "品牌内容工作坊", day: 14, time: "13:00", duration: 3, project: "p1", person: "c1", color: "coral", place: "湖滨会议厅" },
  { id: 5, title: "周度项目站会", day: 15, time: "10:00", duration: 1, project: "p2", person: "c2", color: "violet", place: "线上会议" },
  { id: 6, title: "客户回访", day: 16, time: "15:30", duration: 1, project: "p3", person: "c4", color: "green", place: "云岛中心" },
];

const Icon = ({ children }: { children: string }) => <span className="nav-icon" aria-hidden="true">{children}</span>;

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [section, setSection] = useState<Section>("dashboard");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [mode, setMode] = useState<CalendarMode>("周");
  const [modal, setModal] = useState<"project" | "person" | "event" | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [
      ...projects.filter(p => `${p.name}${p.client}${p.region}`.toLowerCase().includes(q)).map(p => ({ ...p, type: "项目" })),
      ...people.filter(p => `${p.name}${p.company}${p.role}`.toLowerCase().includes(q)).map(p => ({ ...p, type: "联系人" })),
    ].slice(0, 6);
  }, [query]);

  function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("username") === "demo" && form.get("password") === "demo") {
      setLoggedIn(true);
      setLoginError("");
    } else setLoginError("账号或密码不正确，请使用 demo / demo");
  }

  function saveModal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const labels = { project: "项目", person: "人员", event: "日程" };
    setToast(`${modal ? labels[modal] : "内容"}已保存（演示）`);
    setModal(null);
    window.setTimeout(() => setToast(""), 2400);
  }

  if (!loggedIn) return <Login onSubmit={login} error={loginError} />;

  const goSection = (next: Section) => {
    setSection(next);
    if (next !== "projects") setSelectedProject(null);
    if (next !== "people") setSelectedPerson(null);
  };

  const calendarTitle = section === "projects" && selectedProject
    ? projects.find(p => p.id === selectedProject)?.name
    : section === "people" && selectedPerson
      ? people.find(p => p.id === selectedPerson)?.name
      : "全部日程";

  const filteredEvents = events.filter(event => {
    if (section === "projects" && selectedProject) return event.project === selectedProject;
    if (section === "people" && selectedPerson) return event.person === selectedPerson;
    return true;
  });

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">澄</span><span>澄序</span></div>
        <nav className="main-nav" aria-label="主导航">
          <button className={section === "dashboard" ? "active" : ""} onClick={() => goSection("dashboard")}><Icon children="◫" />看板</button>
          <button className={section === "projects" ? "active" : ""} onClick={() => goSection("projects")}><Icon children="□" />项目<span className="nav-count">12</span></button>
          <button className={section === "people" ? "active" : ""} onClick={() => goSection("people")}><Icon children="○" />人员<span className="nav-count">36</span></button>
          <button className={section === "settings" ? "active" : ""} onClick={() => goSection("settings")}><Icon children="⌘" />设置</button>
        </nav>
        <div className="sidebar-foot">
          <div className="mini-avatar">WN</div><div><strong>汪诺</strong><span>个人工作台</span></div><button onClick={() => setLoggedIn(false)} title="退出登录">→</button>
        </div>
      </aside>

      {(section === "projects" || section === "people") && (
        <SecondaryPanel
          type={section}
          selected={section === "projects" ? selectedProject : selectedPerson}
          onSelect={section === "projects" ? setSelectedProject : setSelectedPerson}
          onCreate={() => setModal(section === "projects" ? "project" : "person")}
        />
      )}

      <section className="workspace">
        <header className="topbar">
          <button className="search" onClick={() => setSearchOpen(true)} aria-label="打开搜索"><span>⌕</span><span>搜索项目、人员或日程</span><kbd>⌘ K</kbd></button>
          <div className="top-actions"><button className="icon-button" aria-label="帮助">?</button><button className="icon-button notification" aria-label="通知">◌</button></div>
        </header>

        <div className="content">
          {section === "dashboard" && <Dashboard onNavigate={goSection} />}
          {(section === "projects" || section === "people") && (
            <CalendarPage
              title={calendarTitle || "全部日程"}
              subtitle={section === "projects" ? "项目日程" : "联系人日程"}
              mode={mode}
              onMode={setMode}
              events={filteredEvents}
              onCreate={() => setModal("event")}
            />
          )}
          {section === "settings" && <Settings />}
        </div>
      </section>

      {modal && <Modal type={modal} onClose={() => setModal(null)} onSave={saveModal} />}
      {searchOpen && <SearchOverlay query={query} setQuery={setQuery} results={searchResults} onClose={() => { setSearchOpen(false); setQuery(""); }} onChoose={(item: any) => {
        if (item.type === "项目") { setSection("projects"); setSelectedProject(item.id); }
        else { setSection("people"); setSelectedPerson(item.id); }
        setSearchOpen(false); setQuery("");
      }} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

function Login({ onSubmit, error }: { onSubmit: (e: FormEvent<HTMLFormElement>) => void; error: string }) {
  return <main className="login-page">
    <section className="login-story">
      <div className="story-brand"><span>澄</span>澄序</div>
      <div className="story-copy"><p className="eyebrow">PERSONAL PROJECT OS</p><h1>让每一段合作，<br />都清晰可见。</h1><p>一处整理项目、人脉和日程，<br />把精力留给真正重要的创造。</p></div>
      <div className="story-orbit"><span className="orbit-one"></span><span className="orbit-two"></span><div className="orbit-card"><span>本周进展</span><strong>8 <small>项</small></strong><i>+ 3 较上周</i></div></div>
      <div className="story-foot">个人项目管理系统 <span>·</span> 数据由你掌控</div>
    </section>
    <section className="login-form-wrap">
      <form className="login-form" onSubmit={onSubmit}>
        <p className="login-kicker">欢迎回来</p><h2>登录澄序</h2><p className="login-hint">继续管理你的项目与合作网络</p>
        <label>账号<input name="username" placeholder="请输入账号" defaultValue="demo" autoFocus /></label>
        <label>密码<input name="password" type="password" placeholder="请输入密码" defaultValue="demo" /></label>
        <div className="login-options"><label><input type="checkbox" defaultChecked /> 记住我</label><button type="button">忘记密码？</button></div>
        {error && <p className="login-error">{error}</p>}
        <button className="login-submit" type="submit">登录 <span>→</span></button>
        <p className="demo-note">演示账号：<code>demo</code> 密码：<code>demo</code></p>
      </form>
    </section>
  </main>;
}

function SecondaryPanel({ type, selected, onSelect, onCreate }: { type: "projects" | "people"; selected: string | null; onSelect: (id: string | null) => void; onCreate: () => void }) {
  const list = type === "projects" ? projects : people;
  return <aside className="secondary">
    <div className="secondary-head"><div><span>{type === "projects" ? "项目列表" : "联系人"}</span><strong>{list.length}</strong></div><button onClick={onCreate}>+　{type === "projects" ? "新建项目" : "新建人员"}</button></div>
    <div className="secondary-filter"><span>⌕</span><input placeholder={type === "projects" ? "筛选项目" : "筛选人员"} /></div>
    <div className="secondary-list">
      <button className={`list-all ${!selected ? "active" : ""}`} onClick={() => onSelect(null)}><span className="all-icon">⋮</span><div><strong>全部日程</strong><small>查看所有安排</small></div></button>
      {list.map((item: any) => <button key={item.id} className={selected === item.id ? "active" : ""} onClick={() => onSelect(item.id)}>
        {type === "projects" ? <span className="project-dot" style={{ background: item.color }}></span> : <span className={`person-avatar ${item.tone}`}>{item.name.slice(-1)}</span>}
        <div><strong>{item.name}</strong><small>{type === "projects" ? `${item.status} · ${item.date}` : `${item.company} · ${item.role}`}</small></div><span className="chevron">›</span>
      </button>)}
    </div>
    <div className="secondary-foot"><span>◌</span><p><strong>今日还有 3 项安排</strong><small>下一项 14:00 开始</small></p></div>
  </aside>;
}

function Dashboard({ onNavigate }: { onNavigate: (s: Section) => void }) {
  return <div className="dashboard">
    <div className="page-title"><div><p>2026 年 8 月 9 日，星期日</p><h1>上午好，汪诺 <span>✦</span></h1><p>这是你的工作全景，今天也一起有序推进。</p></div><button className="primary" onClick={() => onNavigate("projects")}>+　记录新项目</button></div>
    <div className="metrics-grid">
      <Metric icon="□" label="项目总数" value="12" note="本月新增 2" tone="coral" onClick={() => onNavigate("projects")} />
      <Metric icon="○" label="联系人总数" value="36" note="本月新增 5" tone="violet" onClick={() => onNavigate("people")} />
      <div className="metric-card status-card"><div className="metric-head"><span>项目状态</span><i>近 12 个月</i></div><div className="status-values"><div><strong>5</strong><span><i className="dot ongoing"></i>进行中</span></div><div><strong>3</strong><span><i className="dot proposal"></i>提案中</span></div><div><strong>4</strong><span><i className="dot done"></i>已完成</span></div></div><div className="status-bar"><i></i><i></i><i></i></div></div>
    </div>
    <div className="dashboard-grid">
      <section className="panel cooperation"><PanelTitle title="合作最多的联系人" subtitle="按参与项目数量" action="查看全部" />
        <div className="ranking-list">{people.slice(0, 4).map((p, i) => <div key={p.id}><span className={`rank r${i + 1}`}>{i + 1}</span><span className={`person-avatar ${p.tone}`}>{p.name.slice(-1)}</span><p><strong>{p.name}</strong><small>{p.company} · {p.role}</small></p><div className="rank-bar"><i style={{ width: `${100 - i * 16}%` }}></i></div><b>{p.count}<small>次</small></b></div>)}</div>
      </section>
      <section className="panel schedule"><PanelTitle title="近期日程" subtitle="未来 7 天" action="查看日历" />
        <div className="schedule-list"><div><time><strong>10</strong><span>8月 周一</span></time><i className="timeline coral"></i><p><strong>品牌内容工作坊</strong><span>09:30—11:30 · 美湖文旅</span></p><em>进行中</em></div><div><time><strong>12</strong><span>8月 周三</span></time><i className="timeline violet"></i><p><strong>视觉提案内审</strong><span>14:00—15:30 · MORI Studio</span></p><em>待开始</em></div><div><time><strong>13</strong><span>8月 周四</span></time><i className="timeline gold"></i><p><strong>展厅动线沟通</strong><span>10:30—12:30 · NOVA 科技</span></p><em>待开始</em></div></div>
      </section>
      <RegionPanel title="项目地区分布" total="12 个项目" data={[["上海", 4, 100], ["杭州", 3, 74], ["深圳", 2, 52], ["厦门", 2, 52], ["青岛", 1, 28]]} tone="coral" />
      <RegionPanel title="联系人地区分布" total="36 位联系人" data={[["上海", 12, 100], ["杭州", 9, 76], ["深圳", 6, 52], ["北京", 5, 44], ["厦门", 4, 35]]} tone="violet" />
    </div>
  </div>;
}

function Metric({ icon, label, value, note, tone, onClick }: any) { return <button className={`metric-card simple ${tone}`} onClick={onClick}><span className="metric-icon">{icon}</span><p>{label}<strong>{value}</strong></p><span className="trend">↗</span><small>{note}</small></button>; }
function PanelTitle({ title, subtitle, action }: { title: string; subtitle: string; action: string }) { return <div className="panel-title"><div><h3>{title}</h3><p>{subtitle}</p></div><button>{action} ›</button></div>; }
function RegionPanel({ title, total, data, tone }: { title: string; total: string; data: (string | number)[][]; tone: string }) { return <section className={`panel region ${tone}`}><PanelTitle title={title} subtitle={total} action="详情" /><div className="region-body"><div className="donut"><div><strong>{data.length}</strong><span>覆盖城市</span></div></div><div className="region-bars">{data.map((r, i) => <div key={String(r[0])}><b>{i + 1}</b><span>{r[0]}</span><i><em style={{ width: `${r[2]}%` }}></em></i><strong>{r[1]}</strong></div>)}</div></div></section>; }

function CalendarPage({ title, subtitle, mode, onMode, events: filtered, onCreate }: { title: string; subtitle: string; mode: CalendarMode; onMode: (m: CalendarMode) => void; events: typeof events; onCreate: () => void }) {
  return <div className="calendar-page">
    <div className="calendar-heading"><div><p>{subtitle}</p><h1>{title}</h1><span>{filtered.length} 项安排·本周</span></div><button className="primary" onClick={onCreate}>+　新建日程</button></div>
    <section className="calendar-card">
      <div className="calendar-tools"><div className="date-nav"><button>‹</button><button>›</button><h2>2026 年 8 月 <span>第 33 周</span></h2><button className="today">今天</button></div><div className="view-switch">{(["日", "周", "月", "年"] as CalendarMode[]).map(m => <button key={m} className={mode === m ? "active" : ""} onClick={() => onMode(m)}>{m}</button>)}</div></div>
      {mode === "周" && <WeekView events={filtered} />}
      {mode === "日" && <DayView events={filtered} />}
      {mode === "月" && <MonthView events={filtered} />}
      {mode === "年" && <YearView events={filtered} />}
    </section>
  </div>;
}

const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
function WeekView({ events: visible }: { events: typeof events }) { const days = [[10, "一"], [11, "二"], [12, "三"], [13, "四"], [14, "五"], [15, "六"], [16, "日"]]; return <div className="week-view"><div className="week-head"><span></span>{days.map(([d, w]) => <div className={d === 11 ? "today-col" : ""} key={d}><span>周{w}</span><strong>{d}</strong></div>)}</div><div className="week-body"><div className="time-col">{times.map(t => <span key={t}>{t}</span>)}</div>{days.map(([d]) => <div className={`day-col ${d === 11 ? "today-col" : ""}`} key={d}>{times.map(t => <i key={t}></i>)}{visible.filter(e => e.day === d).map(e => <article key={e.id} className={`calendar-event ${e.color}`} style={{ top: `${((parseInt(e.time) - 9) * 60 + parseInt(e.time.slice(3))) * 1.15 + 6}px`, height: `${e.duration * 60 * 1.15 - 4}px` }}><strong>{e.title}</strong><span>{e.time}</span><small>{e.place}</small></article>)}</div>)}</div></div>; }
function DayView({ events: visible }: { events: typeof events }) { return <div className="day-view"><div className="day-heading"><div><span>星期二</span><strong>11</strong></div><p><strong>今日专注</strong><span>{visible.filter(e => e.day === 11).length || 0} 项日程</span></p></div><div className="day-schedule">{times.map(t => <div key={t}><span>{t}</span><i></i>{visible.filter(e => e.day === 11 && e.time.startsWith(t.slice(0, 2))).map(e => <article key={e.id} className={`calendar-event ${e.color}`}><strong>{e.title}</strong><span>{e.time} · {e.place}</span></article>)}</div>)}</div></div>; }
function MonthView({ events: visible }: { events: typeof events }) { return <div className="month-view"><div className="month-weekdays">{["一", "二", "三", "四", "五", "六", "日"].map(d => <span key={d}>周{d}</span>)}</div><div className="month-grid">{Array.from({ length: 35 }, (_, i) => { const day = i - 2; return <div key={i} className={day === 11 ? "today-cell" : day < 1 || day > 31 ? "muted" : ""}><strong>{day < 1 ? 31 + day : day > 31 ? day - 31 : day}</strong>{visible.filter(e => e.day === day).map(e => <span className={e.color} key={e.id}>{e.title}</span>)}</div>; })}</div></div>; }
function YearView({ events: visible }: { events: typeof events }) { return <div className="year-view">{Array.from({ length: 12 }, (_, month) => <div className={month === 7 ? "current-month" : ""} key={month}><h3>{month + 1} 月</h3><div className="mini-week">{["一", "二", "三", "四", "五", "六", "日"].map(d => <span key={d}>{d}</span>)}</div><div className="mini-days">{Array.from({ length: 35 }, (_, i) => <i key={i} className={month === 7 && visible.some(e => e.day === i - 1) ? "has-event" : month === 7 && i - 1 === 11 ? "today" : ""}>{i < 2 ? "" : i - 1 > 31 ? "" : i - 1}</i>)}</div></div>)}</div>; }

function Settings() { return <div className="settings-page"><div className="calendar-heading"><div><p>工作台设置</p><h1>设置</h1><span>管理个人信息、账号与数据</span></div></div><div className="settings-layout"><aside><button className="active">个人信息</button><button>账号与安全</button><button>通知设置</button><button>数据与存储</button></aside><section className="settings-card"><div className="settings-avatar">WN<button>+</button></div><div><h3>个人信息</h3><p>这些信息会显示在你的个人工作台中。</p></div><label>姓名<input defaultValue="汪诺" /></label><label>登录账号<input defaultValue="wangnuo" /></label><label>邮箱<input defaultValue="wangnuo@example.com" /></label><button className="primary">保存修改</button></section></div></div>; }

function Modal({ type, onClose, onSave }: { type: "project" | "person" | "event"; onClose: () => void; onSave: (e: FormEvent<HTMLFormElement>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null); const [files, setFiles] = useState<string[]>([]);
  const title = type === "project" ? "新建项目" : type === "person" ? "新建人员" : "新建日程";
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="modal" onSubmit={onSave}><div className="modal-head"><div><span>{type === "event" ? "CALENDAR" : "NEW RECORD"}</span><h2>{title}</h2></div><button type="button" onClick={onClose}>×</button></div>
    {type === "project" && <><label>项目名称<input required placeholder="例如：秋季新品发布" /></label><div className="form-row"><label>客户 / 合作方<input placeholder="输入合作方" /></label><label>项目状态<select><option>提案中</option><option>进行中</option><option>已完成</option></select></label></div><div className="form-row"><label>开始日期<input type="date" /></label><label>所在地区<input placeholder="上海" /></label></div><label>项目备注<textarea placeholder="记录项目目标和重要信息…"></textarea></label></>}
    {type === "person" && <><div className="form-row"><label>姓名<input required placeholder="联系人姓名" /></label><label>职位<input placeholder="品牌总监" /></label></div><label>公司 / 机构<input placeholder="所在公司" /></label><div className="form-row"><label>手机号<input placeholder="138 0000 0000" /></label><label>所在地<input placeholder="杭州" /></label></div><label>备注<textarea placeholder="记录彼此的合作偏好…"></textarea></label></>}
    {type === "event" && <><label>日程标题<input required placeholder="例如：项目启动会" /></label><div className="form-row"><label>开始时间<input type="datetime-local" /></label><label>结束时间<input type="datetime-local" /></label></div><div className="form-row"><label>关联项目<select><option>请选择</option>{projects.map(p => <option key={p.id}>{p.name}</option>)}</select></label><label>关联人员<select><option>请选择</option>{people.map(p => <option key={p.id}>{p.name}</option>)}</select></label></div><label>地点<input placeholder="会议室或线上链接" /></label><label>备注<textarea placeholder="补充日程说明…"></textarea></label><div className="upload-area" onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={e => setFiles(Array.from(e.target.files || []).map(f => f.name))} /><span>↑</span><div><strong>上传文件或图片</strong><small>点击选择，支持图片、PDF、Office 文件</small></div></div>{files.length > 0 && <div className="file-list">{files.map(f => <span key={f}>▧ {f}</span>)}</div>}</>}
    <div className="modal-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" type="submit">保存{type === "event" ? "日程" : ""}</button></div></form></div>;
}

function SearchOverlay({ query, setQuery, results, onClose, onChoose }: any) { return <div className="search-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="search-box"><div className="search-input"><span>⌕</span><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索项目、联系人…" /><kbd onClick={onClose}>ESC</kbd></div>{query ? <div className="search-results"><p>搜索结果 · {results.length}</p>{results.length ? results.map((r: any) => <button key={`${r.type}${r.id}`} onClick={() => onChoose(r)}><span>{r.type === "项目" ? "□" : "○"}</span><div><strong>{r.name}</strong><small>{r.type === "项目" ? `${r.client} · ${r.region}` : `${r.company} · ${r.role}`}</small></div><em>{r.type}</em></button>) : <div className="empty-search">没有找到匹配内容</div>}</div> : <div className="search-suggestions"><p>快速访问</p><button><span>⌘</span>查看本周日程</button><button><span>□</span>查看进行中项目</button></div>}<div className="search-foot">↑↓ 选择　↵ 打开　ESC 关闭</div></div></div>; }
