/* CORE Lab Progress — full interactive workspace, same-origin asset.
 * member.js authenticates (Firebase) + calls the 1b bridge, then:
 *   window.CoreLabProgress.mount(container, { supabaseUrl, anonKey, token, role, profileId });
 * All reads/writes carry the bridge token, so Supabase RLS scopes every row.
 * Completion is product-driven (done required-outputs / total, weighted).
 */
(function () {
  const RING = 2 * Math.PI * 52;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function api(cfg) {
    const base = cfg.supabaseUrl + "/rest/v1/";
    const headers = () => ({
      apikey: cfg.anonKey,
      Authorization: "Bearer " + cfg.token,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    });
    return {
      async get(path) { const r = await fetch(base + path, { headers: headers() }); if (!r.ok) throw new Error("read " + r.status + " " + (await r.text())); return r.json(); },
      async post(path, body) { const r = await fetch(base + path, { method: "POST", headers: headers(), body: JSON.stringify(body) }); if (!r.ok) throw new Error("write " + r.status + " " + (await r.text())); return r.json(); },
      async patch(path, body) { const r = await fetch(base + path, { method: "PATCH", headers: headers(), body: JSON.stringify(body) }); if (!r.ok) throw new Error("update " + r.status); return r.json(); },
      async del(path) { const r = await fetch(base + path, { method: "DELETE", headers: headers() }); if (!r.ok) throw new Error("delete " + r.status); },
    };
  }

  const daysBetween = (a, b) => Math.round((b - a) / 86400000);
  const msPct = (m) => { const o = m.required_outputs || []; return o.length ? Math.round(o.filter((x) => x.is_done).length / o.length * 100) : 0; };
  const msStatus = (p) => (p >= 100 ? "done" : p > 0 ? "doing" : "todo");
  const overall = (ms) => { const w = ms.reduce((a, m) => a + (m.weight || 0), 0); return w ? Math.round(ms.reduce((a, m) => a + (m.weight || 0) * msPct(m) / 100, 0) / w * 100) : 0; };

  function ring(pct) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("width", "132"); s.setAttribute("height", "132"); s.setAttribute("viewBox", "0 0 132 132");
    s.innerHTML =
      '<circle cx="66" cy="66" r="52" fill="none" stroke="var(--clgr)" stroke-width="13"/>' +
      '<circle cx="66" cy="66" r="52" fill="none" stroke="var(--clt)" stroke-width="13" stroke-linecap="round" transform="rotate(-90 66 66)" stroke-dasharray="' + RING.toFixed(1) + '" stroke-dashoffset="' + (RING * (1 - pct / 100)).toFixed(1) + '"/>' +
      '<text x="66" y="64" text-anchor="middle" font-size="30" font-weight="700" fill="var(--cli)" font-family="var(--clm)">' + pct + '%</text>' +
      '<text x="66" y="84" text-anchor="middle" font-size="10.5" fill="var(--cls)" font-family="var(--clm)">產出驅動</text>';
    return s;
  }
  function smallRing(pct, st) {
    const col = st === "done" ? "var(--clgn)" : st === "doing" ? "var(--clt)" : "var(--clf)";
    const c = 2 * Math.PI * 15;
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("width", "40"); s.setAttribute("height", "40"); s.setAttribute("viewBox", "0 0 40 40");
    s.innerHTML =
      '<circle cx="20" cy="20" r="15" fill="none" stroke="var(--clgr)" stroke-width="4"/>' +
      '<circle cx="20" cy="20" r="15" fill="none" stroke="' + col + '" stroke-width="4" stroke-linecap="round" transform="rotate(-90 20 20)" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - pct / 100)).toFixed(1) + '"/>' +
      '<text x="20" y="24" text-anchor="middle" font-size="10.5" font-weight="700" font-family="var(--clm)" fill="var(--cli)">' + (st === "todo" ? "–" : pct) + '</text>';
    return s;
  }
  const KL = { data: "數據", slide: "投影片", doc: "文件" };

  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addMonths = (n) => { const d = new Date(); d.setMonth(d.getMonth() + n); return ymd(d); };

  // Onboarding templates: pick one and it builds the whole milestone/output tree.
  const TEMPLATES = {
    ms_standard: {
      label: "碩士研究（標準・4 階段）",
      milestones: [
        { name: "文獻回顧與題目定義", weight: 20, outputs: [{ label: "文獻整理表", kind: "doc" }, { label: "題目提案", kind: "doc" }] },
        { name: "實驗設計與前期準備", weight: 20, outputs: [{ label: "實驗規劃書", kind: "doc" }, { label: "材料 / 藥品清單", kind: "doc" }] },
        { name: "數據蒐集與分析", weight: 40, outputs: [{ label: "原始數據", kind: "data" }, { label: "數據分析報告", kind: "doc" }, { label: "期中報告", kind: "slide" }] },
        { name: "論文撰寫與口試", weight: 20, outputs: [{ label: "論文初稿", kind: "doc" }, { label: "口試投影片", kind: "slide" }] },
      ],
    },
    ms_electrocat: {
      label: "電催化專題（合成→鑑定→性能）",
      milestones: [
        { name: "文獻回顧與題目定義", weight: 20, outputs: [{ label: "文獻整理表", kind: "doc" }, { label: "題目提案", kind: "doc" }] },
        { name: "催化劑合成與鑑定", weight: 40, outputs: [{ label: "合成 SOP", kind: "doc" }, { label: "XRD 數據", kind: "data" }, { label: "SEM 影像", kind: "slide" }] },
        { name: "電化學性能與機制", weight: 40, outputs: [{ label: "LSV 數據", kind: "data" }, { label: "CA 數據", kind: "data" }, { label: "組會報告", kind: "slide" }] },
      ],
    },
    blank: { label: "空白（只建立專案，里程碑自訂）", milestones: [] },
  };

  async function mount(container, cfg) {
    const ax = api(cfg);
    const isPI = cfg.role === "admin" || cfg.role === "pi";
    container.id = "cl-progress";
    container.innerHTML = "";
    let progs = [], myTodos = [], students = [], cur = 0;

    async function load() {
      progs = await ax.get(
        "progress?select=id,project,start_date,due_date,student_id,profiles(name)," +
        "milestones(id,name,weight,position,due_date,required_outputs(id,label,kind,is_done,position),comments(id,body,author_role,created_at))" +
        "&order=due_date.asc"
      );
      // tasks has no FK to progress (only student_id / milestone_id), so fetch
      // separately and attach by student_id (RLS already scopes rows to the user).
      const allTasks = await ax.get("tasks?select=id,student_id,title,milestone_id,due_date,priority,status,remind_lead_days&order=due_date.asc");
      progs.forEach((p) => {
        p._name = (p.profiles && p.profiles.name) || "成員";
        p.tasks = allTasks.filter((t) => t.student_id === p.student_id);
        (p.milestones || []).sort((a, b) => (a.position || 0) - (b.position || 0));
        (p.milestones || []).forEach((m) => (m.required_outputs || []).sort((a, b) => (a.position || 0) - (b.position || 0)));
      });
      myTodos = await ax.get("todos?select=id,title,done,due_date&order=created_at.asc");
      if (isPI) students = await ax.get("profiles?select=id,name,email,role,active&order=name.asc");
    }

    // Create a full progress record (progress -> milestones -> required_outputs)
    // from a template, so a PI never hand-writes SQL. RLS allows is_pi() writes.
    async function applyTemplate(studentId, project, start, due, tpl) {
      const prog = (await ax.post("progress", { student_id: studentId, project: project, start_date: start, due_date: due }))[0];
      const mss = tpl.milestones || [];
      const span = Math.max(1, daysBetween(new Date(start), new Date(due)));
      for (let i = 0; i < mss.length; i++) {
        const m = mss[i];
        const mdue = ymd(new Date(new Date(start).getTime() + span * ((i + 1) / mss.length) * 86400000));
        const mrow = (await ax.post("milestones", { progress_id: prog.id, name: m.name, weight: m.weight, position: i + 1, due_date: mdue }))[0];
        const outs = (m.outputs || []).map((o, j) => ({ milestone_id: mrow.id, label: o.label, kind: o.kind || "doc", position: j + 1 }));
        if (outs.length) await ax.post("required_outputs", outs);
      }
      return { studentId: studentId, project: project };
    }

    function renderTemplateCard() {
      const c = el("div", "cl-card cl-tpl");
      c.appendChild(el("div", "cl-h", "建立學生進度 · 套用範本"));
      c.appendChild(el("div", "cl-sub", "選學生 → 選範本 → 一鍵建立整套里程碑與必要產出，不需寫 SQL。"));
      const grid = el("div", "cl-tplgrid");

      function field(labelText, node) {
        const w = el("label", "cl-fld");
        w.appendChild(el("span", "cl-lab", labelText));
        w.appendChild(node);
        return w;
      }
      const stuSel = el("select");
      const o0 = el("option", null, "選擇學生…"); o0.value = ""; stuSel.appendChild(o0);
      students.filter((s) => s.active !== false).forEach((s) => {
        const o = el("option", null, s.name + (s.role && s.role !== "student" ? " (" + s.role + ")" : "")); o.value = s.id; stuSel.appendChild(o);
      });
      const tplSel = el("select");
      Object.keys(TEMPLATES).forEach((k) => { const o = el("option", null, TEMPLATES[k].label); o.value = k; tplSel.appendChild(o); });
      const proj = el("input"); proj.type = "text"; proj.placeholder = "專案 / 題目名稱…";
      const sd = el("input"); sd.type = "date"; sd.value = ymd(new Date());
      const dd = el("input"); dd.type = "date"; dd.value = addMonths(9);

      grid.appendChild(field("學生", stuSel));
      grid.appendChild(field("範本", tplSel));
      grid.appendChild(field("專案名稱", proj));
      grid.appendChild(field("開始日", sd));
      grid.appendChild(field("到期日", dd));
      c.appendChild(grid);

      const bar = el("div", "cl-tplbar");
      const btn = el("button", "cl-btn dark", "建立進度 →");
      const msg = el("div", "cl-tplmsg");
      btn.addEventListener("click", async () => {
        if (!stuSel.value) { msg.className = "cl-tplmsg err"; msg.textContent = "請先選擇學生。"; return; }
        if (!proj.value.trim()) { msg.className = "cl-tplmsg err"; msg.textContent = "請輸入專案名稱。"; return; }
        if (!sd.value || !dd.value) { msg.className = "cl-tplmsg err"; msg.textContent = "請填開始與到期日。"; return; }
        btn.disabled = true; msg.className = "cl-tplmsg"; msg.textContent = "建立中…";
        try {
          const res = await applyTemplate(stuSel.value, proj.value.trim(), sd.value, dd.value, TEMPLATES[tplSel.value]);
          await load();
          const idx = progs.findIndex((p) => p.student_id === res.studentId && p.project === res.project);
          cur = idx >= 0 ? idx : 0;
          render();
          const m2 = document.querySelector(".cl-tplmsg");
          if (m2) { m2.className = "cl-tplmsg ok"; m2.textContent = "已建立 ✓ 已切換到新進度"; }
        } catch (e) { btn.disabled = false; msg.className = "cl-tplmsg err"; msg.textContent = "建立失敗：" + e.message; }
      });
      bar.appendChild(btn); bar.appendChild(msg); c.appendChild(bar);
      return c;
    }

    function dueChip(due, lead, st) {
      if (st === "done" || !due) return { c: "", cls: "" };
      const n = daysBetween(new Date(), new Date(due));
      if (n < 0) return { c: "已逾期 " + (-n) + " 天", cls: "over" };
      if (n <= (lead || 3)) return { c: (n === 0 ? "今天" : n + " 天後") + "到期", cls: "soon" };
      return { c: "到期前 " + (lead || 3) + " 天提醒", cls: "" };
    }

    function render() {
      container.innerHTML = "";
      if (isPI) container.appendChild(renderTemplateCard());
      if (!progs.length) { container.appendChild(el("div", "cl-empty", isPI ? "目前沒有進度資料。用上面的範本建立第一筆。" : "目前沒有進度資料。")); return; }

      if (progs.length > 1) {
        const top = el("div", "cl-top");
        const sel = el("select");
        progs.forEach((p, i) => { const o = el("option", null, p._name + " — " + (p.project || "")); o.value = String(i); sel.appendChild(o); });
        sel.value = String(cur);
        sel.addEventListener("change", () => { cur = +sel.value; render(); });
        const wrap = el("div"); wrap.appendChild(el("span", "cl-lab", "選擇成員 / 專案")); wrap.appendChild(sel);
        top.appendChild(wrap); container.appendChild(top);
      }
      const P = progs[cur], ms = P.milestones || [], tasks = P.tasks || [];
      const pct = overall(ms);
      const start = new Date(P.start_date), due = new Date(P.due_date), today = new Date();
      const totalD = Math.max(1, daysBetween(start, due));
      const used = Math.min(100, Math.max(0, Math.round(daysBetween(start, today) / totalD * 100)));
      const left = daysBetween(today, due);

      // hero
      const hero = el("div", "cl-card"), hbox = el("div", "cl-hero"), rb = el("div", "cl-ringbox");
      rb.appendChild(ring(pct));
      const figs = el("div");
      const f1 = el("div"); f1.appendChild(el("div", "cl-lab", "已用時間")); f1.appendChild(el("div", "cl-big", used + "%"));
      const f2 = el("div"); f2.style.marginTop = "10px"; f2.appendChild(el("div", "cl-lab", "距到期")); f2.appendChild(el("div", "cl-big", left >= 0 ? left + " 天" : "已逾期 " + (-left) + " 天"));
      figs.appendChild(f1); figs.appendChild(f2); rb.appendChild(figs);
      const right = el("div");
      const nmrow = el("div", "cl-nmrow");
      const nm = el("div"); nm.style.fontSize = "18px"; nm.style.fontWeight = "800"; nm.textContent = P._name; nmrow.appendChild(nm);
      if (isPI) {
        const del = el("button", "cl-btn ghost danger", "刪除此進度");
        del.addEventListener("click", async () => {
          if (!confirm("確定刪除「" + P._name + " — " + (P.project || "") + "」?\n會一併移除底下所有里程碑、必要產出與留言,無法復原。")) return;
          del.disabled = true; del.textContent = "刪除中…";
          try { await ax.del("progress?id=eq." + P.id); await load(); cur = 0; render(); }
          catch (e) { del.disabled = false; del.textContent = "刪除此進度"; alert("刪除失敗:" + e.message); }
        });
        nmrow.appendChild(del);
      }
      right.appendChild(nmrow);
      right.appendChild(el("div", "cl-sub", P.project || ""));
      const th = el("div", "cl-h", "進度 vs 時間軸"); th.style.marginTop = "14px"; right.appendChild(th);
      const track = el("div", "cl-track");
      const fill = el("div", "cl-fill"); fill.style.width = used + "%"; track.appendChild(fill);
      [["half", 50, "50%"], ["today", used, "今天"], ["due", 100, "到期"]].forEach(function (t) {
        const mk = el("div", "cl-mk " + t[0]); mk.style.left = t[1] + "%"; mk.appendChild(el("span", null, t[2])); track.appendChild(mk);
      });
      right.appendChild(track);
      const ends = el("div", "cl-ends"); ends.appendChild(el("span", null, "開始 " + P.start_date)); ends.appendChild(el("span", null, "到期 " + P.due_date)); right.appendChild(ends);
      hbox.appendChild(rb); hbox.appendChild(right); hero.appendChild(hbox); container.appendChild(hero);

      // tasks
      const tc = el("div", "cl-card");
      const th2 = el("div", "cl-h", "指導教授任務分派");
      const opN = tasks.filter((t) => t.status !== "done").length;
      th2.appendChild(el("span", "cl-cnt", tasks.length ? (opN + " 項待辦 / 共 " + tasks.length) : "尚無任務"));
      tc.appendChild(th2);
      if (!tasks.length) tc.appendChild(el("div", "cl-empty", "目前沒有指派任務"));
      tasks.forEach((t) => {
        const d = dueChip(t.due_date, t.remind_lead_days, t.status);
        const row = el("div", "cl-task " + t.status);
        const st = el("div", "cl-tst " + t.status, t.status === "done" ? "✓" : t.status === "doing" ? "◐" : "");
        st.addEventListener("click", async () => {
          const nxt = t.status === "todo" ? "doing" : t.status === "doing" ? "done" : "todo";
          try { await ax.patch("tasks?id=eq." + t.id, { status: nxt }); t.status = nxt; render(); } catch (e) { alert("更新失敗：" + e.message); }
        });
        row.appendChild(st);
        const mid = el("div");
        mid.appendChild(el("div", "cl-tt", t.title));
        const meta = el("div", "cl-tmeta");
        meta.appendChild(el("span", "cl-pr " + (t.priority || "med")));
        const msName = t.milestone_id ? (ms.find((m) => m.id === t.milestone_id) || {}).name : null;
        if (msName) meta.appendChild(el("span", "cl-tag ms", msName));
        meta.appendChild(el("span", "cl-tag", "指導教授指派"));
        if (d.c) meta.appendChild(el("span", "cl-rem " + d.cls, d.c));
        mid.appendChild(meta); row.appendChild(mid);
        row.appendChild(el("div", "cl-due " + d.cls, "到期 " + (t.due_date || "未定")));
        tc.appendChild(row);
      });
      if (isPI) {
        const add = el("div", "cl-add");
        const ti = el("input"); ti.type = "text"; ti.placeholder = "任務內容…";
        const dd = el("input"); dd.type = "date";
        const pr = el("select"); [["high", "高"], ["med", "中"], ["low", "低"]].forEach((x) => { const o = el("option", null, x[1]); o.value = x[0]; if (x[0] === "med") o.selected = true; pr.appendChild(o); });
        const mm = el("select"); const o0 = el("option", null, "（不綁里程碑）"); o0.value = ""; mm.appendChild(o0);
        ms.forEach((m) => { const o = el("option", null, m.name); o.value = m.id; mm.appendChild(o); });
        const bt = el("button", "cl-btn dark", "派工 →");
        bt.addEventListener("click", async () => {
          if (!ti.value.trim()) return;
          try {
            const rows = await ax.post("tasks", { student_id: P.student_id, assigner_id: cfg.profileId, title: ti.value.trim(), milestone_id: mm.value || null, due_date: dd.value || null, priority: pr.value, status: "todo" });
            (P.tasks = P.tasks || []).unshift(rows[0]); ti.value = ""; render();
          } catch (e) { alert("派工失敗：" + e.message); }
        });
        [ti, mm, dd, pr, bt].forEach((x) => add.appendChild(x));
        tc.appendChild(add);
      }
      container.appendChild(tc);

      // milestones
      const mc = el("div", "cl-card");
      mc.appendChild(el("div", "cl-h", "里程碑 · 產出到齊才算完成"));
      if (!ms.length) mc.appendChild(el("div", "cl-empty", "尚未建立里程碑。"));
      ms.forEach((m) => {
        const p = msPct(m), st = msStatus(p);
        const outs = m.required_outputs || [], comments = (m.comments || []);
        const box = el("div", "cl-ms");
        const head = el("div", "cl-mh");
        head.appendChild(smallRing(p, st));
        const mid = el("div"); mid.appendChild(el("div", "cl-mn", m.name)); mid.appendChild(el("div", "cl-mo", "必要產出 " + outs.filter((o) => o.is_done).length + "/" + outs.length)); head.appendChild(mid);
        const mm = el("div", "cl-mm");
        if (comments.length) mm.appendChild(el("span", "cl-bn", "💬 " + comments.length));
        mm.appendChild(el("span", "cl-wt", "權重 " + (m.weight || 0) + "%"));
        mm.appendChild(el("span", "cl-stt " + st, st === "done" ? "完成" : st === "doing" ? "進行中" : "未開始"));
        mm.appendChild(el("span", "cl-car", "▸")); head.appendChild(mm);
        head.addEventListener("click", (e) => { if (!e.target.closest("input,button,.cl-or")) box.classList.toggle("open"); });
        box.appendChild(head);
        const att = el("div", "cl-att");
        att.appendChild(el("div", "cl-ol", "必要產出（點一下切換完成）"));
        outs.forEach((o) => {
          const row = el("div", "cl-or" + (o.is_done ? "" : " miss"));
          row.appendChild(el("div", "cl-oc " + (o.is_done ? "done" : "miss"), o.is_done ? "✓" : ""));
          row.appendChild(el("span", null, (o.label || "產出") + (o.is_done ? "" : "（尚缺）")));
          row.appendChild(el("span", "cl-ok", KL[o.kind] || o.kind || ""));
          row.addEventListener("click", async () => {
            try { await ax.patch("required_outputs?id=eq." + o.id, { is_done: !o.is_done }); o.is_done = !o.is_done; render(); box.classList.add("open"); } catch (e) { alert("更新失敗：" + e.message); }
          });
          att.appendChild(row);
        });
        if (!outs.length) att.appendChild(el("div", "cl-empty", "此里程碑尚未定義必要產出。"));
        att.appendChild(el("div", "cl-ol", "指導教授留言"));
        comments.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
        comments.forEach((c) => {
          const cm = el("div", "cl-cmt");
          cm.appendChild(el("div", "cl-av " + (c.author_role === "pi" ? "pi" : "stu"), c.author_role === "pi" ? "師" : "生"));
          const cb = el("div", "cl-cb");
          cb.appendChild(el("div", "cl-cw", c.author_role === "pi" ? "指導教授" : "學生"));
          cb.appendChild(el("div", "cl-ct", c.body)); cm.appendChild(cb); att.appendChild(cm);
        });
        const cadd = el("div", "cl-cadd");
        const ci = el("input"); ci.type = "text"; ci.placeholder = isPI ? "以指導教授身分留言…" : "回覆…";
        const cbtn = el("button", "cl-btn", "送出");
        cbtn.addEventListener("click", async () => {
          if (!ci.value.trim()) return;
          try {
            const rows = await ax.post("comments", { milestone_id: m.id, author_id: cfg.profileId, author_role: isPI ? "pi" : "student", body: ci.value.trim() });
            (m.comments = m.comments || []).push(rows[0]); ci.value = ""; render(); box.classList.add("open");
          } catch (e) { alert("留言失敗：" + e.message); }
        });
        cadd.appendChild(ci); cadd.appendChild(cbtn); att.appendChild(cadd);
        box.appendChild(att); mc.appendChild(box);
      });
      container.appendChild(mc);

      // personal todos (owner-only)
      const td = el("div", "cl-card");
      td.appendChild(el("div", "cl-h", "我的 Todo · 個人待辦（僅自己可見）"));
      if (!myTodos.length) td.appendChild(el("div", "cl-empty", "還沒有待辦，加一個吧"));
      myTodos.forEach((t) => {
        const row = el("div", "cl-todo " + (t.done ? "done" : ""));
        const ck = el("div", "cl-ck " + (t.done ? "on" : ""), t.done ? "✓" : "");
        ck.addEventListener("click", async () => { try { await ax.patch("todos?id=eq." + t.id, { done: !t.done }); t.done = !t.done; render(); } catch (e) { alert(e.message); } });
        row.appendChild(ck); row.appendChild(el("span", "cl-tx", t.title));
        if (t.due_date) row.appendChild(el("span", "cl-due", t.due_date));
        const del = el("span", "cl-del", "×");
        del.addEventListener("click", async () => { try { await ax.del("todos?id=eq." + t.id); myTodos = myTodos.filter((x) => x.id !== t.id); render(); } catch (e) { alert(e.message); } });
        row.appendChild(del); td.appendChild(row);
      });
      const tadd = el("div", "cl-add");
      const tin = el("input"); tin.type = "text"; tin.placeholder = "新增個人待辦…";
      const tbtn = el("button", "cl-btn", "加入");
      const addTodo = async () => {
        if (!tin.value.trim()) return;
        try { const rows = await ax.post("todos", { owner_id: cfg.profileId, title: tin.value.trim() }); myTodos.push(rows[0]); tin.value = ""; render(); } catch (e) { alert(e.message); }
      };
      tbtn.addEventListener("click", addTodo);
      tin.addEventListener("keydown", (e) => { if (e.key === "Enter") addTodo(); });
      tadd.appendChild(tin); tadd.appendChild(tbtn); td.appendChild(tadd);
      container.appendChild(td);
    }

    try { await load(); render(); }
    catch (err) { container.appendChild(el("div", "cl-err", "無法載入進度：" + (err && err.message ? err.message : err))); }
  }

  window.CoreLabProgress = { mount: mount };
})();
