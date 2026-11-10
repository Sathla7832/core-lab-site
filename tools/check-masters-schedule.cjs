const assert = require("node:assert/strict");
const { build } = require("../assets/masters-schedule.js");
const sources = ["11/11", "11/18", "11/25", "12/2", "12/9", "12/16", "12/23", "12/30"];
const names = [["李承叡", "林庭暉"], ["呂安璿", "林宥陞"]];
const rows = sources.map((date, i) => ({ date, undergraduate: [{ zh: "專題生", presentation: { label: `UG-${date}` } }], graduate: names[i % 2].map((zh) => ({ zh, presentation: { label: `${date}-${zh}`, url: "https://doi.org/test" } })) }));
const original = JSON.stringify(rows);
const weeks = build(rows);
assert.equal(weeks.length, 8);
assert.equal(weeks[0].start, "2026-11-16");
assert.equal(weeks[7].start, "2027-01-04");
for (const [i, week] of weeks.entries()) {
  for (const person of week.individuals) {
    assert.equal(person.presentation.label, `${sources[i]}-${person.zh}`);
    assert.equal(new Date(`${person.date}T00:00Z`).getUTCDay(), person.zh === "呂安璿" ? 4 : person.zh === "林庭暉" ? 1 : 3);
    assert.equal(person.time, "13:00–14:00");
  }
  assert.equal(week.discussion.time, "14:00–17:00");
  assert.equal(week.discussion.date, week.start);
  if (i < 7) assert.deepEqual(week.discussion.readings, weeks[i + 1].individuals);
}
assert.equal(weeks[0].individuals[0].date, "2026-11-16");
assert.equal(weeks[0].discussion.code, "B1");
assert.equal(weeks[1].individuals[0].zh, "林宥陞");
assert.equal(weeks[1].individuals[0].date, "2026-11-25");
assert.equal(weeks[1].individuals[1].zh, "呂安璿");
assert.equal(weeks[1].individuals[1].date, "2026-11-26");
assert.equal(weeks[7].individuals[1].date, "2027-01-07");
assert.equal(weeks[7].discussion.code, null);
assert.deepEqual(weeks[7].discussion.readings, []);
assert.equal(JSON.stringify(rows), original, "Source schedule/undergraduate assignments must remain unchanged");
assert.equal(build([])[0].individuals[0].presentation, undefined);
const duplicate = structuredClone(rows); duplicate[0].graduate.push(duplicate[0].graduate[0]);
assert.equal(build(duplicate)[0].individuals.find((p) => p.zh === "李承叡").presentation, undefined);
const fs = require("node:fs");
assert(!fs.readFileSync("assets/masters-schedule.js", "utf8").includes("Iodine-Functionalized"), "No protected paper titles in public assets");
console.log("PASS: 8 weeks; 16 original owner/paper pairs; corrected weekdays; next-week discussion; 2027 rollover; missing/ambiguous fail-closed; no source mutation.");
