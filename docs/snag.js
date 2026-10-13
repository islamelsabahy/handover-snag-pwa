/* Handover snagging logic: stats, verdict, punch list, CSV, safe import. No DOM, no storage. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./templates.js"));
  else root.Snag = factory(root.SnagData);
})(typeof self !== "undefined" ? self : this, function (D) {
  "use strict";

  var STATUSES = ["pending", "ok", "defect", "na"];
  var DEFAULT_LIMITS = { maxMajor: 3 };
  var PHOTO_MAX = 6;

  function uid() {
    return "i" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36);
  }

  function str(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max); }

  function newInspection(meta) {
    meta = meta || {};
    var type = meta.type === "villa" ? "villa" : "apartment";
    var bedrooms = Math.min(8, Math.max(0, Math.trunc(Number(meta.bedrooms === undefined ? 2 : meta.bedrooms)) || 0));
    var bathrooms = Math.min(8, Math.max(0, Math.trunc(Number(meta.bathrooms === undefined ? 2 : meta.bathrooms)) || 0));
    return { id: uid(), v: 1, created: new Date().toISOString(),
      meta: { project: str(meta.project, 120), unit: str(meta.unit, 60), inspector: str(meta.inspector, 80),
        date: str(meta.date, 10), type: type, bedrooms: bedrooms, bathrooms: bathrooms },
      limits: { maxMajor: DEFAULT_LIMITS.maxMajor }, items: {} };
  }

  function checklistOf(insp) {
    return D.buildChecklist(insp.meta.type, { bedrooms: insp.meta.bedrooms, bathrooms: insp.meta.bathrooms });
  }

  function itemOf(insp, id) {
    return insp.items[id] || { status: "pending", severity: "minor", trade: null, note: "", photos: [] };
  }

  /* patch: {status?, severity?, trade?, note?, photos?}. Returns the stored item. */
  function setItem(insp, cl, id, patch) {
    var known = null;
    cl.rooms.forEach(function (r) { r.items.forEach(function (it) { if (it.id === id) known = it; }); });
    if (!known) throw new Error("unknown item " + id);
    var cur = itemOf(insp, id), next = {};
    Object.keys(cur).forEach(function (k) { next[k] = cur[k]; });
    if (patch.status !== undefined) {
      if (STATUSES.indexOf(patch.status) < 0) throw new Error("bad status");
      next.status = patch.status;
    }
    if (patch.severity !== undefined) {
      if (!D.SEVERITIES[patch.severity]) throw new Error("bad severity");
      next.severity = patch.severity;
    }
    if (patch.trade !== undefined) {
      if (patch.trade !== null && !D.TRADES[patch.trade]) throw new Error("bad trade");
      next.trade = patch.trade;
    }
    if (patch.note !== undefined) next.note = str(patch.note, 500);
    if (patch.photos !== undefined) {
      if (!Array.isArray(patch.photos) || patch.photos.length > PHOTO_MAX) throw new Error("photos: max " + PHOTO_MAX);
      next.photos = patch.photos.map(function (p) { return str(p, 80); });
    }
    if (next.status !== "defect") { next.severity = "minor"; next.note = next.note; }
    insp.items[id] = next;
    return next;
  }

  function effectiveTrade(it, tpl) { return it.trade || tpl.trade; }

  function stats(insp, cl) {
    var s = { total: 0, pending: 0, ok: 0, na: 0, defects: 0, done: 0, progress: 0,
      bySeverity: { minor: 0, major: 0, critical: 0 }, byTrade: {}, byRoom: {} };
    cl.rooms.forEach(function (room) {
      var rs = { total: 0, done: 0, defects: 0 };
      room.items.forEach(function (tpl) {
        var it = itemOf(insp, tpl.id);
        s.total++; rs.total++;
        if (it.status === "pending") s.pending++;
        else { s.done++; rs.done++; }
        if (it.status === "ok") s.ok++;
        if (it.status === "na") s.na++;
        if (it.status === "defect") {
          s.defects++; rs.defects++;
          s.bySeverity[it.severity]++;
          var tr = effectiveTrade(it, tpl);
          s.byTrade[tr] = (s.byTrade[tr] || 0) + 1;
        }
      });
      s.byRoom[room.id] = rs;
    });
    s.progress = s.total ? s.done / s.total : 0;
    return s;
  }

  /* incomplete | rejected | conditional | ready */
  function verdict(st, limits) {
    limits = limits || DEFAULT_LIMITS;
    if (st.pending > 0) return "incomplete";
    if (st.bySeverity.critical > 0 || st.bySeverity.major > limits.maxMajor) return "rejected";
    if (st.defects > 0) return "conditional";
    return "ready";
  }

  /* Sorted defect list with stable references S-001... */
  function punchList(insp, cl) {
    var rows = [], order = 0;
    cl.rooms.forEach(function (room) {
      room.items.forEach(function (tpl) {
        var it = itemOf(insp, tpl.id);
        order++;
        if (it.status !== "defect") return;
        rows.push({ order: order, itemId: tpl.id, room: room, tpl: tpl, trade: effectiveTrade(it, tpl),
          severity: it.severity, note: it.note, photos: it.photos.slice() });
      });
    });
    rows.sort(function (a, b) {
      if (a.trade !== b.trade) return a.trade < b.trade ? -1 : 1;
      var d = D.SEVERITIES[b.severity].rank - D.SEVERITIES[a.severity].rank;
      return d || a.order - b.order;
    });
    rows.forEach(function (r, i) { r.ref = "S-" + String(i + 1).padStart(3, "0"); });
    return rows;
  }

  function csvCell(v) {
    var s = String(v === undefined || v === null ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formulas
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(insp, cl, lang) {
    lang = lang === "en" ? "en" : "ar";
    var head = lang === "ar"
      ? ["الرقم", "الحرفة", "الخطورة", "الغرفة", "البند", "ملاحظة", "عدد الصور"]
      : ["Ref", "Trade", "Severity", "Room", "Item", "Note", "Photos"];
    var lines = [head.map(csvCell).join(",")];
    punchList(insp, cl).forEach(function (r) {
      lines.push([r.ref, D.TRADES[r.trade][lang], D.SEVERITIES[r.severity][lang], r.room[lang], r.tpl[lang], r.note, r.photos.length]
        .map(csvCell).join(","));
    });
    return "﻿" + lines.join("\r\n") + "\r\n";
  }

  /* Validate untrusted JSON (backup file) into a clean inspection. Throws on junk. */
  function importInspection(raw) {
    var o = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!o || typeof o !== "object" || o.v !== 1 || !o.meta) throw new Error("not a snag backup");
    var insp = newInspection(o.meta);
    insp.id = /^[A-Za-z0-9_-]{1,40}$/.test(str(o.id, 40)) ? o.id : insp.id;
    insp.created = str(o.created, 40) || insp.created;
    var mm = Math.trunc(Number(o.limits && o.limits.maxMajor));
    insp.limits = { maxMajor: mm >= 0 && mm <= 99 ? mm : DEFAULT_LIMITS.maxMajor };
    var cl = checklistOf(insp);
    var items = o.items && typeof o.items === "object" ? o.items : {};
    Object.keys(items).forEach(function (id) {
      var it = items[id] || {};
      try {
        setItem(insp, cl, id, {
          status: STATUSES.indexOf(it.status) >= 0 ? it.status : "pending",
          severity: D.SEVERITIES[it.severity] ? it.severity : "minor",
          trade: it.trade && D.TRADES[it.trade] ? it.trade : null,
          note: it.note, photos: []
        });
      } catch (e) { /* unknown item ids are dropped */ }
    });
    return insp;
  }

  return { STATUSES: STATUSES, PHOTO_MAX: PHOTO_MAX, DEFAULT_LIMITS: DEFAULT_LIMITS, newInspection: newInspection,
    checklistOf: checklistOf, itemOf: itemOf, setItem: setItem, stats: stats, verdict: verdict,
    punchList: punchList, toCsv: toCsv, importInspection: importInspection };
});
