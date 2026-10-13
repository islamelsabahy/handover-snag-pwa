# handover-snag-pwa

[![CI](https://github.com/islamelsabahy/handover-snag-pwa/actions/workflows/ci.yml/badge.svg)](https://github.com/islamelsabahy/handover-snag-pwa/actions/workflows/ci.yml)

**EN** — A phone-first, offline tool for the handover inspection of an apartment or villa. Pick the unit type and the number of bedrooms and bathrooms; it generates the checklist (finishes, doors and windows, plumbing and waterproofing, electrical, AC, balconies, meters). Mark each item OK / defect / N/A, and for a defect set severity and trade, add a note and photos. It gives a verdict (ready, accept with punch list, or do not accept), a **contractor punch list grouped by trade**, and a bilingual print-to-PDF report with the photos. No server, no sign-up: data and photos stay on the device. Live page: `docs/index.html` (GitHub Pages from `/docs`).

**AR** — تطبيق للموبايل بيشتغل أوفلاين لفحص استلام الوحدة (شقة أو فيلا). بتختار النوع وعدد الغرف والحمامات فيطلعلك الـ checklist (تشطيبات، أبواب وشبابيك، سباكة وعزل، كهرباء، تكييف، بلكونات، عدادات). بتعلّم كل بند سليم / عيب / لا ينطبق، وللعيب بتحدد الخطورة والحرفة وتكتب ملاحظة وتصوّر. وبيطلعلك قرار (جاهزة، استلام بقائمة عيوب، أو لا تستلم)، وقائمة عيوب للمقاول مجمعة بالحرفة، وتقرير PDF بالعربي والإنجليزي بالصور. من غير سيرفر ولا تسجيل: البيانات والصور على جهازك بس.

> **An aid, not a certificate.** It records what an inspector sees; it is not an engineering or legal handover certificate. Check your contract and local rules for what counts as acceptable defects and the snagging period. The checklist is generic: edit `docs/templates.js` for your own standards.
>
> **أداة مساعدة وليست شهادة.** بتسجل اللي الفاحص شافه، ومش شهادة هندسية ولا قانونية. راجع العقد والقواعد المحلية في تعريف العيوب المقبولة وفترة الضمان. القائمة عامة وتتعدل من `docs/templates.js`.

## How the verdict works

| Verdict | Rule |
|---|---|
| Incomplete | at least one item still pending |
| Rejected | any **critical** defect, or more **major** defects than your limit (default 3, editable per inspection) |
| Accept with punch list | any remaining defects below those thresholds |
| Ready | every item OK or N/A, no defects |

## Run it

Open `docs/index.html` through any static server (the service worker needs `http(s)`), or serve `docs/` with GitHub Pages. Add to the home screen from the browser menu for an app-like, offline experience.

```bash
cd docs && python3 -m http.server 8000     # then open http://localhost:8000
node tests/test_snag.js                    # logic tests (no browser needed)
```

## Design notes

* Logic (`snag.js`) and data (`templates.js`) have no DOM or storage dependency, so they are unit-tested in Node. The UI builds DOM with `textContent` only (no `innerHTML`), because notes and imported files are untrusted.
* Photos are resized to 1280px JPEG and kept in IndexedDB; the checklist and notes are in `localStorage`. If photo storage is unavailable the app says so and keeps photos in memory until the page closes.
* CSV export neutralises cells that start with `= + - @` so a note cannot become a spreadsheet formula. JSON backups hold the checklist and notes but **not** photos; the PDF carries the photos. Imported JSON is validated and unknown fields are dropped.
* Never put real customer data in a public fork. This repo ships no data.

## License

MIT
