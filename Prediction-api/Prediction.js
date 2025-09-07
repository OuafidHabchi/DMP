const express = require("express");
const router = express.Router();
const getDatabaseConnection = require("../utils/database");
const getDynamicModel = require("../utils/dynamicModel");

// PDF & GridFS
const PDFDocument = require("pdfkit");
const { GridFSBucket, ObjectId } = require("mongodb");
const { Readable } = require("stream");

/* =========================
 * Helpers robustes
 * ========================= */

// Map jour
const DOW_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DOW_SHORT = { Sun: "sunday", Mon: "monday", Tue: "tuesday", Wed: "wednesday", Thu: "thursday", Fri: "friday", Sat: "saturday" };
const DOW_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

// 🔒 DayKey robuste à la timezone et formats “Tue Sep 02 2025”
const safeDayKey = (dateStr) => {
  if (typeof dateStr === "string" && DOW_SHORT[dateStr.slice(0, 3)]) return DOW_SHORT[dateStr.slice(0, 3)];
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return DOW_KEYS[d.getUTCDay()]; // UTC pour éviter les glissements
  return DOW_SHORT[(dateStr || "").slice(0, 3)] || "sunday";
};

// HH:MM -> minutes
const parseHHMM = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map((x) => parseInt(x, 10));
  if ([h, m].some(Number.isNaN)) return null;
  return h * 60 + m;
};

// Durée shift, gère overnight + pause 0.5h si > 5h
const computeShiftDuration = (starttime, endtime) => {
  const s = parseHHMM(starttime), e = parseHHMM(endtime);
  if (s == null || e == null) return 0;
  let end = e <= s ? e + 24 * 60 : e;
  let dur = (end - s) / 60;
  if (dur > 5) dur -= 0.5;
  return Math.max(0, dur);
};

// Heures timecard avec pause si > 5h (overnight ok)
const computeWorkedHours = (startTime, endTime) => {
  const s = parseHHMM(startTime), e = parseHHMM(endTime);
  if (s == null || e == null) return 0;
  let end = e <= s ? e + 24 * 60 : e;
  let hours = (end - s) / 60;
  if (hours > 5) hours -= 0.5;
  return Math.max(0, hours);
};

// Convertit un (jour, HH:MM) en minutes absolues de la semaine [0..10080)
const toAbsMinutes = (dateStr, hhmm) => {
  const base = DOW_INDEX[safeDayKey(dateStr)] * 24 * 60;
  const m = parseHHMM(hhmm);
  return base + (m || 0);
};

// Construit un intervalle absolu [startMin, endMin) pour un shift (gère overnight)
const buildAbsInterval = (dateStr, starttime, endtime) => {
  const start = toAbsMinutes(dateStr, starttime);
  let end = toAbsMinutes(dateStr, endtime);
  if (end <= start) end += 24 * 60; // overnight
  return { start, end };
};

// Respect repos minimal (en minutes) vs la liste d’intervalles existants
const respectsMinRest = (intervals, candidate, minRestMinutes) => {
  if (!Array.isArray(intervals) || intervals.length === 0) return true;
  for (const itv of intervals) {
    // Conflit direct
    const overlap = !(candidate.end <= itv.start || candidate.start >= itv.end);
    if (overlap) return false;
    // Repos avant / après
    const restBefore = candidate.start >= itv.end ? (candidate.start - itv.end) : Infinity;
    const restAfter = itv.start >= candidate.end ? (itv.start - candidate.end) : Infinity;
    if (restBefore < minRestMinutes || restAfter < minRestMinutes) return false;
  }
  return true;
};

// Calcule si ajouter dayIdx dépasserait une limite de jours consécutifs
const wouldViolateConsecutiveDays = (currentSet, dayIdx, maxConsecutive) => {
  if (!Number.isFinite(maxConsecutive) || maxConsecutive <= 0) return false; // pas de limite
  const s = new Set(currentSet);
  s.add(dayIdx);
  const arr = Array.from(s).sort((a, b) => a - b);
  let best = 1, run = 1;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] + 1) { run++; best = Math.max(best, run); }
    else { run = 1; }
  }
  // Wrap samedi->dimanche
  if (arr[0] === 0 && arr[arr.length - 1] === 6) {
    let head = 1;
    for (let i = 1; i < arr.length; i++) if (arr[i] === arr[i - 1] + 1) head++; else break;
    let tail = 1;
    for (let i = arr.length - 2; i >= 0; i--) if (arr[i] === arr[i + 1] - 1) tail++; else break;
    best = Math.max(best, head + tail);
  }
  return best > maxConsecutive;
};

// ✅ Dispos hebdo directement depuis Employee.schedule
const getEmployeeScheduleMap = async (connection) => {
  const Employee = getDynamicModel(
    connection,
    "Employee",
    require("../Employes-api/models/Employee")
  );

  // On récupère uniquement _id + schedule
  const employees = await Employee.find().select("_id schedule").lean();
  const map = {};
  for (const e of employees) {
    const s = (e && e.schedule) || null; // peut être nul si pas de schedule
    map[String(e._id)] = s
      ? {
        monday: !!s.monday,
        tuesday: !!s.tuesday,
        wednesday: !!s.wednesday,
        thursday: !!s.thursday,
        friday: !!s.friday,
        saturday: !!s.saturday,
        sunday: !!s.sunday,
      }
      : null; // null = pas de dispo définie
  }
  return map;
};


// Détails shift → dictionnaire
const buildShiftDetails = (shifts) => {
  const details = {};
  for (const s of shifts) {
    details[String(s._id)] = {
      name: s.name,
      color: s.color,
      starttime: s.starttime,
      endtime: s.endtime,
      visible: s.visible !== false,
      duration: computeShiftDuration(s.starttime, s.endtime)
    };
  }
  return details;
};

// Tri multi-critères configurable
const makeCandidateSorter = (opts) => {
  const {
    hoursWorkedMap,
    scorePriority,
    lowPerfSet,
    rookieBonusMap,      // empIdStr -> bonus (négatif = favorisé)
    stableTieBreakerMap  // empIdStr -> valeur stable (ex: hash/id)
  } = opts;
  return (a, b) => {
    const ida = String(a._id), idb = String(b._id);

    // 1) Score card (plus petit = mieux)
    const pa = scorePriority[a.scoreCard] || 999;
    const pb = scorePriority[b.scoreCard] || 999;
    if (pa !== pb) return pa - pb;

    // 2) Rookie bonus (optionnel)
    const ra = rookieBonusMap?.[ida] ?? 0;
    const rb = rookieBonusMap?.[idb] ?? 0;
    if (ra !== rb) return ra - rb;

    // 3) Heures cumulées (moins d’heures = mieux)
    const ha = hoursWorkedMap[ida] || 0;
    const hb = hoursWorkedMap[idb] || 0;
    if (ha !== hb) return ha - hb;

    // 4) Low perf en dernier
    const la = lowPerfSet?.has(ida) ? 1 : 0;
    const lb = lowPerfSet?.has(idb) ? 1 : 0;
    if (la !== lb) return la - lb;

    // 5) Tiebreaker stable: id
    const ta = stableTieBreakerMap?.[ida] ?? ida;
    const tb = stableTieBreakerMap?.[idb] ?? idb;
    return String(ta).localeCompare(String(tb));
  };
};

// Raison codes pour audit
const REASONS = {
  NO_NEED: "no_need_to_fill",
  SHIFT_INVISIBLE: "shift_invisible",
  ALREADY_ASSIGNED_TODAY: "already_assigned_today",
  WEEKLY_AV_NOT_TRUE: "weekly_av_not_true",
  WEEKLY_AV_NULL_PHASE: "weekly_av_null_required",
  WEEKLY_AV_FALSE_PHASE: "weekly_av_false_required",
  LOW_PERF_STRICT: "low_performance_strict",
  EXCEED_MAX_HOURS: "exceed_max_hours",
  EXCEED_MAX_HOURS_LAST_RESORT: "exceed_max_hours_even_last_resort",
  EXCEED_MAX_SHIFTS: "exceed_max_shifts",
  MIN_REST_VIOLATION: "min_rest_violation",
  CONSECUTIVE_LIMIT: "consecutive_days_limit",
  OK_SELECTED: "selected"
};

// Nom d’affichage employé
// Nom d’affichage employé — priorité à name + familyName
const employeeDisplayName = (emp = {}) => {
  const first = (emp.name || emp.firstName || "").toString().trim();
  const last = (emp.familyName || emp.lastName || "").toString().trim();
  const joined = `${first} ${last}`.trim();
  if (joined) return joined;
  if (emp.email) return String(emp.email);
  return String(emp._id || "");
};



const buildDecisionPdf = async ({
  dsp_code, weekRange, SMART_MODE, USE_WEEKLY_AV,
  MAX_HOURS, MAX_SHIFTS, MIN_REST_HOURS,
  requestedDates,
  shiftIdsNeededCount = 0, employeesCount = 0, proposedCount = 0, insertedCount = 0,
  missingShifts = {},
  auditPhases = [],
  shiftDetails = {}
}) => {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on("end", resolve));

  // ===== Palette & helpers visuels
  const C = {
    text: "#111111",
    faint: "#6b7280",
    line: "#e5e7eb",
    header: "#0f172a",
    kpiBg: "#f3f4f6",
    ok: "#15803d",
    warn: "#b45309",
    danger: "#b91c1c",
    hours: "#d97706",  // heures/caps
    rest: "#7c3aed",   // repos
    weekly: "#2563eb", // weekly availability
    perf: "#dc2626",   // performance
    dup: "#6b7280",    // déjà assigné
    consec: "#7f1d1d", // jours consécutifs
  };

  const ensureRoom = (min = 28) => {
    if (doc.y + min > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };
  const H1 = (title, sub) => {
    doc.fillColor(C.header).fontSize(20).text(title, { align: "center" }).moveDown(0.2);
    if (sub) doc.fillColor(C.faint).fontSize(10).text(sub, { align: "center" }).moveDown(0.2);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(C.line).lineWidth(1).stroke();
    doc.moveDown(0.6);
  };
  const H2 = (t) => { ensureRoom(36); doc.fillColor(C.text).fontSize(13).text(t, { underline: true }); doc.moveDown(0.2); };
  const H3 = (t) => { ensureRoom(22); doc.fillColor(C.text).fontSize(12).text(t); };
  const P = (t) => doc.fillColor(C.text).fontSize(11).text(t);
  const Small = (t) => doc.fillColor(C.faint).fontSize(9).text(t);

  // ===== Footer & header sûrs (pas de recursion)
  let pageNo = 1;
  const renderFooter = () => {
    const savedY = doc.y; doc.save();
    const y = doc.page.height - doc.page.margins.bottom - 10;
    doc.fontSize(8).fillColor(C.faint)
      .text(`Page ${pageNo}`, doc.page.margins.left, y, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "center"
      });
    doc.restore(); doc.y = savedY; pageNo++;
  };
  const renderRunningHeader = () => {
    const savedY = doc.y; doc.save();
    const y = doc.page.margins.top - 24;
    doc.fontSize(8).fillColor(C.faint)
      .text(`Semaine: ${weekRange.start} → ${weekRange.end} • Mode: ${SMART_MODE ? "SMART" : "STRICT"} • AV: ${USE_WEEKLY_AV ? "ON" : "OFF"}`,
        doc.page.margins.left, y, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "center"
      });
    doc.restore(); doc.y = savedY;
  };
  renderFooter(); renderRunningHeader();
  doc.on("pageAdded", () => { renderFooter(); renderRunningHeader(); });

  // ===== Table compacte (3 colonnes)
  const table = (headers, rows, opts = {}) => {
    const x0 = doc.page.margins.left;
    const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rowH = opts.rowHeight || 18, headerH = opts.headerHeight || 20;
    const colPerc = opts.colPerc || headers.map(() => 1 / headers.length);
    const padX = 6;
    const colW = colPerc.map(p => Math.max(36, Math.floor(usable * p)));
    const painter = typeof opts.cellPainter === "function" ? opts.cellPainter : null;

    ensureRoom(headerH + 4);

    let y = doc.y;
    // header
    doc.rect(x0, y, usable, headerH).fill(C.kpiBg);
    doc.fillColor(C.text).fontSize(10);
    let x = x0;
    headers.forEach((h, i) => {
      doc.text(h, x + padX, y + 4, { width: colW[i] - padX * 2, ellipsis: true });
      x += colW[i];
    });
    y += headerH;

    // rows
    for (const r of rows) {
      if (y + rowH > doc.page.height - doc.page.margins.bottom) {
        doc.addPage(); y = doc.y;
        // redraw header
        doc.rect(x0, y, usable, headerH).fill(C.kpiBg);
        doc.fillColor(C.text).fontSize(10);
        x = x0;
        headers.forEach((h, i) => {
          doc.text(h, x + padX, y + 4, { width: colW[i] - padX * 2, ellipsis: true });
          x += colW[i];
        });
        y += headerH;
      }
      // separator
      doc.moveTo(x0, y).lineTo(x0 + usable, y).strokeColor(C.line).lineWidth(0.5).stroke();

      x = x0;
      for (let i = 0; i < r.length; i++) {
        if (painter) painter({ colIndex: i, row: r, x, y, width: colW[i], height: rowH, doc });
        doc.fillColor(C.text).fontSize(10)
          .text(String(r[i] ?? ""), x + padX, y + 3, { width: colW[i] - padX * 2, ellipsis: true });
        x += colW[i];
      }
      y += rowH;
    }
    doc.moveDown(0.4);
  };

  // ===== Utils métier
  const yesNo = (b) => (b ? "ON" : "OFF");
  const shiftStartMin = (sid) => {
    const sd = shiftDetails[String(sid)] || {};
    const [h, m] = (sd.starttime || "").split(":").map(x => parseInt(x, 10));
    if (isNaN(h) || isNaN(m)) return 99999;
    return h * 60 + m;
  };
  const getShiftDisplay = (sid) => {
    const sd = shiftDetails[String(sid)] || {};
    const title = sd.name || String(sid);
    const time = (sd.starttime && sd.endtime) ? `${sd.starttime}–${sd.endtime}` : "—";
    return time !== "—" ? `${title} (${time})` : title;
  };

  // Raison → version courte FR
  const shortReason = (label) => {
    const t = String(label || "").toLowerCase();
    if (t.includes("exceeds weekly hours")) return "Heures max dépassées";
    if (t.includes("last-resort")) return "Heures (dépassement contrôlé)";
    if (t.includes("minimum rest")) return "Repos insuffisant";
    if (t.includes("weekly availability")) return "Indispo hebdo";
    if (t.includes("low performance")) return "Perf faible";
    if (t.includes("already assigned")) return "Déjà assigné";
    if (t.includes("consecutive days")) return "Trop de jours consécutifs";
    if (t.includes("shift not visible")) return "Shift non visible";
    if (t.includes("no need to fill")) return "Pas besoin";
    return label;
  };
  // Couleur par catégorie (gère FR/EN)
  const colorForReason = (txt) => {
    const t = String(txt || "").toLowerCase();
    if (t.includes("heure") || t.includes("hours")) return C.hours;
    if (t.includes("repos") || t.includes("rest")) return C.rest;
    if (t.includes("hebdo") || t.includes("weekly")) return C.weekly;
    if (t.includes("perf") || t.includes("low performance")) return C.perf;
    if (t.includes("assigné") || t.includes("already assigned")) return C.dup;
    if (t.includes("consécutif") || t.includes("consecutive")) return C.consec;
    return C.text;
  };
  const splitNameAndMeta = (s) => {
    const m = /^(.+?)(?:\s\((.+)\))?$/.exec(String(s || "").trim());
    return { name: (m && m[1]) ? m[1].trim() : String(s || "").trim(), meta: (m && m[2]) ? m[2].trim() : "" };
  };

  // ===== Agrégation depuis auditPhases
  const keyDS = (day, sid) => `${day}::${String(sid)}`;
  const chosenByDayShift = {};           // dayShift -> Set(names)
  const refusByDayShift = {};            // dayShift -> Map(name -> Set(reasonsCourtes))
  for (const ap of auditPhases || []) {
    const k = keyDS(ap.day, ap.shiftId);
    (chosenByDayShift[k] ||= new Set());
    for (const n of (ap.chosen || [])) chosenByDayShift[k].add(n);

    const rej = ap.rejectionsByReason || {};
    for (const labelKey of Object.keys(rej)) {
      const human = labelKey.split("::")[1] || labelKey;
      const short = shortReason(human);
      for (const raw of (rej[labelKey] || [])) {
        const { name, meta } = splitNameAndMeta(raw);
        const reasonTxt = meta ? `${short} — ${meta}` : short;
        const map = (refusByDayShift[k] ||= new Map());
        const set = map.get(name) || new Set();
        set.add(reasonTxt);
        map.set(name, set);
      }
    }
  }

  // ===== Page de garde (KPI simples)
  const totalMissing = Object.values(missingShifts).flat()
    .reduce((s, r) => s + Math.max(0, Number(r.missing || 0)), 0);
  const sub = `DSP: ${dsp_code} • Jours: ${requestedDates.length} • Types de shift: ${shiftIdsNeededCount}`;
  H1("Planification hebdomadaire — Synthèse", sub);
  P(`Règles: Heures max ${MAX_HOURS}h • Shifts max ${MAX_SHIFTS} • Repos min ${MIN_REST_HOURS}h • AV: ${yesNo(USE_WEEKLY_AV)} • Mode: ${SMART_MODE ? "SMART" : "STRICT"}`);
  doc.moveDown(0.35);
  const kpiRows = [
    ["Employés", String(employeesCount)],
    ["Assignments proposés", String(proposedCount)],
    ["Assignments écrits", String(insertedCount)],
    ["Manques semaine", totalMissing > 0 ? String(totalMissing) : "0"],
  ];
  // KPI 2 colonnes
  table(["KPI", "Valeur"], kpiRows, {
    colPerc: [0.60, 0.40], rowHeight: 20, headerHeight: 22, cellPainter: ({ colIndex, row }) => {
      if (row[0] === "Manques semaine" && colIndex === 1) doc.fillColor(totalMissing > 0 ? C.danger : C.ok);
    }
  });
  doc.moveDown(0.2);
  Small("Lecture : par jour, chaque shift liste tous les employés avec leur statut (assigné/refusé) et, le cas échéant, la raison courte.");

  // ===== Par JOUR → par SHIFT
  const days = [...requestedDates];
  for (const day of days) {
    H2(day);

    // shifts vus ce jour (assignés OU refusés OU manques)
    const seen = new Set();
    for (const ap of auditPhases || []) if (ap.day === day) seen.add(String(ap.shiftId));
    // ajoute aussi ceux avec “missing”
    for (const row of (missingShifts[day] || [])) seen.add(String(row.shiftId));
    const shiftIds = Array.from(seen).sort((a, b) => shiftStartMin(a) - shiftStartMin(b));

    if (!shiftIds.length) { P("Aucune activité enregistrée pour ce jour."); continue; }

    for (const sid of shiftIds) {
      // chiffres du shift
      const k = keyDS(day, sid);
      const acceptedNames = Array.from(chosenByDayShift[k] || []);
      const refusMap = refusByDayShift[k] || new Map();
      const refusCount = Array.from(refusMap.values()).reduce((s, set) => s + set.size, 0);

      // couverture (si connue via missingShifts)
      let coverageTxt = "";
      const missRow = (missingShifts?.[day] || []).find(r => String(r.shiftId) === String(sid));
      if (missRow) {
        coverageTxt = ` • Besoin: ${missRow.needed} • Remplis: ${missRow.accepted} • Manque: ${missRow.missing}`;
      }

      // Header shift (carton)
      H3(`• ${getShiftDisplay(sid)} — Assignés: ${acceptedNames.length} • Refus: ${refusCount}${coverageTxt}`);

      // Construire lignes: Employé | Statut | Raison
      // Regroupe refus par employé (raison1 • raison2). Si quelqu’un est assigné & refusé, on garde "Assigné".
      const rows = [];
      const assignedSet = new Set(acceptedNames);
      // Assignés
      acceptedNames.sort((a, b) => a.localeCompare(b)).forEach(nm => rows.push([nm, "Assigné", ""]));
      // Refusés
      const refusedEmployees = Array.from(refusMap.keys()).filter(nm => !assignedSet.has(nm)).sort((a, b) => a.localeCompare(b));
      for (const nm of refusedEmployees) {
        const reasons = Array.from(refusMap.get(nm) || []);
        // garder 2 raisons + "+n"
        const shown = reasons.slice(0, 2).join(" • ");
        const more = reasons.length > 2 ? ` (+${reasons.length - 2})` : "";
        rows.push([nm, "Refusé", `${shown}${more}`]);
      }

      if (rows.length) {
        table(["Employé", "Statut", "Raison"], rows, {
          colPerc: [0.46, 0.18, 0.36],
          rowHeight: 20, headerHeight: 22,
          cellPainter: ({ colIndex, row }) => {
            if (colIndex === 1) doc.fillColor(row[1] === "Assigné" ? C.ok : C.danger);
            if (colIndex === 2 && row[2]) doc.fillColor(colorForReason(row[2]));
          }
        });
      } else {
        P("Aucun employé assigné ou refusé pour ce shift.");
      }
    }
  }

  // ===== Légende mini
  doc.moveDown(0.2);
  Small("Codes couleur : Heures (orange) • Repos (violet) • AV hebdo (bleu) • Performance (rouge) • Déjà assigné (gris) • Jours consécutifs (bordeaux).");

  doc.end();
  await done;
  return Buffer.concat(chunks);
};







// Upload Buffer -> GridFS (retourne fileId)
const uploadPdfToGridFS = async (connection, buffer, filename, metadata = {}) => {
  const bucket = new GridFSBucket(connection.db, { bucketName: "reports" });
  const readStream = Readable.from(buffer);
  const uploadStream = bucket.openUploadStream(filename, { metadata });
  return await new Promise((resolve, reject) => {
    readStream.pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => resolve(uploadStream.id));
  });
};

/* =========================
 * Route téléchargement du rapport
 * ========================= */

// GET /api/prediction/predict-shifts/report/:id?dsp_code=XXX
router.get("/predict-shifts/report/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { dsp_code } = req.query;
    if (!dsp_code) return res.status(400).json({ message: "Missing dsp_code" });
    if (!id || !ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid file id" });

    const connection = await getDatabaseConnection(dsp_code);
    const bucket = new GridFSBucket(connection.db, { bucketName: "reports" });

    const filesCol = connection.db.collection("reports.files");
    const file = await filesCol.findOne({ _id: new ObjectId(id) });
    if (!file) return res.status(404).json({ message: "Report not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename || `report-${id}.pdf`}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    bucket.openDownloadStream(new ObjectId(id))
      .on("error", (e) => { console.error("[report] stream error:", e); res.status(500).end(); })
      .pipe(res);
  } catch (e) {
    console.error("[report] error:", e);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* =========================
 * Route principale
 * ========================= */

router.post("/predict-shifts", async (req, res) => {
  try {
    const {
      dsp_code,
      weekRange,                    // { start: "Sun Sep 07 2025", end: "Sat Sep 13 2025" }
      requiredShiftsPerDay,         // { [dateStr]: { [shiftId]: { needed, extra } } }
      optimization,                 // compat
      simulate = false,             // si true: ne rien écrire
      writePolicy = "fill-only",    // "fill-only" | "refresh-unpublished" | "append"
      constraints = {},             // { ... }
      mode,                         // "strict" | "smart"
      report = true                 // true => génère & uploade le PDF
    } = req.body || {};

    // Validation
    if (!dsp_code || !weekRange || !requiredShiftsPerDay || typeof requiredShiftsPerDay !== "object") {
      return res.status(400).json({ message: "❌ Missing/invalid parameters (dsp_code, weekRange, requiredShiftsPerDay)." });
    }

    // Paramètres principaux
    const MAX_HOURS = Number(constraints.maxHours ?? 40);
    const MAX_SHIFTS = Number(constraints.maxShifts ?? 5);
    const MIN_REST_HOURS = Number(constraints.minRestHours ?? 10);
    const USE_WEEKLY_AV = constraints.useWeeklyAvailOnly !== false; // true par défaut
    const SMART_MODE = (mode === "smart") || (!!optimization);

    // Paramètres avancés
    const MIN_CARDS_FOR_PERF = Number(constraints.minCardsForPerf ?? 5);
    const CORTEX_FALLBACK_MARGIN = Number(constraints.cortexFallbackMargin ?? 1);
    const MAX_CONSECUTIVE_DAYS = Number.isFinite(constraints.maxConsecutiveDays) ? Number(constraints.maxConsecutiveDays) : 0;
    const ROOKIE_QUOTA_PER_WEEK = Number(constraints.rookieQuotaPerWeek ?? 0);
    const PREFER_ROOKIES_TIES = Boolean(constraints.preferRookiesWhenTies ?? false);
    const LAST_RESORT_OVERAGE_PCT = Number(constraints.lastResortOveragePct ?? 0);
    const ALLOW_WEEKLY_FALSE_LAST = Boolean(constraints.allowWeeklyFalseLastResort ?? false);

    const MIN_REST_MIN = Math.max(0, MIN_REST_HOURS * 60);

    // Connexions + modèles
    const connection = await getDatabaseConnection(dsp_code);
    const Disponibilite = getDynamicModel(connection, "Disponibilite", require("../Disponibiltes-api/models/disponibilite"));
    const Employee = getDynamicModel(connection, "Employee", require("../Employes-api/models/Employee"));
    const Shift = getDynamicModel(connection, "Shift", require("../Shifts-api/models/shift"));
    const TimeCard = getDynamicModel(connection, "TimeCard", require("../TimeCard-api/models/TimeCard"));

    // 1) Dates demandées
    const requestedDates = Object.keys(requiredShiftsPerDay || {});
    if (requestedDates.length === 0) {
      return res.status(200).json({ message: "No dates requested.", predictions: [], missingShifts: {} });
    }

    // 2) Shifts utilisés
    const shiftIdsNeeded = Array.from(new Set(
      requestedDates.flatMap(d => Object.keys(requiredShiftsPerDay[d] || {}))
    ));
    const shifts = await Shift.find({ _id: { $in: shiftIdsNeeded } }).lean();
    const shiftDetails = buildShiftDetails(shifts);

    // 3) Employés + AV approuvée + noms
    const employees = await Employee.find().lean();
    const weeklyAvailMap = await getEmployeeScheduleMap(connection);
    const empName = {};
    for (const emp of employees) empName[String(emp._id)] = employeeDisplayName(emp);

    // 4) Assignations existantes (publiées & brouillons)
    const existing = await Disponibilite.find({ selectedDay: { $in: requestedDates } }).lean();

    const assignedByEmpDay = new Set(existing.map(d => `${String(d.employeeId)}::${d.selectedDay}`));
    const alreadyAssignedCount = {};
    for (const disp of existing) {
      const k = `${disp.selectedDay}::${String(disp.shiftId)}`;
      alreadyAssignedCount[k] = (alreadyAssignedCount[k] || 0) + 1;
    }

    // 5) Heures TimeCards + charge existante + intervalles + jours déjà affectés
    const timeCards = await TimeCard.find({
      day: { $gte: weekRange.start, $lte: weekRange.end }
    }).lean();

    const hoursWorked = {};         // { empIdStr: totalHours }
    const shiftsCount = {};         // { empIdStr: count }
    const intervalsByEmp = {};      // { empIdStr: [{start,end}] }
    const daysByEmp = {};           // { empIdStr: Set(dayIdx) }
    const pushInterval = (empIdStr, itv) => {
      (intervalsByEmp[empIdStr] ||= []).push(itv);
    };
    const addDayForEmp = (empIdStr, dayStr) => {
      const idx = DOW_INDEX[safeDayKey(dayStr)];
      (daysByEmp[empIdStr] ||= new Set()).add(idx);
    };

    for (const tc of timeCards) {
      const h = computeWorkedHours(tc.startTime, tc.endTime);
      const id = String(tc.employeeId);
      hoursWorked[id] = (hoursWorked[id] || 0) + h;
      shiftsCount[id] = (shiftsCount[id] || 0) + 1;
      pushInterval(id, buildAbsInterval(tc.day, tc.startTime, tc.endTime));
      addDayForEmp(id, tc.day);
    }

    for (const disp of existing) {
      const id = String(disp.employeeId);
      const s = shiftDetails[String(disp.shiftId)];
      const dur = s ? s.duration : 0;
      hoursWorked[id] = (hoursWorked[id] || 0) + dur;
      shiftsCount[id] = (shiftsCount[id] || 0) + 1;
      if (s) pushInterval(id, buildAbsInterval(disp.selectedDay, s.starttime, s.endtime));
      addDayForEmp(id, disp.selectedDay);
    }

    // 6) Performance (Cortex)
    const MIN_CARDS_FOR_PERF_LOCAL = MIN_CARDS_FOR_PERF;
    const CORTEX_FALLBACK_MARGIN_LOCAL = CORTEX_FALLBACK_MARGIN;

    const employeePerformance = {}; // { empIdStr: { isLowPerformance, overrunPercentage, sample } }
    const empIdsStr = employees.map(e => String(e._id));
    for (const empId of empIdsStr) {
      const lastTimeCards = await TimeCard.find({ employeeId: empId }).sort({ day: -1 }).limit(10).lean();
      let overLimitCount = 0;
      const totalCount = lastTimeCards.length;

      if (totalCount === 0 || totalCount < MIN_CARDS_FOR_PERF_LOCAL) {
        employeePerformance[empId] = { isLowPerformance: false, overrunPercentage: "0.00", sample: totalCount };
        continue;
      }
      for (const tc of lastTimeCards) {
        const worked = computeWorkedHours(tc.startTime, tc.endTime);
        const cdx = parseFloat(tc.CortexDuree);
        const base = Number.isFinite(cdx) ? cdx : 0;
        const cortexLimit = base > 5 ? base + 1 : (base || CORTEX_FALLBACK_MARGIN_LOCAL);
        if (Number.isFinite(cortexLimit) && worked > cortexLimit) overLimitCount++;
      }
      const threshold = totalCount >= 10 ? 0.6 : 0.4;
      const ratio = totalCount ? (overLimitCount / totalCount) : 0;
      employeePerformance[empId] = {
        isLowPerformance: ratio > threshold,
        overrunPercentage: (ratio * 100).toFixed(2),
        sample: totalCount
      };
    }

    // 7) Priorité score & rookies
    const scorePriority = { Fantastic: 1, Great: 2, Fair: 3, Poor: 4, "New DA": 5 };
    const isRookie = (emp) => emp?.scoreCard === "New DA";
    const rookieAssignedCounts = {};
    for (const e of employees) {
      const id = String(e._id);
      rookieAssignedCounts[id] = (isRookie(e) ? (shiftsCount[id] || 0) : 0);
    }

    // 8) Plan proposé + audit pour PDF
    const proposedAssignments = []; // { employeeId, selectedDay, shiftId, publish:false }
    const planAssignedByEmpDay = new Set();
    const stableTieBreakerMap = {};
    for (const e of employees) stableTieBreakerMap[String(e._id)] = String(e._id);

    // auditPhases : { day, shiftId, shiftName, phase, chosen: [names], rejectionsByReason: { "code::label": ["Name", ...] } }
    const auditPhases = [];

    // Collecteur de rejets par raison (stocke NOMS)
    const makeReasonCollector = () => {
      const byReason = {};
      return {
        push: (reasonCode, empIdStr, meta = {}) => {
          const labelMap = {
            no_need_to_fill: "No need to fill",
            shift_invisible: "Shift not visible / invalid",
            already_assigned_today: "Already assigned that day",
            weekly_av_not_true: "Weekly availability not TRUE (phase requires TRUE)",
            weekly_av_null_required: "Weekly availability is NULL (phase requires NULL)",
            weekly_av_false_required: "Weekly availability is FALSE (allowed in this phase)",
            low_performance_strict: "Low performance (strict mode)",
            exceed_max_hours: "Exceeds weekly hours cap",
            exceed_max_hours_even_last_resort: "Exceeds last-resort hours cap",
            exceed_max_shifts: "Exceeds weekly shifts cap",
            min_rest_violation: "Minimum rest not met",
            consecutive_days_limit: "Consecutive days limit",
            selected: "Selected"
          };

          const label = labelMap[reasonCode] || reasonCode;
          const key = `${reasonCode}::${label}`;
          if (!byReason[key]) byReason[key] = [];
          const name = empName[empIdStr] || empIdStr;

          let suffix = "";
          if (meta?.overrunPct) suffix = ` (overrun ${meta.overrunPct}%)`;
          if (meta?.futureHours != null) suffix = ` (${Number(meta.futureHours).toFixed ? Number(meta.futureHours).toFixed(2) : meta.futureHours}h)`;
          if (meta?.futureShifts != null) suffix = ` (${meta.futureShifts} shifts)`;
          if (meta?.weeklyFlag !== undefined) suffix = ` (flag: ${meta.weeklyFlag === true ? "TRUE" : meta.weeklyFlag === false ? "FALSE" : "NULL"})`;
          if (meta?.cap != null) suffix += ` / cap:${meta.cap}`;

          byReason[key].push(`${name}${suffix}`);
        },
        dump: () => byReason
      };
    };

    // 9) Remplissage (phases + last resort)
    for (const day of requestedDates) {
      const daySpec = requiredShiftsPerDay[day] || {};
      const wkKey = safeDayKey(day);
      const dayIdx = DOW_INDEX[wkKey];

      for (const shiftId of Object.keys(daySpec)) {
        const need = Math.max(0, Number(daySpec[shiftId]?.needed || 0));
        const extra = Math.max(0, Number(daySpec[shiftId]?.extra || 0));
        const maxEmployees = need + extra;

        const baseKey = `${day}::${String(shiftId)}`;
        const already = alreadyAssignedCount[baseKey] || 0;
        let toFill = Math.max(0, maxEmployees - already);
        if (toFill <= 0) continue;

        const sd = shiftDetails[String(shiftId)];
        if (!sd || !sd.visible) continue;

        const candidateInterval = buildAbsInterval(day, sd.starttime, sd.endtime);

        // Génère les candidats pour une phase
        const buildCandidates = (phase, rejector, opts) => {
          const out = [];
          const {
            allowWeeklyNull = false,
            allowWeeklyFalse = false,
            allowHoursOveragePct = 0
          } = opts || {};

          const maxHoursCap = MAX_HOURS * (1 + Math.max(0, allowHoursOveragePct) / 100);

          for (const emp of employees) {
            const empIdStr = String(emp._id);

            // Déjà un shift ce jour (DB ou plan)
            const empDayKey = `${empIdStr}::${day}`;
            if (assignedByEmpDay.has(empDayKey) || planAssignedByEmpDay.has(empDayKey)) {
              rejector.push(empIdStr, REASONS.ALREADY_ASSIGNED_TODAY);
              continue;
            }

            // Weekly AV filtrage
            const av = weeklyAvailMap[empIdStr] || null;
            const flag = av ? av[wkKey] : null; // true/false/null

            if (USE_WEEKLY_AV) {
              if (phase === "strict-true") {
                if (flag !== true) { rejector.push(empIdStr, REASONS.WEEKLY_AV_NOT_TRUE, { weeklyFlag: flag }); continue; }
              } else {
                if (flag === null && !allowWeeklyNull) { rejector.push(empIdStr, REASONS.WEEKLY_AV_NULL_PHASE, { weeklyFlag: flag }); continue; }
                if (flag === false && !allowWeeklyFalse) { rejector.push(empIdStr, REASONS.WEEKLY_AV_FALSE_PHASE, { weeklyFlag: flag }); continue; }
              }
            }

            // Perf (strict: exclure lowPerf)
            const perf = employeePerformance[empIdStr];
            if (!SMART_MODE && perf?.isLowPerformance) {
              rejector.push(empIdStr, REASONS.LOW_PERF_STRICT, { overrunPct: perf?.overrunPercentage, sample: perf?.sample });
              continue;
            }

            // Heures / shifts cap
            const futureHours = (hoursWorked[empIdStr] || 0) + (sd.duration || 0);
            const futureShifts = (shiftsCount[empIdStr] || 0) + 1;
            if (futureShifts > MAX_SHIFTS) { rejector.push(empIdStr, REASONS.EXCEED_MAX_SHIFTS, { futureShifts }); continue; }

            // Autoriser léger overage en last resort uniquement
            if (futureHours > maxHoursCap) {
              rejector.push(empIdStr, (allowHoursOveragePct > 0 ? REASONS.EXCEED_MAX_HOURS_LAST_RESORT : REASONS.EXCEED_MAX_HOURS), { futureHours, cap: maxHoursCap });
              continue;
            }

            // Repos minimal
            const itvs = intervalsByEmp[empIdStr] || [];
            if (!respectsMinRest(itvs, candidateInterval, MIN_REST_MIN)) {
              rejector.push(empIdStr, REASONS.MIN_REST_VIOLATION);
              continue;
            }

            // Limite de jours consécutifs
            const currentDays = daysByEmp[empIdStr] || new Set();
            if (MAX_CONSECUTIVE_DAYS > 0 && wouldViolateConsecutiveDays(currentDays, dayIdx, MAX_CONSECUTIVE_DAYS)) {
              rejector.push(empIdStr, REASONS.CONSECUTIVE_LIMIT, { max: MAX_CONSECUTIVE_DAYS });
              continue;
            }

            out.push(emp);
          }
          return out;
        };

        // Phases
        const phases = [];
        phases.push({ name: "strict-true", allowWeeklyNull: false, allowWeeklyFalse: false, overagePct: 0 });
        if (SMART_MODE) {
          phases.push({ name: "smart-null", allowWeeklyNull: true, allowWeeklyFalse: false, overagePct: 0 });
          phases.push({ name: "smart-false", allowWeeklyNull: false, allowWeeklyFalse: true, overagePct: 0 });
          if (LAST_RESORT_OVERAGE_PCT > 0) {
            phases.push({ name: "last-resort", allowWeeklyNull: true, allowWeeklyFalse: ALLOW_WEEKLY_FALSE_LAST, overagePct: LAST_RESORT_OVERAGE_PCT });
          }
        }

        for (const ph of phases) {
          if (toFill <= 0) break;

          const collector = makeReasonCollector();
          const candidates = buildCandidates(
            ph.name,
            // adapter l'ordre des paramètres attendu par buildCandidates
            { push: (empIdStr, code, meta) => collector.push(code, empIdStr, meta) },
            {
              allowWeeklyNull: ph.allowWeeklyNull,
              allowWeeklyFalse: ph.allowWeeklyFalse,
              allowHoursOveragePct: ph.overagePct
            }
          );

          // Rookie bonus map (favorise rookies si quota)
          const rookieBonusMap = {};
          if (SMART_MODE) {
            for (const c of candidates) {
              const id = String(c._id);
              const rookie = employees.find(e => String(e._id) === id)?.scoreCard === "New DA";
              if (rookie && ROOKIE_QUOTA_PER_WEEK > 0 && (rookieAssignedCounts[id] || 0) < ROOKIE_QUOTA_PER_WEEK) {
                rookieBonusMap[id] = -1.5;
              } else if (PREFER_ROOKIES_TIES && rookie) {
                rookieBonusMap[id] = -0.25;
              } else {
                rookieBonusMap[id] = 0;
              }
            }
          }

          const lowPerfSet = new Set(
            Object.keys(employeePerformance).filter(id => employeePerformance[id]?.isLowPerformance)
          );

          candidates.sort(makeCandidateSorter({
            hoursWorkedMap: hoursWorked,
            scorePriority,
            lowPerfSet,
            rookieBonusMap,
            stableTieBreakerMap
          }));

          const take = Math.min(toFill, candidates.length);
          const chosenNames = [];

          for (let i = 0; i < take; i++) {
            const emp = candidates[i];
            const empIdStr = String(emp._id);

            proposedAssignments.push({
              employeeId: emp._id,
              selectedDay: day,
              shiftId: shiftId,
              publish: false
            });

            planAssignedByEmpDay.add(`${empIdStr}::${day}`);
            alreadyAssignedCount[baseKey] = (alreadyAssignedCount[baseKey] || 0) + 1;
            hoursWorked[empIdStr] = (hoursWorked[empIdStr] || 0) + (sd.duration || 0);
            shiftsCount[empIdStr] = (shiftsCount[empIdStr] || 0) + 1;
            (intervalsByEmp[empIdStr] ||= []).push(candidateInterval);
            (daysByEmp[empIdStr] ||= new Set()).add(dayIdx);

            if (employees.find(e => String(e._id) === empIdStr)?.scoreCard === "New DA") {
              rookieAssignedCounts[empIdStr] = (rookieAssignedCounts[empIdStr] || 0) + 1;
            }

            chosenNames.push(empName[empIdStr] || empIdStr);
            toFill--;
            if (toFill <= 0) break;
          }

          // Audit pour PDF
          auditPhases.push({
            day,
            shiftId,
            shiftName: sd?.name || String(shiftId),
            phase: ph.name,
            chosen: chosenNames,
            rejectionsByReason: collector.dump()
          });
        }
      }
    }

    // 10) MissingShifts recalculés (par rapport à needed)
    const missingShifts = {};
    for (const day of requestedDates) {
      const daySpec = requiredShiftsPerDay[day] || {};
      for (const shiftId of Object.keys(daySpec)) {
        const need = Math.max(0, Number(daySpec[shiftId]?.needed || 0));
        const k = `${day}::${String(shiftId)}`;
        const accepted = alreadyAssignedCount[k] || 0;
        const missing = Math.max(0, need - accepted);
        if (missing > 0) {
          if (!missingShifts[day]) missingShifts[day] = [];
          missingShifts[day].push({ shiftId, needed: need, accepted, missing });
        }
      }
    }

    // 11) Écriture selon simulate / writePolicy
    let inserted = [];
    if (!simulate) {
      if (writePolicy === "refresh-unpublished") {
        await Disponibilite.deleteMany({
          selectedDay: { $in: requestedDates },
          publish: false
        });
      }

      if (writePolicy === "append" || writePolicy === "refresh-unpublished") {
        if (proposedAssignments.length > 0) {
          inserted = await Disponibilite.insertMany(proposedAssignments, { ordered: false });
        }
      } else {
        // fill-only : pas de doublon (emp+day)
        const existsSet = new Set(
          (await Disponibilite.find({ selectedDay: { $in: requestedDates } })
            .select("employeeId selectedDay").lean())
            .map(d => `${String(d.employeeId)}::${d.selectedDay}`)
        );
        const toInsert = [];
        for (const a of proposedAssignments) {
          const key = `${String(a.employeeId)}::${a.selectedDay}`;
          if (!existsSet.has(key)) {
            existsSet.add(key);
            toInsert.push(a);
          }
        }
        if (toInsert.length > 0) {
          inserted = await Disponibilite.insertMany(toInsert, { ordered: false });
        }
      }
    }

    // 12) Rapport PDF (upload GridFS) — logs uniquement dans le PDF
    let reportInfo = null;
    if (report === true || String(report).toLowerCase() === "pdf") {
      const pdfBuffer = await buildDecisionPdf({
        dsp_code, weekRange, SMART_MODE, USE_WEEKLY_AV,
        MAX_HOURS, MAX_SHIFTS, MIN_REST_HOURS,
        requestedDates,
        shiftIdsNeededCount: shiftIdsNeeded.length,
        employeesCount: employees.length,
        proposedCount: proposedAssignments.length,
        insertedCount: inserted.length,
        missingShifts,
        auditPhases,
        shiftDetails
      });

      const filename = `Prediction-report-${dsp_code}-${Date.now()}.pdf`;
      let fileId = null;
      try {
        fileId = await uploadPdfToGridFS(connection, pdfBuffer, filename, {
          dsp_code,
          weekStart: weekRange.start,
          weekEnd: weekRange.end,
          type: "assignment-report",
          createdAt: new Date()
        });
        reportInfo = { storage: "gridfs", uploaded: true, fileId, filename };
      } catch (e) {
        console.error("[predict-shifts] report upload failed:", e);
        reportInfo = { storage: "gridfs", uploaded: false, error: e.message };
      }
    }

    // 13) Réponse — on renvoie aussi un chemin direct de téléchargement
    const predictions = !simulate ? inserted : proposedAssignments;

    let reportDownloadPath = null;
    if (reportInfo?.uploaded && reportInfo?.fileId) {
      reportDownloadPath = `/api/prediction/predict-shifts/report/${reportInfo.fileId}?dsp_code=${encodeURIComponent(dsp_code)}`;
    }

    return res.status(200).json({
      message: "Predictions generated",
      predictions,   // { employeeId, selectedDay, shiftId, publish:false }
      missingShifts, // recap besoins non couverts
      ...(reportInfo ? { report: { ...reportInfo, downloadPath: reportDownloadPath } } : {})
    });

  } catch (error) {
    console.error("[predict-shifts] error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

module.exports = router;
