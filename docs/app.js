(function () {
"use strict";
var D = window.SnagData, S = window.Snag;
var app = document.getElementById("app");

/* ---------- i18n ---------- */
var T = {
  kick: { ar: "فحص الاستلام", en: "HANDOVER CHECK" },
  ttl: { ar: "فحص استلام الوحدة", en: "Unit handover snagging" },
  newi: { ar: "+ فحص جديد", en: "+ New inspection" },
  none: { ar: "لسه مفيش فحوصات. ابدأ بفحص جديد.", en: "No inspections yet. Start a new one." },
  hint: { ar: "التطبيق شغال أوفلاين وبياناتك وصورك بتتخزن على الجهاز ده بس. ممكن تضيفه للشاشة الرئيسية من قائمة المتصفح.", en: "Works offline. Your data and photos stay on this device only. Add it to your home screen from the browser menu." },
  import: { ar: "استيراد نسخة JSON", en: "Import JSON backup" },
  project: { ar: "اسم المشروع", en: "Project" }, unit: { ar: "رقم الوحدة", en: "Unit" },
  inspector: { ar: "اسم الفاحص", en: "Inspector" }, date: { ar: "التاريخ", en: "Date" },
  type: { ar: "نوع الوحدة", en: "Unit type" }, apartment: { ar: "شقة", en: "Apartment" }, villa: { ar: "فيلا", en: "Villa" },
  beds: { ar: "عدد غرف النوم", en: "Bedrooms" }, baths: { ar: "عدد الحمامات", en: "Bathrooms" },
  start: { ar: "ابدأ الفحص", en: "Start inspection" }, cancel: { ar: "إلغاء", en: "Cancel" },
  need: { ar: "اكتب رقم الوحدة على الأقل", en: "Enter at least the unit number" },
  progress: { ar: "التقدم", en: "Progress" }, defects: { ar: "عيوب", en: "Defects" },
  critical: { ar: "خطير", en: "Critical" }, major: { ar: "متوسط", en: "Major" }, minor: { ar: "بسيط", en: "Minor" },
  ok: { ar: "سليم", en: "OK" }, defect: { ar: "عيب", en: "Defect" }, na: { ar: "لا ينطبق", en: "N/A" },
  trade: { ar: "الحرفة", en: "Trade" }, sev: { ar: "الخطورة", en: "Severity" }, note: { ar: "ملاحظة", en: "Note" },
  photo: { ar: "📷 صورة", en: "📷 Photo" }, report: { ar: "التقرير", en: "Report" }, back: { ar: "رجوع", en: "Back" },
  pdf: { ar: "طباعة / PDF", en: "Print / PDF" }, csv: { ar: "CSV", en: "CSV" }, json: { ar: "نسخة JSON", en: "JSON backup" },
  del: { ar: "حذف الفحص", en: "Delete inspection" }, confirmDel: { ar: "حذف الفحص ده نهائيا؟", en: "Delete this inspection permanently?" },
  limit: { ar: "أقصى عدد عيوب متوسطة مقبول", en: "Max acceptable major defects" },
  v_ready: { ar: "جاهزة للاستلام", en: "Ready to accept" },
  v_conditional: { ar: "استلام بقائمة عيوب", en: "Accept with punch list" },
  v_rejected: { ar: "غير جاهزة — لا تستلم", en: "Not ready — do not accept" },
  v_incomplete: { ar: "الفحص لم يكتمل", en: "Inspection incomplete" },
  punch: { ar: "قائمة العيوب للمقاول", en: "Contractor punch list" },
  nodef: { ar: "مفيش عيوب مسجلة.", en: "No defects recorded." },
  ref: { ar: "رقم", en: "Ref" }, room: { ar: "الغرفة", en: "Room" }, item: { ar: "البند", en: "Item" },
  disc: { ar: "تقرير فحص بصري للمساعدة في الاستلام. مش شهادة هندسية ولا قانونية، وبيعتمد على دقة الفاحص.", en: "Visual inspection aid for handover. Not an engineering or legal certificate; it depends on the inspector's care." },
  photosNote: { ar: "نسخة JSON بتحفظ البنود والملاحظات بدون الصور. الصور موجودة في تقرير الـ PDF.", en: "The JSON backup keeps checklist and notes but not photos. Photos are in the PDF report." },
  imported: { ar: "تم الاستيراد", en: "Imported" }, badfile: { ar: "ملف غير صالح: ", en: "Invalid file: " },
  of: { ar: "من", en: "of" }, memwarn: { ar: "تخزين الصور مش متاح في المتصفح ده — الصور هتفضل لحد ما تقفل الصفحة.", en: "Photo storage is unavailable in this browser — photos last only until you close the page." },
  prepared: { ar: "أعده", en: "Inspector" }
};
function t(k) { return T[k][db.lang]; }

/* ---------- storage ---------- */
var KEY = "snag.v1";
var db = { lang: "ar", list: [] };
function loadDb() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var o = JSON.parse(raw);
      db.lang = o.lang === "en" ? "en" : "ar";
      db.list = (o.list || []).map(function (x) { try { var i = S.importInspection(x); i.items = x.items && typeof x.items === "object" ? restoreItems(x, i) : i.items; return i; } catch (e) { return null; } }).filter(Boolean);
    }
  } catch (e) {}
}
function restoreItems(x, insp) { // keep photo ids from our own storage (importInspection strips them for foreign files)
  var cl = S.checklistOf(insp);
  Object.keys(x.items).forEach(function (id) {
    var it = x.items[id] || {};
    try { S.setItem(insp, cl, id, { status: it.status, severity: it.severity, trade: it.trade || null, note: it.note,
      photos: Array.isArray(it.photos) ? it.photos.filter(function (p) { return /^ph[a-z0-9]{4,40}$/.test(p); }).slice(0, S.PHOTO_MAX) : [] }); } catch (e) {}
  });
  return insp.items;
}
function saveDb() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
function find(id) { return db.list.filter(function (i) { return i.id === id; })[0]; }

/* photos: IndexedDB with in-memory fallback */
var mem = {}, idb = null, idbFailed = false;
function openIdb() {
  return new Promise(function (res) {
    if (idb || idbFailed) return res(idb);
    try {
      var r = indexedDB.open("snag-photos", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("p"); };
      r.onsuccess = function () { idb = r.result; res(idb); };
      r.onerror = function () { idbFailed = true; res(null); };
    } catch (e) { idbFailed = true; res(null); }
  });
}
function photoOp(mode, id, val) {
  return openIdb().then(function (d) {
    if (!d) {
      if (mode === "put") mem[id] = val; else if (mode === "del") delete mem[id]; else return mem[id] || null;
      return null;
    }
    return new Promise(function (res) {
      var tx = d.transaction("p", mode === "get" ? "readonly" : "readwrite"), st = tx.objectStore("p"), rq;
      if (mode === "put") rq = st.put(val, id); else if (mode === "del") rq = st.delete(id); else rq = st.get(id);
      rq.onsuccess = function () { res(mode === "get" ? rq.result || null : null); };
      rq.onerror = function () { res(null); };
    });
  });
}
function compress(file) {
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var max = 1280, sc = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("image")); };
    img.src = url;
  });
}

/* ---------- tiny DOM helper (text only, never innerHTML) ---------- */
function el(tag, attrs, kids) {
  var e = document.createElement(tag);
  Object.keys(attrs || {}).forEach(function (k) {
    var v = attrs[k];
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k.slice(0, 2) === "on") e[k] = v;
    else if (v !== false && v !== null && v !== undefined) e.setAttribute(k, v === true ? "" : v);
  });
  (kids || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
  return e;
}
function bdi(s) { var b = el("bdi", { dir: "ltr", text: s }); return b; }
function pct(x) { return Math.round(x * 100) + "%"; }
function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function download(name, text, mime) {
  var a = el("a", { href: URL.createObjectURL(new Blob([text], { type: mime })), download: name });
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- views ---------- */
var openRooms = {}, msg = "";
function applyChrome() {
  document.documentElement.lang = db.lang; document.documentElement.dir = db.lang === "ar" ? "rtl" : "ltr";
  document.getElementById("lang").textContent = db.lang === "ar" ? "EN" : "عربي";
  document.getElementById("kick").textContent = t("kick");
  document.getElementById("ttl").textContent = t("ttl");
  document.title = db.lang === "ar" ? "فحص استلام الوحدة" : "Handover Snag";
}
function chipFor(v) { return el("span", { class: "chip v-" + v, text: t("v_" + v) }); }

function home() {
  var kids = [];
  var file = el("input", { type: "file", accept: "application/json,.json", style: "display:none", onchange: function () {
    var f = file.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () { try { var i = S.importInspection(String(r.result)); db.list = db.list.filter(function (x) { return x.id !== i.id; }); db.list.unshift(i); saveDb(); msg = t("imported"); route(); }
      catch (e) { msg = t("badfile") + e.message; route(); } };
    r.readAsText(f);
  } });
  kids.push(el("div", { class: "row sp", style: "margin-bottom:12px" }, [
    el("button", { class: "primary", text: t("newi"), onclick: function () { location.hash = "#/new"; } }),
    el("button", { class: "ghost", text: t("import"), onclick: function () { file.click(); } }), file]));
  if (msg) { kids.push(el("div", { class: "warnbox", text: msg })); msg = ""; }
  if (!db.list.length) kids.push(el("div", { class: "card", text: t("none") }));
  db.list.forEach(function (i) {
    var cl = S.checklistOf(i), st = S.stats(i, cl), v = S.verdict(st, i.limits);
    kids.push(el("div", { class: "list" }, [el("a", { href: "#/i/" + i.id }, [el("div", { class: "card" }, [
      el("div", { class: "row sp" }, [el("b", {}, [bdi(i.meta.unit || "—")]), chipFor(v)]),
      el("div", { class: "dim" }, [i.meta.project || "", " · ", bdi(i.meta.date || "")]),
      el("div", { class: "bar", style: "margin-top:8px" }, [el("i", { style: "width:" + pct(st.progress) })]),
      el("div", { class: "dim", style: "margin-top:4px" }, [t("progress") + " ", bdi(pct(st.progress)), " · " + t("defects") + " ", bdi(String(st.defects))])])])]));
  });
  kids.push(el("div", { class: "warnbox" }, [t("hint")]));
  return kids;
}

function newForm() {
  var f = {};
  function field(key, label, type, val, extra) {
    var inp = el("input", Object.assign({ type: type, value: val }, extra || {}));
    f[key] = inp; return el("label", { class: "f" }, [label, inp]);
  }
  var typeSel = el("select", {}, [el("option", { value: "apartment", text: t("apartment") }), el("option", { value: "villa", text: t("villa") })]);
  var err = el("div", { class: "err" });
  return [el("div", { class: "card" }, [
    field("project", t("project"), "text", "", { maxlength: 120 }),
    field("unit", t("unit"), "text", "", { maxlength: 60, dir: "ltr" }),
    field("inspector", t("inspector"), "text", "", { maxlength: 80 }),
    field("date", t("date"), "date", today()),
    el("label", { class: "f" }, [t("type"), typeSel]),
    field("bedrooms", t("beds"), "number", "2", { min: 0, max: 8, inputmode: "numeric" }),
    field("bathrooms", t("baths"), "number", "2", { min: 0, max: 8, inputmode: "numeric" }),
    err,
    el("div", { class: "row" }, [
      el("button", { class: "primary", text: t("start"), onclick: function () {
        if (!f.unit.value.trim()) { err.textContent = t("need"); return; }
        var i = S.newInspection({ project: f.project.value, unit: f.unit.value.trim(), inspector: f.inspector.value, date: f.date.value,
          type: typeSel.value, bedrooms: f.bedrooms.value, bathrooms: f.bathrooms.value });
        db.list.unshift(i); saveDb(); location.hash = "#/i/" + i.id;
      } }),
      el("button", { class: "ghost", text: t("cancel"), onclick: function () { location.hash = "#/"; } })])])];
}

function inspection(insp) {
  var cl = S.checklistOf(insp), st = S.stats(insp, cl), v = S.verdict(st, insp.limits);
  var kids = [];
  kids.push(el("div", { class: "card" }, [
    el("div", { class: "row sp" }, [el("b", {}, [bdi(insp.meta.unit), " ", insp.meta.project]), chipFor(v)]),
    el("div", { class: "bar", style: "margin-top:8px" }, [el("i", { style: "width:" + pct(st.progress) })]),
    el("div", { class: "stats" }, [
      stat(st.defects, t("defects")), stat(st.bySeverity.critical, t("critical")), stat(st.bySeverity.major, t("major")), stat(st.bySeverity.minor, t("minor"))]),
    el("label", { class: "f" }, [t("limit"), el("input", { type: "number", min: 0, max: 99, value: insp.limits.maxMajor, inputmode: "numeric", onchange: function (e) {
      var n = Math.trunc(Number(e.target.value)); insp.limits.maxMajor = n >= 0 && n <= 99 ? n : 3; saveDb(); render(); } })]),
    el("button", { class: "primary", style: "width:100%", text: t("report"), onclick: function () { location.hash = "#/r/" + insp.id; } })]));
  if (idbFailed) kids.push(el("div", { class: "warnbox", text: t("memwarn") }));
  cl.rooms.forEach(function (room, idx) {
    var rs = st.byRoom[room.id];
    var d = el("details", { class: "card room" + (idx === 0 && openRooms[room.id] === undefined ? "" : "") });
    if (openRooms[room.id] === undefined ? idx === 0 : openRooms[room.id]) d.setAttribute("open", "");
    d.addEventListener("toggle", function () { openRooms[room.id] = d.open; });
    d.appendChild(el("summary", {}, [el("span", { text: room[db.lang] }), el("span", { class: "chip" }, [bdi(rs.done + "/" + rs.total + (rs.defects ? " ⚠" + rs.defects : ""))])]));
    room.items.forEach(function (tpl) { d.appendChild(itemRow(insp, cl, tpl)); });
    kids.push(d);
  });
  return kids;
}
function stat(n, label) { return el("div", {}, [el("b", { text: String(n) }), el("span", { text: label })]); }

function itemRow(insp, cl, tpl) {
  var it = S.itemOf(insp, tpl.id);
  function set(p) { S.setItem(insp, cl, tpl.id, p); saveDb(); render(); }
  var row = el("div", { class: "item" }, [
    el("div", { class: "lbl", text: tpl[db.lang] }),
    el("div", { class: "tr", text: D.TRADES[it.trade || tpl.trade][db.lang] }),
    el("div", { class: "seg" }, ["ok", "defect", "na"].map(function (s) {
      return el("button", { class: it.status === s ? "on-" + s : "", text: t(s), onclick: function () { set({ status: it.status === s ? "pending" : s }); } });
    }))]);
  if (it.status === "defect") {
    var fileIn = el("input", { type: "file", accept: "image/*", capture: "environment", multiple: true, style: "display:none", onchange: function () {
      var files = Array.prototype.slice.call(fileIn.files).slice(0, S.PHOTO_MAX - it.photos.length);
      files.reduce(function (p, f) { return p.then(function (ids) {
        return compress(f).then(function (url) { var id = "ph" + Date.now().toString(36) + Math.floor(Math.random() * 1e8).toString(36); return photoOp("put", id, url).then(function () { ids.push(id); return ids; }); })
          .catch(function () { return ids; }); }); }, Promise.resolve([])).then(function (ids) {
        if (ids.length) set({ photos: it.photos.concat(ids) });
      });
    } });
    var thumbs = el("div", { class: "thumbs" });
    it.photos.forEach(function (pid) {
      var img = el("img", { alt: "" }), wrap = el("div", { class: "t" }, [img, el("button", { text: "×", "aria-label": "remove", onclick: function () {
        photoOp("del", pid).then(function () { set({ photos: it.photos.filter(function (x) { return x !== pid; }) }); }); } })]);
      photoOp("get", pid).then(function (u) { if (u) img.src = u; });
      thumbs.appendChild(wrap);
    });
    var tradeSel = el("select", { onchange: function (e) { set({ trade: e.target.value === tpl.trade ? null : e.target.value }); } },
      Object.keys(D.TRADES).map(function (k) { return el("option", { value: k, text: D.TRADES[k][db.lang], selected: (it.trade || tpl.trade) === k }); }));
    row.appendChild(el("div", { class: "defect" }, [
      el("div", { class: "dim", text: t("sev") }),
      el("div", { class: "sev" }, ["minor", "major", "critical"].map(function (s) {
        return el("button", { class: "s-" + s + (it.severity === s ? " on" : ""), text: D.SEVERITIES[s][db.lang], onclick: function () { set({ severity: s }); } }); })),
      el("label", { class: "f" }, [t("trade"), tradeSel]),
      el("label", { class: "f" }, [t("note"), el("textarea", { rows: 2, maxlength: 500, text: it.note, oninput: function (e) { S.setItem(insp, cl, tpl.id, { note: e.target.value }); saveDb(); } })]),
      el("button", { class: "ghost", text: t("photo") + " (" + it.photos.length + "/" + S.PHOTO_MAX + ")", disabled: it.photos.length >= S.PHOTO_MAX, onclick: function () { fileIn.click(); } }), fileIn, thumbs]));
  }
  return row;
}

function reportView(insp) {
  var cl = S.checklistOf(insp), st = S.stats(insp, cl), v = S.verdict(st, insp.limits), pl = S.punchList(insp, cl);
  var kids = [];
  var oldTitle;
  kids.push(el("div", { class: "row noprint", style: "margin-bottom:12px" }, [
    el("button", { class: "ghost", text: "← " + t("back"), onclick: function () { location.hash = "#/i/" + insp.id; } }),
    el("button", { class: "primary", text: t("pdf"), onclick: function () { oldTitle = document.title; document.title = "snag-" + insp.meta.unit.replace(/[^\w-]+/g, "_") + "-" + (insp.meta.date || today()); window.print(); } }),
    el("button", { class: "ghost", text: t("csv"), onclick: function () { download("snag-" + insp.meta.unit.replace(/[^\w-]+/g, "_") + ".csv", S.toCsv(insp, cl, db.lang), "text/csv;charset=utf-8"); } }),
    el("button", { class: "ghost", text: t("json"), onclick: function () { download("snag-" + insp.meta.unit.replace(/[^\w-]+/g, "_") + ".json", JSON.stringify(insp, function (k, val) { return k === "photos" ? [] : val; }, 1), "application/json"); } })]));
  window.addEventListener("afterprint", function () { if (oldTitle) document.title = oldTitle; }, { once: true });
  var rep = el("div", { class: "card rep" }, [
    el("h2", { text: t("ttl") }),
    el("div", {}, [t("project") + ": ", insp.meta.project || "—", " · " + t("unit") + ": ", bdi(insp.meta.unit), " · " + t("date") + ": ", bdi(insp.meta.date || "—"), " · " + t("prepared") + ": ", insp.meta.inspector || "—"]),
    el("div", { style: "margin:10px 0" }, [chipFor(v), " ", t("progress") + " ", bdi(pct(st.progress)), " · " + t("defects") + " ", bdi(String(st.defects)), " (", t("critical") + " ", bdi(String(st.bySeverity.critical)), " / " + t("major") + " ", bdi(String(st.bySeverity.major)), " / " + t("minor") + " ", bdi(String(st.bySeverity.minor)), ")"]),
    el("h2", { text: t("punch") })]);
  if (!pl.length) rep.appendChild(el("p", { text: t("nodef") }));
  else {
    var tbl = el("table", {}, [el("tr", {}, [t("ref"), t("trade"), t("sev"), t("room"), t("item"), t("note")].map(function (h) { return el("th", { text: h }); }))]);
    pl.forEach(function (r) {
      var ph = el("div", { class: "ph" });
      r.photos.forEach(function (pid) { var img = el("img", { alt: "" }); photoOp("get", pid).then(function (u) { if (u) img.src = u; }); ph.appendChild(img); });
      tbl.appendChild(el("tr", {}, [el("td", {}, [bdi(r.ref)]), el("td", { text: D.TRADES[r.trade][db.lang] }), el("td", { text: D.SEVERITIES[r.severity][db.lang] }),
        el("td", { text: r.room[db.lang] }), el("td", { text: r.tpl[db.lang] }), el("td", {}, [r.note || "", r.photos.length ? ph : null])]));
    });
    rep.appendChild(el("div", { class: "tw" }, [tbl]));
  }
  rep.appendChild(el("p", { class: "dim", style: "margin-top:12px", text: t("disc") }));
  kids.push(rep);
  kids.push(el("div", { class: "warnbox noprint", text: t("photosNote") }));
  kids.push(el("button", { class: "danger noprint", text: t("del"), onclick: function () {
    if (!confirm(t("confirmDel"))) return;
    Object.keys(insp.items).forEach(function (id) { insp.items[id].photos.forEach(function (p) { photoOp("del", p); }); });
    db.list = db.list.filter(function (x) { return x.id !== insp.id; }); saveDb(); location.hash = "#/"; } }));
  return kids;
}

/* ---------- router ---------- */
function render() { var y = window.scrollY; route(); window.scrollTo(0, y); }
function route() {
  applyChrome();
  var h = location.hash || "#/", m, kids;
  app.textContent = "";
  if (h === "#/new") kids = newForm();
  else if ((m = /^#\/i\/([\w-]+)$/.exec(h)) && find(m[1])) kids = inspection(find(m[1]));
  else if ((m = /^#\/r\/([\w-]+)$/.exec(h)) && find(m[1])) kids = reportView(find(m[1]));
  else kids = home();
  kids.forEach(function (k) { app.appendChild(k); });
}

document.getElementById("lang").onclick = function () { db.lang = db.lang === "ar" ? "en" : "ar"; saveDb(); render(); };
document.getElementById("home").onclick = function () { location.hash = "#/"; };
window.addEventListener("hashchange", function () { window.scrollTo(0, 0); route(); });
loadDb(); route();
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(function () {});
})();
