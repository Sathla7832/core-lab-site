(function (root) {
  "use strict";
  // Only scheduling rules are public. Readings are supplied by the authenticated
  // resource query in member.js; never duplicate protected titles in this asset.
  const sourceDates = ["11/11", "11/18", "11/25", "12/2", "12/9", "12/16", "12/23", "12/30"];
  const students = {
    li: { zh: "李承叡", en: "Cheng-Jui Li", day: 2 },
    ting: { zh: "林庭暉", en: "Ting-Hui Lin", day: 0 },
    lu: { zh: "呂安璿", en: "An-Hsuan Lu", day: 3 },
    yu: { zh: "林宥陞", en: "Yu-Sheng Lin", day: 2 },
  };
  const isoDate = (week, offset = 0) => new Date(Date.UTC(2026, 10, 16 + week * 7 + offset)).toISOString().slice(0, 10);
  const sameStudent = (person, student) => person.zh === student.zh
    || String(person.en || "").trim().toLowerCase() === student.en.toLowerCase();
  const build = (rows) => {
    const weeks = sourceDates.map((sourceDate, index) => {
      const keys = index % 2 ? ["yu", "lu"] : ["ting", "li"];
      const people = rows.find((row) => row.date === sourceDate)?.graduate || [];
      return {
        code: `${index % 2 ? "B" : "A"}${Math.floor(index / 2) + 1}`,
        start: isoDate(index), end: isoDate(index, 6), sourceDate,
        individuals: keys.map((key) => {
          const student = students[key];
          const matches = people.filter((person) => sameStudent(person, student));
          // Ambiguous or missing assignments must not be silently moved to a peer.
          const person = matches.length === 1 ? matches[0] : {};
          return { ...person, ...student, date: isoDate(index, student.day), time: "13:00–14:00", sourceDate };
        }),
      };
    });
    return weeks.map((week, index) => ({ ...week, discussion: {
      date: week.start, time: "14:00–17:00", code: weeks[index + 1]?.code || null,
      readings: weeks[index + 1]?.individuals || [],
    } }));
  };
  const render = (host, rows, readingList, today) => {
    const doc = host.ownerDocument;
    const el = (tag, text, cls) => {
      const node = doc.createElement(tag);
      if (text) node.textContent = text;
      if (cls) node.className = cls;
      return node;
    };
    const weeks = build(rows);
    const next = weeks.find((week) => week.end >= today);
    const status = next ? `目前／下一個報告週：${next.code}（${next.start} 起）` : "本輪八週報告已結束。";
    host.append(el("p", `臺灣日期：${today} · ${status}`, "member-schedule-timeline-status"));
    host.append(el("p", "個別報告 13:00–14:00；每週一 14:00–17:00 四人共同討論下一組兩篇文章。日期未自動排除假日，停課另行調整。", "member-masters-intro"));
    host.append(el("p", "小螢幕可左右滑動表格，查看個別報告與共同討論。", "member-masters-scroll-hint"));
    const scroll = el("div", "", "member-masters-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "碩士班八週報告時程，可左右捲動");
    const table = el("table", "", "member-masters-table");
    table.append(el("caption", "碩士班八週報告與共同討論：2026/11/16–2027/01/07"));
    const head = el("thead");
    const tr = el("tr");
    ["週次", "星期一｜個別報告", "星期三｜個別報告", "星期四｜個別報告", "星期一｜四人共同討論"].forEach((label) => {
      const th = el("th", label); th.scope = "col"; tr.append(th);
    });
    head.append(tr); table.append(head);
    const body = el("tbody");
    const identity = (person, host, withDate = true) => {
      host.append(el("strong", `${person.zh} · ${person.en}`, "member-masters-person"));
      if (withDate) host.append(el("p", `${person.date}　${person.time}`, "member-masters-time"));
      host.append(readingList(person));
    };
    weeks.forEach((week) => {
      const row = el("tr", "", `member-masters-week member-masters-${week.code[0].toLowerCase()}`);
      if (week === next) row.classList.add("member-masters-next");
      const title = el("th"); title.scope = "row";
      title.append(el("strong", week.code), el("p", `${week.start} 起`), el("small", `原文獻日期 ${week.sourceDate}`));
      if (week === next) title.append(el("span", "目前／下一週", "member-masters-week-badge"));
      row.append(title);
      [0, 2, 3].forEach((day) => {
        const cell = el("td");
        const person = week.individuals.find((item) => item.day === day);
        if (person) identity(person, cell);
        else cell.append(el("span", "無個別報告", "muted"));
        row.append(cell);
      });
      const joint = el("td", "", "member-masters-discussion");
      joint.append(el("strong", `${week.discussion.date}　14:00–17:00`, "member-masters-time"));
      joint.append(el("p", "共同參與：李承叡、林庭暉、呂安璿、林宥陞"));
      if (week.discussion.code) {
        joint.append(el("h4", `預先討論 ${week.discussion.code} 的兩篇文獻`));
        week.discussion.readings.forEach((person) => {
          const card = el("div", "", "member-masters-discussion-reading");
          identity(person, card, false);
          card.append(el("small", `個別報告：${person.date}　13:00–14:00`));
          joint.append(card);
        });
      } else joint.append(el("p", "下一輪文章尚未指定。本輪 16 篇均已排入個別報告。"));
      row.append(joint); body.append(row);
    });
    table.append(body); scroll.append(table); host.append(scroll);
  };
  const api = { build, render };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CORE_MASTERS_SCHEDULE = api;
})(typeof window !== "undefined" ? window : globalThis);
