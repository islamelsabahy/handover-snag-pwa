"use strict";
const assert = require("assert");
const D = require("../docs/templates.js");
const S = require("../docs/snag.js");
let n = 0;
const t = (name, fn) => { fn(); n++; };

t("checklist ids are unique and every item is bilingual with a known trade", () => {
  ["apartment", "villa"].forEach(type => {
    const cl = D.buildChecklist(type, { bedrooms: 3, bathrooms: 2 });
    const seen = new Set();
    cl.rooms.forEach(r => {
      assert.ok(r.en && r.ar, r.id);
      r.items.forEach(it => {
        assert.ok(!seen.has(it.id), "dup " + it.id); seen.add(it.id);
        assert.ok(it.en && it.ar, it.id);
        assert.ok(D.TRADES[it.trade], it.id + " trade " + it.trade);
      });
    });
    assert.ok(seen.size > 40);
  });
  assert.ok(D.buildChecklist("villa").rooms.some(r => r.id === "external"));
  assert.ok(!D.buildChecklist("apartment").rooms.some(r => r.id === "external"));
});

t("room counts follow bedrooms/bathrooms and are clamped", () => {
  const ids = cl => cl.rooms.map(r => r.id);
  assert.deepStrictEqual(ids(D.buildChecklist("apartment", { bedrooms: 0, bathrooms: 0 })).filter(i => /^(bed|bath)/.test(i)), []);
  assert.strictEqual(ids(D.buildChecklist("apartment", { bedrooms: 99, bathrooms: -4 })).filter(i => /^bed/.test(i)).length, 8);
  assert.throws(() => D.buildChecklist("castle"));
});

function fresh() {
  const insp = S.newInspection({ project: "Sample Heights", unit: "B-204", inspector: "Test", date: "2026-01-01", bedrooms: 1, bathrooms: 1 });
  return { insp, cl: S.checklistOf(insp) };
}
function markAll(insp, cl, status) { cl.rooms.forEach(r => r.items.forEach(i => S.setItem(insp, cl, i.id, { status }))); }

t("verdict: incomplete -> ready -> conditional -> rejected", () => {
  const { insp, cl } = fresh();
  assert.strictEqual(S.verdict(S.stats(insp, cl), insp.limits), "incomplete");
  markAll(insp, cl, "ok");
  assert.strictEqual(S.verdict(S.stats(insp, cl), insp.limits), "ready");
  S.setItem(insp, cl, "living.walls", { status: "defect", severity: "minor" });
  assert.strictEqual(S.verdict(S.stats(insp, cl), insp.limits), "conditional");
  S.setItem(insp, cl, "kitchen.taps", { status: "defect", severity: "critical" });
  assert.strictEqual(S.verdict(S.stats(insp, cl), insp.limits), "rejected");
  S.setItem(insp, cl, "kitchen.taps", { status: "ok" });
  ["living.window", "living.glass", "living.ac", "kitchen.drain"].forEach(id => S.setItem(insp, cl, id, { status: "defect", severity: "major" }));
  assert.strictEqual(S.stats(insp, cl).bySeverity.major, 4);
  assert.strictEqual(S.verdict(S.stats(insp, cl), insp.limits), "rejected");
  insp.limits.maxMajor = 4;
  assert.strictEqual(S.verdict(S.stats(insp, cl), insp.limits), "conditional");
});

t("leaving defect resets severity; na counts as done", () => {
  const { insp, cl } = fresh();
  S.setItem(insp, cl, "living.walls", { status: "defect", severity: "critical" });
  const it = S.setItem(insp, cl, "living.walls", { status: "ok" });
  assert.strictEqual(it.severity, "minor");
  S.setItem(insp, cl, "living.floor", { status: "na" });
  const st = S.stats(insp, cl);
  assert.strictEqual(st.done, 2);
  assert.ok(Math.abs(st.progress - 2 / st.total) < 1e-12);
});

t("validation rejects bad input", () => {
  const { insp, cl } = fresh();
  assert.throws(() => S.setItem(insp, cl, "nope.x", { status: "ok" }));
  assert.throws(() => S.setItem(insp, cl, "living.walls", { status: "broken" }));
  assert.throws(() => S.setItem(insp, cl, "living.walls", { trade: "magic" }));
  assert.throws(() => S.setItem(insp, cl, "living.walls", { photos: new Array(7).fill("p") }));
});

t("punch list is grouped by trade, severity desc, refs sequential; trade override works", () => {
  const { insp, cl } = fresh();
  S.setItem(insp, cl, "living.walls", { status: "defect", severity: "minor" });
  S.setItem(insp, cl, "living.ceiling", { status: "defect", severity: "major" });
  S.setItem(insp, cl, "living.elec", { status: "defect", severity: "minor", trade: "paint" });
  const pl = S.punchList(insp, cl);
  assert.deepStrictEqual(pl.map(r => r.ref), ["S-001", "S-002", "S-003"]);
  assert.deepStrictEqual(pl.map(r => r.trade), ["paint", "paint", "paint"]);
  assert.strictEqual(pl[0].severity, "major");
  assert.strictEqual(S.stats(insp, cl).byTrade.paint, 3);
});

t("CSV: BOM, quoting, formula neutralising, both languages", () => {
  const { insp, cl } = fresh();
  S.setItem(insp, cl, "living.walls", { status: "defect", note: '=HYPERLINK("x"),"quoted"\nnew line' });
  const csv = S.toCsv(insp, cl, "en");
  assert.ok(csv.startsWith("﻿Ref,Trade"));
  assert.ok(csv.includes('"\'=HYPERLINK(""x""),""quoted""\nnew line"'));
  assert.ok(S.toCsv(insp, cl, "ar").includes("الحرفة"));
});

t("import round-trips and sanitises hostile input", () => {
  const { insp, cl } = fresh();
  S.setItem(insp, cl, "living.walls", { status: "defect", severity: "major", note: "crack" });
  const back = S.importInspection(JSON.parse(JSON.stringify(insp)));
  assert.strictEqual(S.itemOf(back, "living.walls").status, "defect");
  assert.deepStrictEqual(S.itemOf(back, "living.walls").photos, []);
  const evil = { v: 1, id: "../../x", meta: { project: "<img onerror=1>", type: "weird", bedrooms: 9999 },
    limits: { maxMajor: -5 }, items: { "ghost.item": { status: "defect" }, "living.walls": { status: "hacked", severity: "zzz", trade: "zzz", note: "x".repeat(9999) } } };
  const clean = S.importInspection(evil);
  assert.notStrictEqual(clean.id, "../../x");
  assert.strictEqual(clean.meta.type, "apartment");
  assert.strictEqual(clean.meta.bedrooms, 8);
  assert.strictEqual(clean.limits.maxMajor, 3);
  assert.strictEqual(clean.items["ghost.item"], undefined);
  assert.strictEqual(S.itemOf(clean, "living.walls").status, "pending");
  assert.ok(S.itemOf(clean, "living.walls").note.length <= 500);
  assert.throws(() => S.importInspection("{not json"));
  assert.throws(() => S.importInspection({ v: 2 }));
});

console.log("ok: " + n + " test groups passed");
