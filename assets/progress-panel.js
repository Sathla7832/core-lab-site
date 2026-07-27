/* CORE Lab Progress panel (step 2a: rich read-only view).
 * Loaded same-origin so the member-page CSP (script-src 'self') allows it.
 * member.js does Firebase auth + the /api/supabase-token bridge, then calls
 * window.CoreLabProgress.mount(container, { supabaseUrl, anonKey, token, role }).
 * All Supabase reads carry the bridge token, so RLS scopes rows to this user.
 * Completion is product-driven: milestone% = done required-outputs / total,
 * overall% = weighted average across milestones. Nothing is self-reported.
 */
(function () {
  const C = 2 * Math.PI * 52; // ring circumference (r=52)

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  async function sbGet(cfg, path) {
    const res = await fetch(cfg.supabaseUrl + "/rest/v1/" + path, {
      headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.token },
    });
    if (!res.ok) throw new Error("Supabase read failed (" + res.status + ")");
    return res.json();
  }

  const msPct = (m) => {
    const outs = m.required_outputs || [];
    if (!outs.length) return 0;
    return Math.round((outs.filter((o) => o.is_done).length / outs.length) * 100);
  };
  const msStatus = (p) => (p >= 100 ? "done" : p > 0 ? "doing" : "todo");
  const overallPct = (ms) => {
    const wsum = ms.reduce((a, m) => a + (m.weight || 0), 0);
    if (!wsum) return 0;
    return Math.round(ms.reduce((a, m) => a + (m.weight || 0) * msPct(m) / 100, 0) / wsum * 100);
  };
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);

  function renderRing(pct) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "132"); svg.setAttribute("height", "132");
    svg.setAttribute("viewBox", "0 0 132 132");
    svg.innerHTML =
      '<circle cx="66" cy="66" r="52" fill="none" stroke="var(--clgr)" stroke-width="13"/>' +
      '<circle cx="66" cy="66" r="52" fill="none" stroke="var(--clt)" stroke-width="13" stroke-linecap="round"' +
      ' transform="rotate(-90 66 66)" stroke-dasharray="' + C.toFixed(1) + '"' +
      ' stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/>' +
      '<text x="66" y="64" text-anchor="middle" font-size="30" font-weight="700" fill="var(--cli)" font-family="var(--clm)">' + pct + '%</text>' +
      '<text x="66" y="84" text-anchor="middle" font-size="10.5" fill="var(--cls)" font-family="var(--clm)">產出驅動</text>';
    return svg;
  }

  function renderProgress(container, prog) {
    const ms = (prog.milestones || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
    const pct = overallPct(ms);
    const start = new Date(prog.start_date);
    const due = new Date(prog.due_date);
    const today = new Date();
    const total = Math.max(1, daysBetween(start, due));
    const used = Math.min(100, Math.max(0, Math.round(daysBetween(start, today) / total * 100)));
    const left = daysBetween(today, due);

    const card = el("div", "cl-card");
    const hero = el("div", "cl-hero");

    // left: ring + figures
    const ringbox = el("div", "cl-ringbox");
    ringbox.appendChild(renderRing(pct));
    const figs = el("div");
    const f1 = el("div"); f1.appendChild(el("div", "cl-lab", "已用時間")); f1.appendChild(el("div", "cl-big", used + "%"));
    const f2 = el("div"); f2.style.marginTop = "10px";
    f2.appendChild(el("div", "cl-lab", "距到期"));
    f2.appendChild(el("div", "cl-big", left >= 0 ? left + " 天" : "已逾期 " + (-left) + " 天"));
    figs.appendChild(f1); figs.appendChild(f2);
    ringbox.appendChild(figs);

    // right: name + time track
    const right = el("div");
    right.appendChild(el("p", "cl-name", prog._studentName || "成員"));
    right.appendChild(el("p", "cl-proj", prog.project || ""));
    const trackH = el("div", "cl-h", "進度 vs 時間軸"); trackH.style.marginTop = "14px";
    right.appendChild(trackH);
    const track = el("div", "cl-track");
    const fill = el("div", "cl-fill"); fill.style.width = used + "%"; track.appendChild(fill);
    const mkHalf = el("div", "cl-mk half"); mkHalf.style.left = "50%"; mkHalf.appendChild(el("span", null, "50%")); track.appendChild(mkHalf);
    const mkToday = el("div", "cl-mk today"); mkToday.style.left = used + "%"; mkToday.appendChild(el("span", null, "今天")); track.appendChild(mkToday);
    const mkDue = el("div", "cl-mk due"); mkDue.style.left = "100%"; mkDue.appendChild(el("span", null, "到期")); track.appendChild(mkDue);
    right.appendChild(track);
    const ends = el("div", "cl-ends");
    ends.appendChild(el("span", null, "開始 " + prog.start_date));
    ends.appendChild(el("span", null, "到期 " + prog.due_date));
    right.appendChild(ends);

    hero.appendChild(ringbox); hero.appendChild(right); card.appendChild(hero);
    container.appendChild(card);

    // milestones
    const mcard = el("div", "cl-card");
    mcard.appendChild(el("div", "cl-h", "里程碑 · 產出到齊才算完成"));
    if (!ms.length) {
      mcard.appendChild(el("div", "cl-empty", "尚未建立里程碑。"));
    }
    ms.forEach((m, i) => {
      const p = msPct(m), st = msStatus(p);
      const outs = (m.required_outputs || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
      const box = el("div", "cl-ms");
      const head = el("div", "cl-mh");
      const num = el("div"); num.style.fontFamily = "var(--clm)"; num.style.fontSize = "20px"; num.style.fontWeight = "700";
      num.style.color = st === "done" ? "var(--clgn)" : st === "doing" ? "var(--clt)" : "var(--clf)";
      num.textContent = st === "todo" ? "–" : p + "%";
      head.appendChild(num);
      const mid = el("div");
      mid.appendChild(el("div", "cl-mn", m.name || "里程碑"));
      mid.appendChild(el("div", "cl-mo", "必要產出 " + outs.filter((o) => o.is_done).length + "/" + outs.length));
      head.appendChild(mid);
      const mm = el("div", "cl-mm");
      mm.appendChild(el("span", "cl-wt", "權重 " + (m.weight || 0) + "%"));
      mm.appendChild(el("span", "cl-st " + st, st === "done" ? "完成" : st === "doing" ? "進行中" : "未開始"));
      mm.appendChild(el("span", "cl-car", "▸"));
      head.appendChild(mm);
      box.appendChild(head);
      const att = el("div", "cl-att");
      att.appendChild(el("div", "cl-ol", "必要產出（到齊才算完成）"));
      outs.forEach((o) => {
        const row = el("div", "cl-or" + (o.is_done ? "" : " miss"));
        const oc = el("div", "cl-oc " + (o.is_done ? "done" : "miss"), o.is_done ? "✓" : "");
        row.appendChild(oc);
        row.appendChild(el("span", null, (o.label || "產出") + (o.is_done ? "" : "（尚缺）")));
        row.appendChild(el("span", "cl-ok", o.kind || ""));
        att.appendChild(row);
      });
      if (!outs.length) att.appendChild(el("div", "cl-empty", "此里程碑尚未定義必要產出。"));
      box.appendChild(att);
      head.addEventListener("click", () => box.classList.toggle("open"));
      mcard.appendChild(box);
    });
    container.appendChild(mcard);
  }

  async function mount(container, cfg) {
    container.innerHTML = "";
    container.id = container.id || "cl-progress";
    try {
      const rows = await sbGet(
        cfg,
        "progress?select=id,project,start_date,due_date,student_id,profiles(name)," +
        "milestones(id,name,weight,position,due_date,required_outputs(is_done,label,kind,position))" +
        "&order=due_date.asc"
      );
      rows.forEach((r) => { r._studentName = (r.profiles && r.profiles.name) || ""; });
      if (!rows.length) {
        container.appendChild(el("div", "cl-empty", "目前沒有進度資料。"));
        return;
      }
      // PI (multiple students) gets a selector; a student sees only their own row(s).
      const top = el("div", "cl-top");
      const body = el("div");
      if (rows.length > 1) {
        const sel = el("select");
        rows.forEach((r, i) => {
          const o = el("option", null, (r._studentName || "成員") + " — " + (r.project || ""));
          o.value = String(i); sel.appendChild(o);
        });
        sel.addEventListener("change", () => { body.innerHTML = ""; renderProgress(body, rows[+sel.value]); });
        const lab = el("span", "cl-lab", "選擇成員 / 專案");
        const wrap = el("div"); wrap.appendChild(lab); wrap.appendChild(sel);
        top.appendChild(wrap);
        container.appendChild(top);
      }
      container.appendChild(body);
      renderProgress(body, rows[0]);
    } catch (err) {
      container.appendChild(el("div", "cl-err", "無法載入進度：" + (err && err.message ? err.message : err)));
    }
  }

  window.CoreLabProgress = { mount: mount };
})();
