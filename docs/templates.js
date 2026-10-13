/* Bilingual handover checklist data. Pure data + a builder; no DOM. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SnagData = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TRADES = {
    civil: { en: "Civil / structure", ar: "مدني / إنشائي" },
    paint: { en: "Paint & plaster", ar: "دهانات ولياسة" },
    floor: { en: "Flooring & tiles", ar: "أرضيات وسيراميك" },
    carp: { en: "Carpentry & doors", ar: "نجارة وأبواب" },
    alum: { en: "Aluminium & glass", ar: "ألوميتال وزجاج" },
    plumb: { en: "Plumbing", ar: "سباكة" },
    sanit: { en: "Sanitary ware", ar: "أدوات صحية" },
    elec: { en: "Electrical & low current", ar: "كهرباء وتيار خفيف" },
    hvac: { en: "AC & ventilation", ar: "تكييف وتهوية" },
    kitchen: { en: "Kitchen", ar: "مطبخ" },
    proof: { en: "Waterproofing", ar: "عزل مائي" },
    land: { en: "Landscape & external", ar: "تنسيق وخارجي" },
    other: { en: "Other", ar: "أخرى" }
  };

  var SEVERITIES = {
    minor: { en: "Minor", ar: "بسيط", rank: 1 },
    major: { en: "Major", ar: "متوسط", rank: 2 },
    critical: { en: "Critical", ar: "خطير", rank: 3 }
  };

  // item template: [key, trade, en, ar]
  var COMMON_WALLS = [
    ["walls", "paint", "Wall paint and plaster: even, no cracks or patches", "دهان ولياسة الحوائط: مستوية بدون شروخ أو رقع"],
    ["ceiling", "paint", "Ceiling finish and cornices", "تشطيب السقف والكرانيش"],
    ["floor", "floor", "Floor: level, no hollow or chipped tiles", "الأرضية: مستوية بدون بلاط مفرغ أو مكسور"],
    ["elec", "elec", "Sockets and switches work, covers straight", "البرايز والمفاتيح شغالة والأغطية معدولة"],
    ["light", "elec", "All lighting points work", "كل نقط الإنارة شغالة"]
  ];

  var ROOMS = {
    entrance: { en: "Entrance & corridor", ar: "المدخل والطرقة", items: [
      ["door", "carp", "Main door: opens, locks, aligns, no gaps", "الباب الرئيسي: بيفتح ويقفل ومعدول بدون فواصل"],
      ["bell", "elec", "Doorbell and intercom work", "الجرس والانتركم شغالين"],
      ["walls", "paint", "Wall paint and plaster", "دهان ولياسة الحوائط"],
      ["floor", "floor", "Floor tiles or marble", "بلاط/رخام الأرضية"],
      ["db", "elec", "Distribution board labelled, breakers trip test", "لوحة التوزيع مرقمة وإختبار القواطع"]
    ] },
    living: { en: "Living & reception", ar: "المعيشة والاستقبال", items: COMMON_WALLS.concat([
      ["window", "alum", "Windows open, close, lock; seals intact", "الشبابيك بتفتح وتقفل وتتأمن والجوايط سليمة"],
      ["glass", "alum", "Glass: no scratches or cracks", "الزجاج بدون خدوش أو شروخ"],
      ["ac", "hvac", "AC point, drain and pipe stub-outs", "نقطة التكييف والتصريف والمواسير"]
    ]) },
    kitchen: { en: "Kitchen", ar: "المطبخ", items: [
      ["tiles", "floor", "Wall and floor tiles: aligned, no hollow sound", "سيراميك الحوائط والأرضية معدول بدون تفريغ"],
      ["cabinets", "kitchen", "Cabinets and doors aligned, hinges smooth", "الوحدات والأبواب معدولة والمفصلات سلسة"],
      ["counter", "kitchen", "Countertop: no chips, sink sealed", "الرخامة بدون كسور والحوض متسلك"],
      ["taps", "plumb", "Taps work, no leaks under the sink", "الخلاطات شغالة ومفيش تسريب تحت الحوض"],
      ["drain", "plumb", "Drain flows freely", "الصرف بيصرف بسلاسة"],
      ["gas", "plumb", "Gas point and valve in place", "نقطة الغاز والمحبس موجودين"],
      ["hood", "hvac", "Extractor duct or exhaust point", "نقطة الشفاط أو الهود"],
      ["elec", "elec", "Sockets for appliances work", "برايز الأجهزة شغالة"]
    ] },
    laundry: { en: "Service balcony / laundry", ar: "البلكونة الخدمية / الغسيل", items: [
      ["drain", "plumb", "Floor drain and washing machine points", "صرف الأرضية ونقط الغسالة"],
      ["proof", "proof", "Waterproofing: flood test, no seepage", "العزل: اختبار غمر بدون تسريب"],
      ["tiles", "floor", "Tiles slope toward drain", "ميل السيراميك ناحية الصرف"]
    ] },
    balcony: { en: "Balcony", ar: "البلكونة", items: [
      ["rail", "alum", "Railing firm, no sharp edges", "الدرابزين ثابت بدون حواف حادة"],
      ["slope", "civil", "Floor slopes to drain, no ponding", "الأرضية بتميل للصرف بدون تجمع مياه"],
      ["door", "alum", "Balcony door track and lock", "قفل ومجرى باب البلكونة"],
      ["proof", "proof", "Waterproofing and threshold sealed", "العزل والعتبة متسلكين"]
    ] },
    services: { en: "Building services & meters", ar: "الخدمات والعدادات", items: [
      ["emeter", "elec", "Electricity meter installed and sealed", "عداد الكهرباء متركب ومختوم"],
      ["wmeter", "plumb", "Water meter and pressure OK", "عداد المياه وضغط المياه سليمين"],
      ["gmeter", "plumb", "Gas meter or riser ready", "عداد الغاز أو الرايزر جاهز"],
      ["fire", "elec", "Smoke detector and fire alarm points", "كاشف الدخان ونقط الإنذار"],
      ["telecom", "elec", "Telecom and data outlets", "مخارج التليفون والداتا"],
      ["heater", "plumb", "Water heater point and hot water supply", "نقطة السخان وتغذية الماء الساخن"]
    ] }
  };

  var VILLA_EXTRA = { en: "External & roof", ar: "الخارجي والسطح", items: [
    ["roofproof", "proof", "Roof waterproofing and slope", "عزل السطح والميول"],
    ["roofdrain", "plumb", "Roof drains clear", "مصارف السطح سليمة"],
    ["gate", "land", "Gates and boundary wall, no cracks", "البوابات والسور بدون شروخ"],
    ["garden", "land", "Garden irrigation and levels", "الري ومناسيب الحديقة"],
    ["garage", "civil", "Garage floor, drainage, door motor", "أرضية الجراج والصرف وموتور الباب"],
    ["facade", "paint", "Facade finish: even, no stains or cracks", "الواجهة: مستوية بدون بقع أو شروخ"]
  ] };

  function bedroom(n) {
    return { id: "bed" + n, en: "Bedroom " + n, ar: "غرفة نوم " + n, items: COMMON_WALLS.concat([
      ["window", "alum", "Windows open, close, lock; seals intact", "الشبابيك بتفتح وتقفل وتتأمن والجوايط سليمة"],
      ["door", "carp", "Room door aligned, lock works", "باب الغرفة معدول والقفل شغال"],
      ["ac", "hvac", "AC point, drain and pipe stub-outs", "نقطة التكييف والتصريف والمواسير"]
    ]).map(function (x) { return x.slice(); }) };
  }

  function bathroom(n) {
    return { id: "bath" + n, en: "Bathroom " + n, ar: "حمام " + n, items: [
      ["proof", "proof", "Waterproofing: flood test, no seepage below", "العزل: اختبار غمر بدون تسريب للدور اللي تحت"],
      ["tiles", "floor", "Tiles aligned, no hollow sound, grout complete", "السيراميك معدول بدون تفريغ والفواصل مكتملة"],
      ["wc", "sanit", "WC flushes, seat secure, no leak", "الكرسي بيسحب ومثبت وبدون تسريب"],
      ["basin", "sanit", "Basin secure, taps work, no leaks", "الحوض ثابت والخلاطات شغالة بدون تسريب"],
      ["shower", "plumb", "Shower: hot/cold, pressure, drain slope", "الدش: سخن/بارد والضغط وميل الصرف"],
      ["vent", "hvac", "Ventilation fan or duct works", "الشفاط أو مجرى التهوية شغال"],
      ["door", "carp", "Door aligned, lock and ventilation gap", "الباب معدول والقفل وفتحة التهوية"],
      ["elec", "elec", "Sockets, light and water-heater point", "البرايز والإنارة ونقطة السخان"]
    ] };
  }

  function clamp(n, lo, hi) { n = Math.trunc(Number(n)); if (!(n >= lo)) n = lo; return n > hi ? hi : n; }

  /* type: "apartment" | "villa". Returns {rooms:[{id,en,ar,items:[{id,trade,en,ar}]}]} */
  function buildChecklist(type, opts) {
    opts = opts || {};
    if (type !== "apartment" && type !== "villa") throw new Error("type must be apartment or villa");
    var beds = clamp(opts.bedrooms === undefined ? 2 : opts.bedrooms, 0, 8);
    var baths = clamp(opts.bathrooms === undefined ? 2 : opts.bathrooms, 0, 8);
    var rooms = [];
    function add(id, r) {
      rooms.push({ id: id, en: r.en, ar: r.ar, items: r.items.map(function (it) {
        return { id: id + "." + it[0], trade: it[1], en: it[2], ar: it[3] };
      }) });
    }
    add("entrance", ROOMS.entrance);
    add("living", ROOMS.living);
    add("kitchen", ROOMS.kitchen);
    for (var b = 1; b <= beds; b++) { var br = bedroom(b); add(br.id, br); }
    for (var t = 1; t <= baths; t++) { var bt = bathroom(t); add(bt.id, bt); }
    add("laundry", ROOMS.laundry);
    add("balcony", ROOMS.balcony);
    add("services", ROOMS.services);
    if (type === "villa") add("external", VILLA_EXTRA);
    return { type: type, rooms: rooms };
  }

  return { TRADES: TRADES, SEVERITIES: SEVERITIES, buildChecklist: buildChecklist };
});
