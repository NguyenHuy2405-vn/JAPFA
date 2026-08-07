const SPREADSHEET_ID = "1zc-aLYRSdjyyRN2NAnalkPc2qUAgUT-0MCg7TI4ujAw";

function exportUIBundleForAI() {
  const CONFIG = {
    sampleRowsPerSheet: 50,
    typeInferenceSampleSize: 100,
    skipHiddenSheets: false,
    skipSheetNamePatterns: [/^_/i, /^log$/i, /^logs$/i, /^tmp$/i, /^temp$/i],
    output: {
      mode: "TIMESTAMPED",
      folderName: `AI_UI_EXPORT_ALL_SHEETS`,
      bundleFileName: "bundle.json",
    },
  };

  const ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  const tz =
    ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || "Etc/GMT";
  const notifier = createNotifier_();

  const allSheets = ss
    .getSheets()
    .filter((s) => shouldIncludeSheet_(s, CONFIG));
  const exportSheetNames = allSheets.map((s) => s.getName());

  const namedRanges = extractNamedRanges_(ss);

  const dependencyGraph = buildDependencyGraph_(ss, allSheets, namedRanges);

  const schema = [];
  const formulaMap = [];
  const validationMap = [];
  const sampleData = [];
  const uiHints = [];

  allSheets.forEach((sheet) => {
    const meta = extractSheetMeta_(sheet, CONFIG);
    schema.push(meta.schema);
    formulaMap.push(meta.formula);
    validationMap.push(meta.validation);
    sampleData.push(meta.sample);
    uiHints.push(meta.uiHints);
  });

  const dependencies = {
    exportedSheets: exportSheetNames,
    graph: Object.keys(dependencyGraph)
      .sort()
      .reduce((acc, k) => {
        acc[k] = Array.from(dependencyGraph[k]).sort();
        return acc;
      }, {}),
  };

  const bundle = {
    meta: {
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      exportedAt: new Date().toISOString(),
      timezone: tz,
      locale: ss.getSpreadsheetLocale(),
      exportedSheets: exportSheetNames,
      version: "2.0.0",
    },
    dependencies,
    namedRanges,
    schema,
    formulaMap,
    validationMap,
    sampleData,
    uiHints,
    guidance: {
      notes: [
        "Full bundle extracted for 100% AI migration accuracy.",
        "Use schema + validationMap to build backend DTO validations and UI forms.",
        "Use formulaMap to translate business logic into backend services.",
      ],
    },
  };

  const folder = getOrCreateFolder_(CONFIG.output.folderName);
  const stamp = Utilities.formatDate(new Date(), tz, "yyyyMMdd_HHmmss");

  const filePlan = [
    { name: "sheet-schema.json", data: schema },
    { name: "formula-map.json", data: formulaMap },
    { name: "validation-map.json", data: validationMap },
    { name: "sample-data.json", data: sampleData },
    { name: "dependencies.json", data: dependencies },
    { name: "named-ranges.json", data: namedRanges },
    { name: CONFIG.output.bundleFileName, data: bundle },
  ];

  filePlan.forEach((f) => {
    const finalName =
      CONFIG.output.mode === "TIMESTAMPED"
        ? appendTimestamp_(f.name, stamp)
        : f.name;
    writeJsonFileToFolder_(
      folder,
      finalName,
      f.data,
      CONFIG.output.mode === "OVERWRITE",
    );
  });

  notifier.notify(
    [
      "✅ Pull thành công toàn bộ Master Data & Cấu trúc cho AI!",
      `Folder: ${folder.getName()}`,
      `Sheets exported: ${exportSheetNames.length} sheets`,
      `Files generated: ${filePlan.length}`,
    ].join("\n"),
  );
}

function createNotifier_() {
  let ui = null;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    ui = null;
  }
  return {
    notify: function (message) {
      if (ui) ui.alert(message);
      else Logger.log(message);
    },
  };
}

function extractSheetMeta_(sheet, CONFIG) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  const formulas = range.getFormulas();
  const notes = range.getNotes();
  const backgrounds = range.getBackgrounds();
  const displayValues = range.getDisplayValues();
  const numRows = range.getNumRows();
  const numCols = range.getNumColumns();

  const headers = values[0] || [];
  const rows = values.slice(1);

  const columns = [];
  for (let c = 0; c < numCols; c++) {
    const header = String(headers[c] || `COL_${c + 1}`);
    const sampleVals = rows
      .map((r) => r[c])
      .filter((v) => v !== "" && v !== null)
      .slice(0, CONFIG.typeInferenceSampleSize);

    columns.push({
      columnIndex: c + 1,
      columnLetter: toColumnLetter_(c + 1),
      header,
      inferredType: inferType_(sampleVals),
      nonEmptySampleCount: sampleVals.length,
    });
  }

  const schema = {
    sheet: sheet.getName(),
    sheetId: sheet.getSheetId(),
    isHidden: sheet.isSheetHidden(),
    rowCount: numRows,
    columnCount: numCols,
    frozenRows: sheet.getFrozenRows(),
    frozenColumns: sheet.getFrozenColumns(),
    columns,
  };

  const formulaCells = [];
  for (let r = 0; r < formulas.length; r++) {
    for (let c = 0; c < formulas[r].length; c++) {
      const f = formulas[r][c];
      if (f) {
        formulaCells.push({
          a1: `${toColumnLetter_(c + 1)}${r + 1}`,
          row: r + 1,
          col: c + 1,
          formula: f,
        });
      }
    }
  }

  const formula = {
    sheet: sheet.getName(),
    formulaCount: formulaCells.length,
    formulaCells,
  };

  const validationCells = [];
  try {
    const validations = range.getDataValidations();
    for (let r = 0; r < validations.length; r++) {
      for (let c = 0; c < validations[r].length; c++) {
        const rule = validations[r][c];
        if (!rule) continue;

        const criteriaType = String(rule.getCriteriaType());
        const criteriaValues = rule.getCriteriaValues() || [];

        validationCells.push({
          a1: `${toColumnLetter_(c + 1)}${r + 1}`,
          row: r + 1,
          col: c + 1,
          criteriaType,
          criteriaValues: normalizeCriteriaValues_(criteriaValues),
          allowInvalid: rule.getAllowInvalid(),
          helpText: rule.getHelpText(),
        });
      }
    }
  } catch (e) {}

  const validation = {
    sheet: sheet.getName(),
    validationCount: validationCells.length,
    validationCells,
  };

  const sampleRows = rows
    .slice(0, CONFIG.sampleRowsPerSheet)
    .map((row, idx) => {
      const obj = { __rowNumber: idx + 2 };
      for (let c = 0; c < numCols; c++) {
        const key = String(headers[c] || `COL_${c + 1}`);
        obj[key] = row[c];
      }
      return obj;
    });

  const sample = {
    sheet: sheet.getName(),
    sampleRowCount: sampleRows.length,
    sampleRows,
  };

  const hintedCells = [];
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const note = notes[r][c];
      const bg = backgrounds[r][c];
      const hasNonDefaultBg = bg && bg.toLowerCase() !== "#ffffff";

      if (note || hasNonDefaultBg) {
        hintedCells.push({
          a1: `${toColumnLetter_(c + 1)}${r + 1}`,
          row: r + 1,
          col: c + 1,
          note: note || "",
          background: bg,
        });
      }
    }
  }

  const mergedRanges = sheet
    .getDataRange()
    .getMergedRanges()
    .map((rg) => ({
      a1: rg.getA1Notation(),
      row: rg.getRow(),
      col: rg.getColumn(),
      numRows: rg.getNumRows(),
      numCols: rg.getNumColumns(),
    }));

  const uiHints = {
    sheet: sheet.getName(),
    hintCellCount: hintedCells.length,
    hintedCells,
    mergedRanges,
    headerDisplayValues: displayValues[0] || [],
  };

  return { schema, formula, validation, sample, uiHints };
}

function extractNamedRanges_(ss) {
  return ss.getNamedRanges().map((nr) => {
    const rg = nr.getRange();
    return {
      name: nr.getName(),
      sheet: rg.getSheet().getName(),
      a1: rg.getA1Notation(),
      row: rg.getRow(),
      col: rg.getColumn(),
      numRows: rg.getNumRows(),
      numCols: rg.getNumColumns(),
    };
  });
}

function buildDependencyGraph_(ss, sheets, namedRanges) {
  const sheetNames = new Set(sheets.map((s) => s.getName()));
  const graph = {};

  sheets.forEach((sheet) => {
    const source = sheet.getName();
    if (!graph[source]) graph[source] = new Set();

    try {
      const formulaText = sheet
        .getDataRange()
        .getFormulas()
        .flat()
        .filter(Boolean)
        .join("\n");
      const refsFromFormula = extractSheetRefsFromFormula_(
        formulaText,
        sheetNames,
      );
      refsFromFormula.forEach((dep) => {
        if (dep !== source) graph[source].add(dep);
      });
    } catch (e) {}

    try {
      const validations = sheet.getDataRange().getDataValidations();
      validations.flat().forEach((rule) => {
        if (!rule) return;
        const type = String(rule.getCriteriaType());
        const vals = rule.getCriteriaValues() || [];
        const txt = vals.map((v) => String(v)).join("\n");

        const refs = extractSheetRefsFromFormula_(txt, sheetNames);
        refs.forEach((dep) => {
          if (dep !== source) graph[source].add(dep);
        });

        if (type.indexOf("VALUE_IN_RANGE") >= 0 && vals.length > 0) {
          const first = vals[0];
          if (first && typeof first.getSheet === "function") {
            const dep = first.getSheet().getName();
            if (dep !== source && sheetNames.has(dep)) graph[source].add(dep);
          }
        }
      });
    } catch (e) {}
  });

  const namedRangeNames = new Set(namedRanges.map((n) => n.name));
  if (namedRangeNames.size > 0) {
    sheets.forEach((sheet) => {
      const source = sheet.getName();
      try {
        const formulaText = sheet
          .getDataRange()
          .getFormulas()
          .flat()
          .filter(Boolean)
          .join("\n");
        namedRanges.forEach((nr) => {
          const re = new RegExp(`\\b${escapeRegex_(nr.name)}\\b`, "i");
          if (re.test(formulaText) && nr.sheet !== source) {
            if (!graph[source]) graph[source] = new Set();
            graph[source].add(nr.sheet);
          }
        });
      } catch (e) {}
    });
  }

  return graph;
}

function extractSheetRefsFromFormula_(text, validSheetNamesSet) {
  const refs = new Set();
  if (!text) return refs;
  const regex = /(?:'([^']+)'|([A-Za-z0-9_.\-]+))!/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const raw = m[1] || m[2];
    if (raw && validSheetNamesSet.has(raw)) refs.add(raw);
  }
  return refs;
}

function shouldIncludeSheet_(sheet, CONFIG) {
  const name = sheet.getName();
  if (CONFIG.skipHiddenSheets && sheet.isSheetHidden()) return false;
  for (const p of CONFIG.skipSheetNamePatterns || []) {
    if (p.test(name)) return false;
  }
  return true;
}

function writeJsonFileToFolder_(folder, fileName, data, overwrite) {
  const content = JSON.stringify(data, null, 2);
  const mime = MimeType.PLAIN_TEXT;

  if (overwrite) {
    const existing = folder.getFilesByName(fileName);
    if (existing.hasNext()) {
      const f = existing.next();
      f.setContent(content);
      while (existing.hasNext()) existing.next().setTrashed(true);
      return f;
    }
  }
  return folder.createFile(fileName, content, mime);
}

function getOrCreateFolder_(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function appendTimestamp_(fileName, stamp) {
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return `${fileName}_${stamp}`;
  return `${fileName.slice(0, idx)}_${stamp}${fileName.slice(idx)}`;
}

function normalizeCriteriaValues_(vals) {
  return vals.map((v) => {
    if (v === null || v === undefined) return null;
    if (
      v &&
      typeof v.getA1Notation === "function" &&
      typeof v.getSheet === "function"
    ) {
      return {
        type: "Range",
        sheet: v.getSheet().getName(),
        a1: v.getA1Notation(),
      };
    }
    if (Object.prototype.toString.call(v) === "[object Date]") {
      return {
        type: "Date",
        iso: v.toISOString(),
      };
    }
    return v;
  });
}

function inferType_(sampleVals) {
  if (!sampleVals || !sampleVals.length) return "unknown";

  let numberCount = 0;
  let dateCount = 0;
  let booleanCount = 0;
  let objectCount = 0;

  sampleVals.forEach((v) => {
    if (typeof v === "number") numberCount++;
    else if (Object.prototype.toString.call(v) === "[object Date]") dateCount++;
    else if (typeof v === "boolean") booleanCount++;
    else if (typeof v === "object") objectCount++;
  });

  const n = sampleVals.length;
  if (numberCount / n >= 0.7) return "number";
  if (dateCount / n >= 0.7) return "date";
  if (booleanCount / n >= 0.7) return "boolean";
  if (objectCount / n >= 0.7) return "object";
  return "string";
}

function toColumnLetter_(column) {
  let temp = "";
  let letter = "";
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

function escapeRegex_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
