"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type * as React from "react";
import { createPortal } from "react-dom";

type Section = "dashboard" | "projects" | "people" | "settings";
type CalendarMode = "日" | "周" | "月" | "年";
type SettingsTab = "profile" | "security" | "notifications" | "storage" | "history" | "trash";
type Profile = { displayName: string; username: string; email?: string | null };
type Preferences = { scheduleReminders: boolean; projectUpdates: boolean; weeklyDigest: boolean };
type StorageInfo = { provider: string; configured: boolean; bucket?: string | null; region?: string | null };
type TrashItem = { id: string; type: "project" | "contact" | "schedule" | "attachment" | "task"; label: string; name: string; summary?: string | null; deletedAt: string };
type TaskItem = { id: string; projectId: string; title: string; dueDate?: string | null; status: "todo" | "done"; assigneeId?: string | null; assigneeName?: string | null; isMilestone: boolean };
type ActivityItem = { id: string; entityType: string; entityId?: string | null; action: string; entityName: string; details?: string | null; createdAt: string };

const projects: any[] = [
  { id: "p1", name: "湖畔新生·品牌升级", client: "美湖文旅", status: "进行中", color: "#ff6b57", region: "杭州", date: "08.02—11.18" },
  { id: "p2", name: "MORI 秋季新品发布", client: "MORI Studio", status: "进行中", color: "#7857d7", region: "上海", date: "07.20—09.30" },
  { id: "p3", name: "云岛社区空间策划", client: "云岛地产", status: "已完成", color: "#28a777", region: "厦门", date: "03.12—07.28" },
  { id: "p4", name: "NOVA 数字展厅", client: "NOVA 科技", status: "提案中", color: "#efaa3d", region: "深圳", date: "08.08—12.20" },
  { id: "p5", name: "山海美术馆导览系统", client: "山海美术馆", status: "已完成", color: "#3987d7", region: "青岛", date: "01.16—06.30" },
];

const people: any[] = [
  { id: "c1", name: "林安然", role: "品牌总监", company: "美湖文旅", region: "杭州", count: 8, tone: "peach" },
  { id: "c2", name: "陈序", role: "创意合伙人", company: "MORI Studio", region: "上海", count: 6, tone: "violet" },
  { id: "c3", name: "周慧", role: "市场负责人", company: "NOVA 科技", region: "深圳", count: 5, tone: "blue" },
  { id: "c4", name: "叶澄", role: "项目总监", company: "云岛地产", region: "厦门", count: 4, tone: "green" },
  { id: "c5", name: "赵宁", role: "策展人", company: "山海美术馆", region: "青岛", count: 3, tone: "gold" },
];

const events: any[] = [
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
  const [authReady, setAuthReady] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [projectItems, setProjectItems] = useState(projects);
  const [peopleItems, setPeopleItems] = useState(people);
  const [eventItems, setEventItems] = useState(events);
  const [taskItems, setTaskItems] = useState<TaskItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [section, setSection] = useState<Section>("dashboard");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [mode, setMode] = useState<CalendarMode>("周");
  const [modal, setModal] = useState<"project" | "person" | "event" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalDefaults, setModalDefaults] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState<Profile>({ displayName: "汪诺", username: "汪诺", email: "" });
  const [preferences, setPreferences] = useState<Preferences>({ scheduleReminders: true, projectUpdates: true, weeklyDigest: true });
  const [storage, setStorage] = useState<StorageInfo>({ provider: "腾讯云 COS", configured: false });
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile");
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [
      ...projectItems.filter(p => `${p.name}${p.client}${p.region}${(p.tags || []).join("")}`.toLowerCase().includes(q)).map(p => ({ ...p, type: "项目" })),
      ...peopleItems.filter(p => `${p.name}${p.company}${p.role}${(p.tags || []).join("")}`.toLowerCase().includes(q)).map(p => ({ ...p, type: "联系人" })),
      ...eventItems.filter((event: any) => `${event.title}${event.place || ""}${event.description || ""}`.toLowerCase().includes(q)).map((event: any) => ({ ...event, name: event.title, type: "日程" })),
      ...taskItems.filter(task => task.title.toLowerCase().includes(q)).map(task => ({ ...task, name: task.title, type: "待办" })),
    ].slice(0, 6);
  }, [query, projectItems, peopleItems, eventItems, taskItems]);

  useEffect(() => {
    fetch("/api/session", { credentials: "include" }).then(response => {
      if (!response.ok) throw new Error();
      setLoggedIn(true);
      return loadData();
    }).catch(() => undefined).finally(() => setAuthReady(true));
  }, []);

  async function loadData() {
    const response = await fetch("/api/bootstrap", { credentials: "include" });
    if (!response.ok) throw new Error("数据加载失败");
    const data = await response.json();
    setProjectItems(data.projects || []);
    setPeopleItems(data.people || []);
    setEventItems(data.events || []);
    setTaskItems(data.tasks || []);
    setActivities(data.activities || []);
    setTrashItems(data.trash || []);
    if (data.profile) setProfile(data.profile);
    if (data.preferences) setPreferences(data.preferences);
    if (data.storage) setStorage(data.storage);
  }

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoginError("");
    const response = await fetch("/api/login", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
    if (response.ok) {
      setLoggedIn(true);
      await loadData();
    } else {
      const data = await response.json().catch(() => ({}));
      setLoginError(data.error || "账号或密码不正确");
    }
  }

  async function saveModal(e: FormEvent<HTMLFormElement>, files: File[] = []) {
    e.preventDefault();
    if (!modal) return;
    const form = new FormData(e.currentTarget);
    const body: any = Object.fromEntries(form.entries());
    if (modal === "project") body.contactIds = form.getAll("contactIds");
    const endpoint = modal === "project" ? "projects" : modal === "person" ? "contacts" : "schedules";
    const response = await fetch(`/api/${endpoint}${editingItem ? `/${editingItem.id}` : ""}`, { method: editingItem ? "PUT" : "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setToast(data.error || "保存失败");
      window.setTimeout(() => setToast(""), 3000);
      return;
    }
    const saved = await response.json();
    if (modal === "event" && files.length) {
      for (const file of files) {
        const upload = await fetch(`/api/schedules/${saved.id}/attachments?name=${encodeURIComponent(file.name)}`, { method: "POST", credentials: "include", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
        if (!upload.ok) {
          const data = await upload.json().catch(() => ({}));
          setToast(`日程已保存，但附件上传失败：${data.error || file.name}`);
          window.setTimeout(() => setToast(""), 4500);
          await loadData();
          setModal(null);
          return;
        }
      }
    }
    const labels = { project: "项目", person: "人员", event: "日程" };
    await loadData();
    setToast(`${labels[modal]}已${editingItem ? "更新" : "保存"}`);
    setModal(null);
    setEditingItem(null);
    setModalDefaults(null);
    window.setTimeout(() => setToast(""), 2400);
  }

  const openEditor = (type: "project" | "person" | "event", item?: any, defaults?: any) => { setEditingItem(item || null); setModalDefaults(defaults || null); setModal(type); };

  async function deleteRecord(type: "project" | "person" | "event", item: any) {
    const label = type === "project" ? "项目" : type === "person" ? "人员" : "日程";
    const childCount = type === "project" && !item.parentId ? projectItems.filter(project => project.parentId === item.id).length : 0;
    const groupNote = childCount ? `\n该操作会同时移入 ${childCount} 个子项目，恢复时也会一并恢复。` : "";
    if (!window.confirm(`确定将“${item.name || item.title}”移入回收站吗？${groupNote}\n之后可以随时恢复。`)) return;
    const endpoint = type === "project" ? "projects" : type === "person" ? "contacts" : "schedules";
    const response = await fetch(`/api/${endpoint}/${item.id}`, { method: "DELETE", credentials: "include" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return notify(data.error || `删除${label}失败`);
    if (type === "project" && selectedProject === item.id) setSelectedProject(null);
    if (type === "person" && selectedPerson === item.id) setSelectedPerson(null);
    setModal(null); setEditingItem(null);
    await loadData(); notify(`${label}已移入回收站`);
  }

  async function restoreRecord(item: TrashItem) {
    const response = await fetch(`/api/trash/${item.type}/${item.id}/restore`, { method: "POST", credentials: "include" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return notify(data.error || "恢复失败");
    await loadData();
    notify(`${item.label}“${item.name}”已恢复`);
  }

  async function moveEvent(item: any, day: Date) {
    const date = dateKey(day);
    const originalStart = new Date(item.startsAt);
    const originalEnd = new Date(item.endsAt);
    const startsAt = `${date}T${String(item.startsAt).slice(11, 16)}`;
    const movedEnd = new Date(new Date(startsAt).getTime() + Math.max(0, originalEnd.getTime() - originalStart.getTime()));
    const endsAt = dateTimeKey(movedEnd);
    const response = await fetch(`/api/schedules/${item.id}/move`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ startsAt, endsAt }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return notify(data.error || "日程改期失败");
    await loadData(); notify("日程已改期");
  }

  async function saveTask(payload: any, task?: TaskItem) {
    const response = await fetch(`/api/tasks${task ? `/${task.id}` : ""}`, { method: task ? "PUT" : "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { notify(data.error || "待办保存失败"); return false; }
    await loadData(); notify(task ? "待办已更新" : "待办已添加");
    return true;
  }

  async function deleteTask(task: TaskItem) {
    if (!window.confirm(`确定将“${task.title}”移入回收站吗？`)) return;
    const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE", credentials: "include" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return notify(data.error || "删除失败");
    await loadData(); notify("待办已移入回收站");
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") { setSearchOpen(false); setModal(null); setEditingItem(null); setModalDefaults(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };

  if (!authReady) return <main className="login-page"><section className="login-story"></section><section className="login-form-wrap"><div className="login-form"><p className="login-kicker">澄序</p><h2>正在打开工作台…</h2></div></section></main>;
  if (!loggedIn) return <Login onSubmit={login} error={loginError} />;

  const goSection = (next: Section) => {
    setSection(next);
    if (next !== "projects") setSelectedProject(null);
    if (next !== "people") setSelectedPerson(null);
  };

  const calendarTitle = section === "projects" && selectedProject
    ? projectItems.find(p => p.id === selectedProject)?.name
    : section === "people" && selectedPerson
      ? peopleItems.find(p => p.id === selectedPerson)?.name
      : "全部日程";

  const filteredEvents = eventItems.filter(event => {
    if (section === "projects" && selectedProject) {
      const selected = projectItems.find(project => project.id === selectedProject);
      const projectIds = selected?.parentId ? [selectedProject] : [selectedProject, ...projectItems.filter(project => project.parentId === selectedProject).map(project => project.id)];
      return projectIds.includes(event.project);
    }
    if (section === "people" && selectedPerson) return event.person === selectedPerson;
    return true;
  });

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">澄</span><span>澄序</span></div>
        <nav className="main-nav" aria-label="主导航">
          <button className={section === "dashboard" ? "active" : ""} onClick={() => goSection("dashboard")}><Icon children="◫" />看板</button>
          <button className={section === "projects" ? "active" : ""} onClick={() => goSection("projects")}><Icon children="□" />项目<span className="nav-count">{projectItems.length}</span></button>
          <button className={section === "people" ? "active" : ""} onClick={() => goSection("people")}><Icon children="○" />人员<span className="nav-count">{peopleItems.length}</span></button>
          <button className={section === "settings" ? "active" : ""} onClick={() => goSection("settings")}><Icon children="⌘" />设置</button>
        </nav>
        <div className="sidebar-foot">
          <div className="mini-avatar">WN</div><div><strong>汪诺</strong><span>个人工作台</span></div><button onClick={async () => { await fetch("/api/logout", { method: "POST" }); setLoggedIn(false); }} title="退出登录">→</button>
        </div>
      </aside>

      {(section === "projects" || section === "people") && (
        <SecondaryPanel
          type={section}
          selected={section === "projects" ? selectedProject : selectedPerson}
          onSelect={section === "projects" ? setSelectedProject : setSelectedPerson}
          onCreate={() => openEditor(section === "projects" ? "project" : "person")}
          onCreateChild={(parent) => openEditor("project", undefined, { parentId: parent.id, parentName: parent.name, client: parent.client, region: parent.region, tags: parent.tags, contactIds: parent.contactIds })}
          onEdit={(item) => openEditor(section === "projects" ? "project" : "person", item)}
          onDelete={(item) => deleteRecord(section === "projects" ? "project" : "person", item)}
          projects={projectItems}
          people={peopleItems}
        />
      )}

      <section className="workspace">
        <header className="topbar">
          <button className="search" onClick={() => setSearchOpen(true)} aria-label="打开搜索"><span>⌕</span><span>搜索项目、人员或日程</span><kbd>⌘ K</kbd></button>
          <div className="top-actions"><button className="icon-button" aria-label="帮助" onClick={() => notify("可用 ⌘K 搜索；项目和人员页可筛选关联日程")}>?</button><button className="icon-button notification" aria-label="通知" onClick={() => { goSection("settings"); setSettingsTab("notifications"); }}><span className="notification">◌</span></button></div>
        </header>

        <div className="content">
          {section === "dashboard" && <Dashboard onNavigate={goSection} onCalendar={() => { goSection("projects"); setSelectedProject(null); }} projects={projectItems} people={peopleItems} events={eventItems} tasks={taskItems} />}
          {(section === "projects" || section === "people") && (
            <>{section === "projects" && selectedProject && <ProjectOverview project={projectItems.find(project => project.id === selectedProject)} projects={projectItems} people={peopleItems} tasks={taskItems.filter(task => task.projectId === selectedProject)} activities={activities.filter(activity => activity.entityType === "project" && activity.entityId === selectedProject)} onEditProject={(project: any) => openEditor("project", project)} onCreateChild={(parent: any) => openEditor("project", undefined, { parentId: parent.id, parentName: parent.name, client: parent.client, region: parent.region, tags: parent.tags, contactIds: parent.contactIds })} onSaveTask={saveTask} onDeleteTask={deleteTask} />}
              {section === "people" && selectedPerson && <ContactOverview person={peopleItems.find(person => person.id === selectedPerson)} projects={projectItems} />}
              <CalendarPage
              title={calendarTitle || "全部日程"}
              subtitle={section === "projects" ? "项目日程" : "联系人日程"}
              mode={mode}
              onMode={setMode}
              events={filteredEvents}
              onCreate={() => openEditor("event", undefined, section === "projects" ? { projectId: selectedProject } : { contactId: selectedPerson })}
              onEdit={(item) => openEditor("event", item)}
              onMove={moveEvent}
              date={calendarDate}
              onDate={setCalendarDate}
            /></>
          )}
          {section === "settings" && <Settings tab={settingsTab} onTab={setSettingsTab} profile={profile} preferences={preferences} storage={storage} trash={trashItems} activities={activities} counts={{ projects: projectItems.length, people: peopleItems.length, events: eventItems.length }} onRestore={restoreRecord} onSaved={async message => { await loadData(); notify(message); }} />}
        </div>
      </section>

      {modal && <Modal type={modal} item={editingItem} defaults={modalDefaults} onClose={() => { setModal(null); setEditingItem(null); setModalDefaults(null); }} onSave={saveModal} onDelete={() => editingItem && deleteRecord(modal, editingItem)} onAttachmentDeleted={loadData} projects={projectItems} people={peopleItems} />}
      {searchOpen && <SearchOverlay query={query} setQuery={setQuery} results={searchResults} onClose={() => { setSearchOpen(false); setQuery(""); }} onWeek={() => { setSection("projects"); setSelectedProject(null); setMode("周"); setCalendarDate(new Date()); setSearchOpen(false); }} onOngoing={() => { setSection("projects"); setSelectedProject(projectItems.find(p => p.status === "进行中")?.id || null); setSearchOpen(false); }} onChoose={(item: any) => {
        if (item.type === "项目") { setSection("projects"); setSelectedProject(item.id); }
        else if (item.type === "联系人") { setSection("people"); setSelectedPerson(item.id); }
        else if (item.type === "待办") { setSection("projects"); setSelectedProject(item.projectId); }
        else { setSection("projects"); setSelectedProject(item.project || null); setCalendarDate(new Date(item.startsAt)); }
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
        <label>账号<input name="username" placeholder="请输入账号" defaultValue="汪诺" autoFocus /></label>
        <label>密码<input name="password" type="password" placeholder="请输入密码" /></label>
        <div className="login-options"><label><input type="checkbox" defaultChecked /> 记住我</label><button type="button" onClick={() => window.alert("这是个人工作台，请联系系统管理员重置密码。")}>忘记密码？</button></div>
        {error && <p className="login-error">{error}</p>}
        <button className="login-submit" type="submit">登录 <span>→</span></button>
        <p className="demo-note">账号由项目所有人管理</p>
      </form>
    </section>
  </main>;
}

function HoverDetails({ title, rows }: { title: string; rows: Array<[string, string | number | null | undefined]> }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<{ left: number; top: number; side: "top" | "bottom" } | null>(null);

  useEffect(() => {
    const trigger = anchorRef.current?.parentElement;
    if (!trigger) return;
    const show = () => {
      const rect = trigger.getBoundingClientRect();
      const width = 240;
      const side = window.innerHeight - rect.bottom >= 220 ? "bottom" : "top";
      setPlacement({
        left: Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - width - 12)),
        top: side === "bottom" ? rect.bottom + 8 : rect.top - 8,
        side,
      });
    };
    const hide = () => setPlacement(null);
    trigger.addEventListener("mouseenter", show);
    trigger.addEventListener("mouseleave", hide);
    trigger.addEventListener("focusin", show);
    trigger.addEventListener("focusout", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      trigger.removeEventListener("mouseenter", show);
      trigger.removeEventListener("mouseleave", hide);
      trigger.removeEventListener("focusin", show);
      trigger.removeEventListener("focusout", hide);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  const content = <><strong>{title}</strong>{rows.filter(([, value]) => value !== null && value !== undefined && value !== "").map(([label, value]) => <span key={label}><b>{label}</b><em>{String(value)}</em></span>)}</>;
  return <><span ref={anchorRef} className="hover-anchor" aria-hidden="true"></span>{placement && createPortal(<span className="hover-details" role="tooltip" data-side={placement.side} style={{ left: placement.left, top: placement.top }}>{content}</span>, document.body)}</>;
}

function SecondaryPanel({ type, selected, onSelect, onCreate, onCreateChild, onEdit, onDelete, projects, people }: { type: "projects" | "people"; selected: string | null; onSelect: (id: string | null) => void; onCreate: () => void; onCreateChild: (item: any) => void; onEdit: (item: any) => void; onDelete: (item: any) => void; projects: typeof globalThisProjects; people: typeof globalThisPeople }) {
  const [filter, setFilter] = useState("");
  const [tag, setTag] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const source = type === "projects" ? projects : people;
  const q = filter.trim().toLowerCase();
  const matches = (item: any) => (!q || `${item.name}${item.client || ""}${item.company || ""}${item.region || ""}${item.status || ""}${(item.tags || []).join("")}`.toLowerCase().includes(q)) && (!tag || item.tags?.includes(tag));
  const allTags = [...new Set(source.flatMap((item: any) => item.tags || []))].slice(0, 8);
  const roots = type === "projects" ? projects.filter((item: any) => !item.parentId) : [];
  const toggleExpanded = (id: string) => setExpanded(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const projectRows = roots.flatMap((root: any) => {
    const children = projects.filter((item: any) => item.parentId === root.id);
    const visibleChildren = children.filter(matches);
    const rootMatches = matches(root);
    if (!rootMatches && visibleChildren.length === 0) return [];
    const open = expanded.has(root.id) || Boolean(q || tag);
    return [{ item: root, child: false, childCount: children.length, open }, ...(open ? visibleChildren.map((item: any) => ({ item, child: true, childCount: 0, open: false })) : [])];
  });
  const peopleRows = people.filter(matches).map((item: any) => ({ item, child: false, childCount: 0, open: false }));
  const rows = type === "projects" ? projectRows : peopleRows;
  return <aside className="secondary">
    <div className="secondary-head"><div><span>{type === "projects" ? "项目列表" : "联系人"}</span><strong>{source.length}</strong></div><button onClick={onCreate}>+　{type === "projects" ? "新建项目" : "新建人员"}</button></div>
    <div className="secondary-filter"><span>⌕</span><input value={filter} onChange={e => setFilter(e.target.value)} placeholder={type === "projects" ? "筛选项目" : "筛选人员"} /></div>
    {allTags.length > 0 && <div className="tag-filter"><button className={!tag ? "active" : ""} onClick={() => setTag("")}>全部</button>{allTags.map(value => <button key={value} className={tag === value ? "active" : ""} onClick={() => setTag(value)}>{value}</button>)}</div>}
    <div className="secondary-list">
      <button className={`list-all ${!selected ? "active" : ""}`} onClick={() => onSelect(null)}><span className="all-icon">⋮</span><div><strong>全部日程</strong><small>查看所有安排</small></div></button>
      {rows.map(({ item, child, childCount, open }: any) => <div key={item.id} className={`secondary-item ${child ? "child-project" : ""} ${selected === item.id ? "active" : ""}`}>
        {type === "projects" && !child && childCount > 0 && <button className="tree-toggle" aria-label={open ? "收起子项目" : "展开子项目"} onClick={() => toggleExpanded(item.id)}>{open ? "⌄" : "›"}</button>}
        <button className="secondary-main" onClick={() => onSelect(item.id)}>
          {type === "projects" ? <span className="project-dot" style={{ background: item.color }}></span> : <span className={`person-avatar ${item.tone}`}>{item.name.slice(-1)}</span>}
          <span className="secondary-copy"><strong>{item.name}</strong><small>{type === "projects" ? `${child ? "子项目 · " : ""}${item.status} · ${item.date}` : `${item.company || "无公司"} · ${item.role || "无职位"}`}</small></span>
          <HoverDetails title={item.name} rows={type === "projects" ? [["合作方", item.client], ["状态", item.status], ["日期", item.date], ["地区", item.region], ["备注", item.notes]] : [["公司", item.company], ["职位", item.role], ["电话", item.phone], ["邮箱", item.email], ["地区", item.region], ["备注", item.notes]]} />
        </button>
        <span className="row-actions">{type === "projects" && !child && <button aria-label={`为${item.name}新建子项目`} onClick={() => onCreateChild(item)}>+</button>}<button aria-label={`编辑${item.name}`} onClick={() => onEdit(item)}>✎</button><button aria-label={`删除${item.name}`} className="danger" onClick={() => onDelete(item)}>×</button></span>
      </div>)}
      {rows.length === 0 && <div className="empty-secondary">没有匹配结果</div>}
    </div>
  </aside>;
}

const globalThisProjects = projects;
const globalThisPeople = people;
const globalThisEvents = events;

function Dashboard({ onNavigate, onCalendar, projects, people, events, tasks }: { onNavigate: (s: Section) => void; onCalendar: () => void; projects: typeof globalThisProjects; people: typeof globalThisPeople; events: typeof globalThisEvents; tasks: TaskItem[] }) {
  const ongoing = projects.filter(p => p.status === "进行中").length;
  const proposal = projects.filter(p => p.status === "提案中").length;
  const done = projects.filter(p => p.status === "已完成").length;
  const regionRows = (items: Array<{region?: string | null}>) => {
    const counts = new Map<string, number>();
    items.forEach(item => item.region && counts.set(item.region, (counts.get(item.region) || 0) + 1));
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = rows[0]?.[1] || 1;
    return rows.map(([name, count]) => [name, count, Math.round(count / max * 100)] as (string | number)[]);
  };
  const projectRegions = regionRows(projects);
  const peopleRegions = regionRows(people);
  const upcoming = [...events].filter((event: any) => new Date(event.endsAt).getTime() >= Date.now()).sort((a: any, b: any) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).slice(0, 3);
  const rootCount = projects.filter((project: any) => !project.parentId).length;
  const childCount = projects.length - rootCount;
  const upcomingTasks = tasks.filter(task => task.status === "todo").sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"))).slice(0, 4);
  const now = new Date();
  const dateText = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(now);
  return <div className="dashboard">
    <div className="page-title"><div><p>{dateText}</p><h1>{now.getHours() < 12 ? "上午好" : now.getHours() < 18 ? "下午好" : "晚上好"}，汪诺 <span>✦</span></h1><p>这是你的工作全景，今天也一起有序推进。</p></div><button className="primary" onClick={() => onNavigate("projects")}>+　记录新项目</button></div>
    <div className="metrics-grid">
      <Metric icon="□" label="项目总数" value={String(projects.length)} note={`${rootCount} 个主项目 · ${childCount} 个子项目`} tone="coral" onClick={() => onNavigate("projects")} />
      <Metric icon="○" label="联系人总数" value={String(people.length)} note="服务器实时数据" tone="violet" onClick={() => onNavigate("people")} />
      <div className="metric-card status-card"><div className="metric-head"><span>项目状态</span><i>全部项目</i></div><div className="status-values"><div><strong>{ongoing}</strong><span><i className="dot ongoing"></i>进行中</span></div><div><strong>{proposal}</strong><span><i className="dot proposal"></i>提案中</span></div><div><strong>{done}</strong><span><i className="dot done"></i>已完成</span></div></div><div className="status-bar"><i></i><i></i><i></i></div></div>
    </div>
    <div className="dashboard-grid">
      <section className="panel cooperation"><PanelTitle title="合作最多的联系人" subtitle="按参与项目数量" action="查看全部" onAction={() => onNavigate("people")} />
        <div className="ranking-list">{people.slice(0, 4).map((p, i) => <div key={p.id}><span className={`rank r${i + 1}`}>{i + 1}</span><span className={`person-avatar ${p.tone}`}>{p.name.slice(-1)}</span><p><strong>{p.name}</strong><small>{p.company} · {p.role}</small></p><div className="rank-bar"><i style={{ width: `${100 - i * 16}%` }}></i></div><b>{p.count}<small>次</small></b></div>)}</div>
      </section>
      <section className="panel schedule"><PanelTitle title="近期日程" subtitle="即将开始" action="查看日历" onAction={onCalendar} />
        <div className="schedule-list">{upcoming.length ? upcoming.map((event: any) => { const start = new Date(event.startsAt); return <div key={event.id}><time><strong>{start.getDate()}</strong><span>{start.getMonth() + 1}月 周{["日","一","二","三","四","五","六"][start.getDay()]}</span></time><i className={`timeline ${event.color}`}></i><p><strong>{event.title}</strong><span>{event.time} · {event.place || "未填写地点"}</span></p><em>待开始</em></div>; }) : <div className="empty-schedule">暂无即将开始的日程</div>}</div>
      </section>
      <section className="panel task-panel"><PanelTitle title="待办与里程碑" subtitle="按截止日期排序" action="进入项目" onAction={() => onNavigate("projects")} /><div className="dashboard-tasks">{upcomingTasks.length ? upcomingTasks.map(task => <div key={task.id}><span>{task.isMilestone ? "◆" : "○"}</span><p><strong>{task.title}</strong><small>{projects.find((project: any) => project.id === task.projectId)?.name || "项目"}</small></p><time>{task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : "未定"}</time></div>) : <div className="empty-schedule">暂无待办</div>}</div></section>
      <RegionPanel title="项目地区分布" total={`${projects.length} 个项目`} data={projectRegions} tone="coral" onAction={() => onNavigate("projects")} />
      <RegionPanel title="联系人地区分布" total={`${people.length} 位联系人`} data={peopleRegions} tone="violet" onAction={() => onNavigate("people")} />
    </div>
  </div>;
}

function Metric({ icon, label, value, note, tone, onClick }: any) { return <button className={`metric-card simple ${tone}`} onClick={onClick}><span className="metric-icon">{icon}</span><p>{label}<strong>{value}</strong></p><span className="trend">↗</span><small>{note}</small></button>; }
function PanelTitle({ title, subtitle, action, onAction }: { title: string; subtitle: string; action: string; onAction?: () => void }) { return <div className="panel-title"><div><h3>{title}</h3><p>{subtitle}</p></div><button onClick={onAction}>{action} ›</button></div>; }
function RegionPanel({ title, total, data, tone, onAction }: { title: string; total: string; data: (string | number)[][]; tone: string; onAction: () => void }) { return <section className={`panel region ${tone}`}><PanelTitle title={title} subtitle={total} action="详情" onAction={onAction} /><div className="region-body"><div className="donut"><div><strong>{data.length}</strong><span>覆盖城市</span></div></div><div className="region-bars">{data.length ? data.map((r, i) => <div key={String(r[0])}><b>{i + 1}</b><span>{r[0]}</span><i><em style={{ width: `${r[2]}%` }}></em></i><strong>{r[1]}</strong></div>) : <div><span>暂无地区数据</span></div>}</div></div></section>; }

function addDate(date: Date, amount: number, unit: "day" | "week" | "month" | "year") {
  const next = new Date(date);
  if (unit === "day") next.setDate(next.getDate() + amount);
  if (unit === "week") next.setDate(next.getDate() + amount * 7);
  if (unit === "month") next.setMonth(next.getMonth() + amount);
  if (unit === "year") next.setFullYear(next.getFullYear() + amount);
  return next;
}
function dateKey(value: Date | string) { const date = value instanceof Date ? value : new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dateTimeKey(date: Date) { return `${dateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; }
function mondayOf(date: Date) { const value = new Date(date); const day = value.getDay() || 7; value.setDate(value.getDate() - day + 1); value.setHours(0, 0, 0, 0); return value; }

function ProjectOverview({ project, projects, people, tasks, activities, onEditProject, onCreateChild, onSaveTask, onDeleteTask }: any) {
  if (!project) return null;
  const children = projects.filter((item: any) => item.parentId === project.id);
  const contacts = people.filter((person: any) => project.contactIds?.includes(person.id));
  const done = tasks.filter((task: TaskItem) => task.status === "done").length;
  return <section className="project-overview"><div className="project-summary"><div className="project-summary-head"><div><span>{project.parentId ? `子项目 · ${project.parentName}` : "PROJECT OVERVIEW"}</span><h2>{project.name}</h2></div><div><button onClick={() => onEditProject(project)}>编辑</button>{!project.parentId && <button className="accent" onClick={() => onCreateChild(project)}>+ 子项目</button>}</div></div><div className="project-meta"><span><b>状态</b>{project.status}</span><span><b>合作方</b>{project.client || "未填写"}</span><span><b>日期</b>{project.date || "未设置"}</span><span><b>地区</b>{project.region || "未填写"}</span></div>{project.tags?.length > 0 && <div className="tag-row">{project.tags.map((tag: string) => <i key={tag}>#{tag}</i>)}</div>}<div className="project-people"><b>参与人员</b>{contacts.length ? contacts.map((person: any) => <span key={person.id}><i className={`person-avatar ${person.tone}`}>{person.name.slice(-1)}</i>{person.name}</span>) : <small>暂无关联人员</small>}</div>{children.length > 0 && <div className="child-progress"><div><b>子项目</b><span>{children.filter((item: any) => item.status === "已完成").length}/{children.length} 已完成</span></div>{children.map((child: any) => <span key={child.id}><i style={{ background: child.color }}></i>{child.name}<em>{child.status}</em></span>)}</div>}</div><TaskBoard project={project} people={people} tasks={tasks} done={done} onSave={onSaveTask} onDelete={onDeleteTask} /><ActivityMini activities={activities} /></section>;
}

function TaskBoard({ project, people, tasks, done, onSave, onDelete }: any) {
  const [editing, setEditing] = useState<TaskItem | null>(null); const [adding, setAdding] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const saved = await onSave({ projectId: project.id, title: form.get("title"), dueDate: form.get("dueDate"), assigneeId: form.get("assigneeId"), isMilestone: form.get("isMilestone") === "on", status: editing?.status || "todo" }, editing || undefined); if (saved === false) return; setEditing(null); setAdding(false); };
  const toggle = (task: TaskItem) => onSave({ ...task, status: task.status === "done" ? "todo" : "done" }, task);
  return <div className="task-board"><div className="overview-title"><div><span>进度</span><strong>待办与里程碑</strong></div><button onClick={() => { setEditing(null); setAdding(true); }}>+ 添加</button></div><div className="task-progress"><i style={{ width: `${tasks.length ? done / tasks.length * 100 : 0}%` }}></i></div><small>{tasks.length ? `${done}/${tasks.length} 已完成` : "暂无待办"}</small>{(adding || editing) && <form className="task-form" onSubmit={submit}><input name="title" required autoFocus defaultValue={editing?.title || ""} placeholder="待办或里程碑内容" /><div><input name="dueDate" type="date" defaultValue={editing?.dueDate || ""} /><select name="assigneeId" defaultValue={editing?.assigneeId || ""}><option value="">未指定负责人</option>{people.map((person: any) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div><label><input name="isMilestone" type="checkbox" defaultChecked={editing?.isMilestone} /> 设为里程碑</label><div><button type="button" onClick={() => { setAdding(false); setEditing(null); }}>取消</button><button className="primary" type="submit">保存</button></div></form>}<div className="task-list">{tasks.map((task: TaskItem) => <article className={task.status === "done" ? "done" : ""} key={task.id}><button className="task-check" onClick={() => toggle(task)}>{task.status === "done" ? "✓" : ""}</button><span>{task.isMilestone ? "◆" : "○"}</span><div><strong>{task.title}</strong><small>{task.dueDate || "未设截止日期"}{task.assigneeName ? ` · ${task.assigneeName}` : ""}</small></div><button onClick={() => { setEditing(task); setAdding(false); }}>✎</button><button className="danger" onClick={() => onDelete(task)}>×</button></article>)}</div></div>;
}

function ActivityMini({ activities }: { activities: ActivityItem[] }) { return <div className="activity-mini"><div className="overview-title"><div><span>HISTORY</span><strong>最近动态</strong></div></div>{activities.slice(0, 6).map(activity => <div key={activity.id}><i></i><p><strong>{activity.action}</strong><span>{activity.details || activity.entityName}</span></p><time>{new Date(`${activity.createdAt}Z`).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</time></div>)}{activities.length === 0 && <small>暂无操作记录</small>}</div>; }

function ContactOverview({ person, projects }: any) { if (!person) return null; const related = projects.filter((project: any) => person.projectIds?.includes(project.id)); return <section className="contact-overview"><span className={`person-avatar ${person.tone}`}>{person.name.slice(-1)}</span><div><p>CONTACT OVERVIEW</p><h2>{person.name}</h2><small>{person.company || "无公司"} · {person.role || "无职位"}</small><div className="tag-row">{person.tags?.map((tag: string) => <i key={tag}>#{tag}</i>)}</div></div><div className="related-projects"><b>参与项目</b>{related.length ? related.map((project: any) => <span key={project.id}>{project.name}<em>{project.status}</em></span>) : <small>暂无关联项目</small>}</div></section>; }

function CalendarPage({ title, subtitle, mode, onMode, events: filtered, onCreate, onEdit, onMove, date, onDate }: { title: string; subtitle: string; mode: CalendarMode; onMode: (m: CalendarMode) => void; events: typeof events; onCreate: () => void; onEdit: (item: any) => void; onMove: (item: any, day: Date) => void; date: Date; onDate: (d: Date) => void }) {
  const unit = mode === "日" ? "day" : mode === "周" ? "week" : mode === "月" ? "month" : "year";
  const heading = mode === "年" ? `${date.getFullYear()} 年` : `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
  return <div className="calendar-page">
    <div className="calendar-heading"><div><p>{subtitle}</p><h1>{title}</h1><span>{filtered.length} 项安排</span></div><button className="primary" onClick={onCreate}>+　新建日程</button></div>
    <section className="calendar-card">
      <div className="calendar-tools"><div className="date-nav"><button aria-label="上一段时间" onClick={() => onDate(addDate(date, -1, unit))}>‹</button><button aria-label="下一段时间" onClick={() => onDate(addDate(date, 1, unit))}>›</button><h2>{heading}</h2><button className="today" onClick={() => onDate(new Date())}>今天</button></div><div className="view-switch">{(["日", "周", "月", "年"] as CalendarMode[]).map(m => <button key={m} className={mode === m ? "active" : ""} onClick={() => onMode(m)}>{m}</button>)}</div></div>
      {mode === "周" && <WeekView events={filtered} date={date} onEdit={onEdit} onMove={onMove} />}
      {mode === "日" && <DayView events={filtered} date={date} onEdit={onEdit} />}
      {mode === "月" && <MonthView events={filtered} date={date} onEdit={onEdit} onMove={onMove} />}
      {mode === "年" && <YearView events={filtered} date={date} />}
    </section>
  </div>;
}

const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
function EventHover({ event }: { event: any }) { return <HoverDetails title={event.title} rows={[["时间", `${new Date(event.startsAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} — ${new Date(event.endsAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`], ["地点", event.place || "未填写"], ["备注", event.description], ["附件", event.attachments?.length ? `${event.attachments.length} 个` : "无"]]} />; }
function WeekView({ events: visible, date, onEdit, onMove }: { events: typeof events; date: Date; onEdit: (item: any) => void; onMove: (item: any, day: Date) => void }) { const monday = mondayOf(date); const days = Array.from({ length: 7 }, (_, i) => addDate(monday, i, "day")); const today = dateKey(new Date()); const drop = (event: React.DragEvent, day: Date) => { event.preventDefault(); const item = visible.find((entry: any) => String(entry.id) === event.dataTransfer.getData("text/s-pm-event")); if (item) onMove(item, day); }; return <div className="week-view"><div className="week-head"><span></span>{days.map((day, i) => <div className={dateKey(day) === today ? "today-col" : ""} key={dateKey(day)}><span>周{["一","二","三","四","五","六","日"][i]}</span><strong>{day.getDate()}</strong></div>)}</div><div className="week-body"><div className="time-col">{times.map(t => <span key={t}>{t}</span>)}</div>{days.map(day => <div className={`day-col ${dateKey(day) === today ? "today-col" : ""}`} key={dateKey(day)} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, day)}>{times.map(t => <i key={t}></i>)}{visible.filter((e: any) => dateKey(e.startsAt) === dateKey(day)).map((e: any) => <button draggable onDragStart={event => event.dataTransfer.setData("text/s-pm-event", String(e.id))} key={e.id} className={`calendar-event ${e.color}`} onClick={() => onEdit(e)} style={{ top: `${((parseInt(e.time) - 9) * 60 + parseInt(e.time.slice(3))) * 1.15 + 6}px`, height: `${e.duration * 60 * 1.15 - 4}px` }}><strong>{e.title}</strong><span>{e.time}</span><small>{e.place}</small>{e.attachments?.length ? <small>▧ {e.attachments.length} 个附件</small> : null}<EventHover event={e} /></button>)}</div>)}</div></div>; }
function DayView({ events: visible, date, onEdit }: { events: typeof events; date: Date; onEdit: (item: any) => void }) { const dayEvents = visible.filter((e: any) => dateKey(e.startsAt) === dateKey(date)); return <div className="day-view"><div className="day-heading"><div><span>星期{["日","一","二","三","四","五","六"][date.getDay()]}</span><strong>{date.getDate()}</strong></div><p><strong>当日安排</strong><span>{dayEvents.length} 项日程</span></p></div><div className="day-schedule">{times.map(t => <div key={t}><span>{t}</span><i></i>{dayEvents.filter((e: any) => e.time.startsWith(t.slice(0, 2))).map((e: any) => <button key={e.id} className={`calendar-event ${e.color}`} onClick={() => onEdit(e)}><strong>{e.title}</strong><span>{e.time} · {e.place || "未填写地点"}</span>{e.attachments?.length ? <small>▧ {e.attachments.length} 个附件</small> : null}<EventHover event={e} /></button>)}</div>)}</div></div>; }
function MonthView({ events: visible, date, onEdit, onMove }: { events: typeof events; date: Date; onEdit: (item: any) => void; onMove: (item: any, day: Date) => void }) { const first = new Date(date.getFullYear(), date.getMonth(), 1); const start = mondayOf(first); const cells = Array.from({ length: 42 }, (_, i) => addDate(start, i, "day")); const today = dateKey(new Date()); const drop = (event: React.DragEvent, day: Date) => { event.preventDefault(); const item = visible.find((entry: any) => String(entry.id) === event.dataTransfer.getData("text/s-pm-event")); if (item) onMove(item, day); }; return <div className="month-view"><div className="month-weekdays">{["一", "二", "三", "四", "五", "六", "日"].map(d => <span key={d}>周{d}</span>)}</div><div className="month-grid">{cells.map(day => <div key={dateKey(day)} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, day)} className={`${dateKey(day) === today ? "today-cell" : ""} ${day.getMonth() !== date.getMonth() ? "muted" : ""}`}><strong>{day.getDate()}</strong>{visible.filter((e: any) => dateKey(e.startsAt) === dateKey(day)).map((e: any) => <button draggable onDragStart={event => event.dataTransfer.setData("text/s-pm-event", String(e.id))} className={`month-event ${e.color}`} key={e.id} onClick={() => onEdit(e)}>{e.title}<EventHover event={e} /></button>)}</div>)}</div></div>; }
function YearView({ events: visible, date }: { events: typeof events; date: Date }) { const today = new Date(); return <div className="year-view">{Array.from({ length: 12 }, (_, month) => { const first = new Date(date.getFullYear(), month, 1); const start = mondayOf(first); const cells = Array.from({ length: 42 }, (_, i) => addDate(start, i, "day")); return <div className={today.getFullYear() === date.getFullYear() && today.getMonth() === month ? "current-month" : ""} key={month}><h3>{month + 1} 月</h3><div className="mini-week">{["一", "二", "三", "四", "五", "六", "日"].map(d => <span key={d}>{d}</span>)}</div><div className="mini-days">{cells.map(day => <i key={dateKey(day)} className={day.getMonth() === month && visible.some((e: any) => dateKey(e.startsAt) === dateKey(day)) ? "has-event" : dateKey(day) === dateKey(today) ? "today" : ""}>{day.getMonth() === month ? day.getDate() : ""}</i>)}</div></div>; })}</div>; }

function Settings({ tab, onTab, profile, preferences, storage, trash, activities, counts, onRestore, onSaved }: { tab: SettingsTab; onTab: (tab: SettingsTab) => void; profile: Profile; preferences: Preferences; storage: StorageInfo; trash: TrashItem[]; activities: ActivityItem[]; counts: { projects: number; people: number; events: number }; onRestore: (item: TrashItem) => Promise<void>; onSaved: (message: string) => Promise<void> }) {
  const [prefs, setPrefs] = useState(preferences);
  useEffect(() => setPrefs(preferences), [preferences]);
  const submitJson = async (url: string, body: unknown) => {
    const response = await fetch(url, { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "保存失败");
  };
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); try { await submitJson("/api/profile", data); await onSaved("个人信息已保存"); } catch (error) { await onSaved(error instanceof Error ? error.message : "保存失败"); } };
  const savePassword = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); if (data.newPassword !== data.confirmPassword) return onSaved("两次输入的新密码不一致"); try { await submitJson("/api/password", data); event.currentTarget.reset(); await onSaved("密码已更新"); } catch (error) { await onSaved(error instanceof Error ? error.message : "更新失败"); } };
  const savePreferences = async () => { try { await submitJson("/api/preferences", prefs); await onSaved("通知设置已保存"); } catch (error) { await onSaved(error instanceof Error ? error.message : "保存失败"); } };
  const exportData = async () => { const response = await fetch("/api/export", { credentials: "include" }); if (!response.ok) return onSaved("导出失败"); const blob = await response.blob(); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `s-pm-export-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); await onSaved("数据导出已开始"); };
  const nav: Array<[SettingsTab, string]> = [["profile", "个人信息"], ["security", "账号与安全"], ["notifications", "通知设置"], ["storage", "数据与存储"], ["history", "操作记录"], ["trash", "回收站"]];
  return <div className="settings-page"><div className="calendar-heading"><div><p>工作台设置</p><h1>设置</h1><span>管理个人信息、账号与数据</span></div></div><div className="settings-layout"><aside>{nav.map(([id, label]) => <button key={id} className={`${tab === id ? "active" : ""} ${id === "trash" ? "trash-nav" : ""}`} onClick={() => onTab(id)}>{label}{id === "trash" && trash.length > 0 ? <small>{trash.length}</small> : null}</button>)}</aside>
    {tab === "profile" && <form className="settings-card" onSubmit={saveProfile}><div className="settings-avatar">{profile.displayName.slice(-2).toUpperCase()}</div><div><h3>个人信息</h3><p>这些信息会显示在你的个人工作台中。</p></div><label>姓名<input name="displayName" defaultValue={profile.displayName} required /></label><label>登录账号<input name="username" defaultValue={profile.username} required /></label><label>邮箱<input name="email" type="email" defaultValue={profile.email || ""} placeholder="可选" /></label><button className="primary" type="submit">保存修改</button></form>}
    {tab === "security" && <form className="settings-card settings-form" onSubmit={savePassword}><div className="settings-icon">⌁</div><div><h3>账号与安全</h3><p>修改登录密码。新密码至少需要 8 位。</p></div><label>当前密码<input name="currentPassword" type="password" required autoComplete="current-password" /></label><label>新密码<input name="newPassword" type="password" minLength={8} required autoComplete="new-password" /></label><label>确认新密码<input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" /></label><button className="primary" type="submit">更新密码</button></form>}
    {tab === "notifications" && <section className="settings-card settings-form"><div className="settings-icon">◌</div><div><h3>通知设置</h3><p>选择希望在工作台中看到的提醒。</p></div><Toggle label="日程开始提醒" note="日程临近时在工作台显示提醒" checked={prefs.scheduleReminders} onChange={value => setPrefs({ ...prefs, scheduleReminders: value })} /><Toggle label="项目状态变化" note="项目状态更新时显示通知" checked={prefs.projectUpdates} onChange={value => setPrefs({ ...prefs, projectUpdates: value })} /><Toggle label="每周工作摘要" note="每周汇总项目、人员和日程" checked={prefs.weeklyDigest} onChange={value => setPrefs({ ...prefs, weeklyDigest: value })} /><button className="primary" onClick={savePreferences}>保存设置</button></section>}
    {tab === "storage" && <section className="settings-card settings-form"><div className="settings-icon">▣</div><div><h3>数据与存储</h3><p>业务数据保存在独立 SQLite 数据库，附件保存在腾讯 COS。</p></div><div className="storage-status"><span className={storage.configured ? "online" : "offline"}></span><div><strong>{storage.provider} · {storage.configured ? "已连接" : "待配置"}</strong><small>{storage.configured ? `${storage.bucket} · ${storage.region}` : "完成专用密钥配置后即可上传附件"}</small></div></div><div className="storage-counts"><span><strong>{counts.projects}</strong>项目</span><span><strong>{counts.people}</strong>人员</span><span><strong>{counts.events}</strong>日程</span></div><button className="primary" onClick={exportData}>导出全部数据</button></section>}
    {tab === "history" && <section className="settings-card history-card"><div className="settings-icon">◴</div><div><h3>操作记录</h3><p>记录创建、更新、删除、恢复和日程改期。</p></div><div className="history-list">{activities.length ? activities.map(activity => <article key={activity.id}><i></i><div><strong>{activity.action} · {activity.entityName}</strong><small>{activity.details || "无补充信息"}</small></div><time>{new Date(`${activity.createdAt}Z`).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></article>) : <div className="trash-empty"><span>◴</span><strong>暂无操作记录</strong></div>}</div></section>}
    {tab === "trash" && <section className="settings-card trash-card"><div className="settings-icon">⌑</div><div><h3>回收站</h3><p>删除的项目、人员、日程和附件会保留在这里，需要时可随时恢复。</p></div><div className="trash-list">{trash.length ? trash.map(item => <article key={`${item.type}-${item.id}`}><span className={`trash-type ${item.type}`}>{item.label}</span><div><strong>{item.name}</strong><small>{item.summary || "无补充信息"} · {new Date(`${item.deletedAt}Z`).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small></div><button onClick={() => onRestore(item)}>恢复</button></article>) : <div className="trash-empty"><span>✓</span><strong>回收站是空的</strong><small>删除的内容会出现在这里</small></div>}</div></section>}
  </div></div>;
}

function Toggle({ label, note, checked, onChange }: { label: string; note: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="toggle-row"><span><strong>{label}</strong><small>{note}</small></span><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><i></i></label>; }

function Modal({ type, item, defaults, onClose, onSave, onDelete, onAttachmentDeleted, projects, people }: { type: "project" | "person" | "event"; item?: any; defaults?: any; onClose: () => void; onSave: (e: FormEvent<HTMLFormElement>, files?: File[]) => void; onDelete: () => void; onAttachmentDeleted: () => Promise<void>; projects: typeof globalThisProjects; people: typeof globalThisPeople }) {
  const fileRef = useRef<HTMLInputElement>(null); const [files, setFiles] = useState<File[]>([]); const [attachments, setAttachments] = useState<any[]>(item?.attachments || []);
  const label = type === "project" ? "项目" : type === "person" ? "人员" : "日程";
  const isChildProject = type === "project" && Boolean(defaults?.parentId || item?.parentId);
  const title = `${item ? "编辑" : "新建"}${isChildProject ? "子项目" : label}`;
  const removeAttachment = async (attachment: any) => { if (!window.confirm(`确定将附件“${attachment.name}”移入回收站吗？`)) return; const response = await fetch(`/api/attachments/${attachment.id}`, { method: "DELETE", credentials: "include" }); if (response.ok) { setAttachments(current => current.filter(entry => entry.id !== attachment.id)); await onAttachmentDeleted(); } else window.alert((await response.json().catch(() => ({}))).error || "附件删除失败"); };
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="modal" onSubmit={e => onSave(e, files)}><div className="modal-head"><div><span>{type === "event" ? "CALENDAR" : "NEW RECORD"}</span><h2>{title}</h2></div><button type="button" onClick={onClose}>×</button></div>
    {type === "project" && <>{defaults?.parentId && <div className="parent-project-note"><span>↳</span><div><b>所属主项目</b><strong>{defaults.parentName}</strong></div><input type="hidden" name="parentId" value={defaults.parentId} /></div>}<label>项目名称<input name="name" required defaultValue={item?.name || ""} placeholder="例如：秋季新品发布" /></label><div className="form-row"><label>客户 / 合作方<input name="client" defaultValue={item?.client || defaults?.client || ""} placeholder="输入合作方" /></label><label>项目状态<select name="status" defaultValue={item?.status || "提案中"}><option>提案中</option><option>进行中</option><option>已完成</option><option>已搁置</option></select></label></div><div className="form-row"><label>开始日期<input name="startDate" type="date" defaultValue={item?.startDate || ""} /></label><label>结束日期<input name="endDate" type="date" defaultValue={item?.endDate || ""} /></label></div><label>所在地区<input name="region" defaultValue={item?.region || defaults?.region || ""} placeholder="上海" /></label><label>标签<input name="tags" defaultValue={(item?.tags || defaults?.tags || []).join("，")} placeholder="重点客户，文旅，长期合作" /></label><fieldset className="contact-picker"><legend>参与人员</legend>{people.length ? people.map((person: any) => <label key={person.id}><input name="contactIds" type="checkbox" value={person.id} defaultChecked={(item?.contactIds || defaults?.contactIds || []).includes(person.id)} /><span className={`person-avatar ${person.tone}`}>{person.name.slice(-1)}</span>{person.name}</label>) : <small>请先创建联系人</small>}</fieldset><label>项目备注<textarea name="notes" defaultValue={item?.notes || ""} placeholder="记录项目目标和重要信息…"></textarea></label></>}
    {type === "person" && <><div className="form-row"><label>姓名<input name="name" required defaultValue={item?.name || ""} placeholder="联系人姓名" /></label><label>职位<input name="role" defaultValue={item?.role || ""} placeholder="品牌总监" /></label></div><label>公司 / 机构<input name="company" defaultValue={item?.company || ""} placeholder="所在公司" /></label><div className="form-row"><label>手机号<input name="phone" defaultValue={item?.phone || ""} placeholder="138 0000 0000" /></label><label>邮箱<input name="email" type="email" defaultValue={item?.email || ""} placeholder="name@example.com" /></label></div><label>所在地<input name="region" defaultValue={item?.region || ""} placeholder="杭州" /></label><label>标签<input name="tags" defaultValue={(item?.tags || []).join("，")} placeholder="重点客户，长期合作" /></label><label>备注<textarea name="notes" defaultValue={item?.notes || ""} placeholder="记录彼此的合作偏好…"></textarea></label></>}
    {type === "event" && <><label>日程标题<input name="title" required defaultValue={item?.title || ""} placeholder="例如：项目启动会" /></label><div className="form-row"><label>开始时间<input name="startsAt" type="datetime-local" required defaultValue={item?.startsAt?.slice(0, 16) || ""} /></label><label>结束时间<input name="endsAt" type="datetime-local" required defaultValue={item?.endsAt?.slice(0, 16) || ""} /></label></div><div className="form-row"><label>关联项目<select name="projectId" defaultValue={item?.project || defaults?.projectId || ""}><option value="">请选择</option>{projects.map(p => <option value={p.id} key={p.id}>{p.parentId ? `　↳ ${p.name}` : p.name}</option>)}</select></label><label>关联人员<select name="contactId" defaultValue={item?.person || defaults?.contactId || ""}><option value="">请选择</option>{people.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label></div><label>地点<input name="location" defaultValue={item?.place || ""} placeholder="会议室或线上链接" /></label><label>备注<textarea name="description" defaultValue={item?.description || ""} placeholder="补充日程说明…"></textarea></label>{attachments.length > 0 && <div className="existing-files"><strong>已有附件</strong>{attachments.map((attachment: any) => <span key={attachment.id}><a href={`/api/attachments/${attachment.id}/download`}>▧ {attachment.name}</a><button type="button" onClick={() => removeAttachment(attachment)}>删除</button></span>)}</div>}<div className="upload-area" onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={e => setFiles(Array.from(e.target.files || []))} /><span>↑</span><div><strong>{item ? "继续添加文件或图片" : "上传文件或图片"}</strong><small>单个文件不超过 25MB，保存日程时上传至腾讯 COS</small></div></div>{files.length > 0 && <div className="file-list">{files.map(f => <span key={`${f.name}-${f.size}`}>▧ {f.name} · {(f.size / 1024 / 1024).toFixed(1)}MB</span>)}</div>}</>}
    <div className="modal-actions">{item && <button className="delete-record" type="button" onClick={onDelete}>移入回收站</button>}<span></span><button type="button" onClick={onClose}>取消</button><button className="primary" type="submit">{item ? "保存修改" : `创建${isChildProject ? "子项目" : label}`}</button></div></form></div>;
}

function SearchOverlay({ query, setQuery, results, onClose, onChoose, onWeek, onOngoing }: any) { return <div className="search-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="search-box"><div className="search-input"><span>⌕</span><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索项目、联系人、日程或待办…" /><kbd onClick={onClose}>ESC</kbd></div>{query ? <div className="search-results"><p>搜索结果 · {results.length}</p>{results.length ? results.map((r: any) => <button key={`${r.type}${r.id}`} onClick={() => onChoose(r)}><span>{r.type === "项目" ? "□" : r.type === "联系人" ? "○" : r.type === "待办" ? "◇" : "⌘"}</span><div><strong>{r.name}</strong><small>{r.type === "项目" ? `${r.client || "无合作方"} · ${r.region || "无地区"}` : r.type === "联系人" ? `${r.company || "无公司"} · ${r.role || "无职位"}` : r.type === "待办" ? `${r.isMilestone ? "里程碑" : "待办"} · ${r.dueDate || "未设截止日期"}` : `${r.time} · ${r.place || "未填写地点"}`}</small></div><em>{r.type}</em></button>) : <div className="empty-search">没有找到匹配内容</div>}</div> : <div className="search-suggestions"><p>快速访问</p><button onClick={onWeek}><span>⌘</span>查看本周日程</button><button onClick={onOngoing}><span>□</span>查看进行中项目</button></div>}<div className="search-foot">输入关键词后选择结果　·　ESC 关闭</div></div></div>; }
