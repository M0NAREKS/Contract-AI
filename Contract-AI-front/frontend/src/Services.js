const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export const API_ENDPOINTS = {
  analyzeContract: "/analyze-contract",
  uploadContract: "/upload-contract",
};

function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function extractErrorMessage(response) {
  try {
    const data = await response.json();
    return data?.detail || data?.message || "Yukleme basarisiz oldu.";
  } catch {
    const text = await response.text();
    return text || "Yukleme basarisiz oldu.";
  }
}

function toArray(value) {
  if (!Array.isArray(value)) {
    throw new Error("Backend response formati gecersiz: dizi bekleniyordu.");
  }
  return value;
}

function toNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error("Backend response formati gecersiz: sayi bekleniyordu.");
  }
  return n;
}

function toOptionalNumber(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  return toNumber(value);
}

function toRiskRatio(value) {
  const n = toNumber(value);
  if (n < 0 || n > 1) {
    throw new Error("Backend response formati gecersiz: risk skoru 0-1 araliginda olmali.");
  }
  return n;
}

function toObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Backend response formati gecersiz: nesne bekleniyordu.");
  }
  return value;
}

function toString(value) {
  if (typeof value !== "string") {
    throw new Error("Backend response formati gecersiz: metin bekleniyordu.");
  }
  return value;
}

function toOptionalString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return toString(value);
}

function toOptionalObject(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  return toObject(value);
}

function normalizeRuleResult(ruleResult) {
  const safeRule = toObject(ruleResult);
  return {
    rule_id: toString(safeRule.rule_id),
    rule_name: toString(safeRule.rule_name),
    severity: toString(safeRule.severity),
    message: toString(safeRule.message),
    matched_phrases: toArray(safeRule.matched_phrases).map((phrase) => toString(phrase)),
    recommendation: toString(safeRule.recommendation),
  };
}

function normalizeClause(clause) {
  const safeClause = toObject(clause);
  const extractedFields = toOptionalObject(safeClause.extracted_fields, {});
  const riskScore = toRiskRatio(safeClause.ml_risk_score);
  const ruleResults = toArray(safeClause.rule_results).map((rule) => normalizeRuleResult(rule));
  const ambiguousTerms = toArray(safeClause.ambiguous_terms).map((term) => toString(term));
  const status = toString(safeClause.overall_status).toLowerCase();
  const riskLevel = toString(safeClause.ml_risk_level).toLowerCase();

  if (!["violation", "warning", "ok"].includes(status)) {
    throw new Error("Backend response formati gecersiz: overall_status degeri gecersiz.");
  }

  if (!["low", "medium", "high"].includes(riskLevel)) {
    throw new Error("Backend response formati gecersiz: ml_risk_level degeri gecersiz.");
  }

  return {
    id: toOptionalNumber(safeClause.id),
    contract_id: toOptionalNumber(safeClause.contract_id),
    order_index: toNumber(safeClause.order_index),
    label: safeClause.label ?? null,
    text: toString(safeClause.text),
    clause_text: toString(safeClause.text),
    clause_type: toOptionalString(safeClause.label, "Belirsiz"),
    ml_risk_score: riskScore,
    ml_risk_level: riskLevel,
    overall_status: status,
    ambiguous_terms: ambiguousTerms,
    extracted_fields: extractedFields,
    rule_results: ruleResults,
    // Backward-compatible aliases used by existing UI pieces.
    clause_no: toNumber(safeClause.order_index),
    risk_score: riskScore,
  };
}

function buildSummary(summary) {
  const safeSummary = toObject(summary);
  return {
    violation_count: toNumber(safeSummary.violation_count),
    warning_count: toNumber(safeSummary.warning_count),
    high_risk_clause_count: toNumber(safeSummary.high_risk_clause_count),
    average_ml_risk_score: toRiskRatio(safeSummary.average_ml_risk_score),
  };
}

function buildTopRisks(clauses) {
  return [...clauses]
    .sort((a, b) => b.ml_risk_score - a.ml_risk_score)
    .slice(0, 5)
    .map((clause) => ({
      title: `${clause.clause_type} - ${clause.ml_risk_level}`,
      clause_no: clause.order_index,
      risk_score: clause.ml_risk_score,
      reason: clause.rule_results[0]?.recommendation || "Kural onerisi bulunamadi.",
    }));
}

export function normalizeAnalysisResponse(raw) {
  const safeRaw = toObject(raw);
  const rawClauses = toArray(safeRaw.clauses);
  const clauses = rawClauses
    .map((clause) => normalizeClause(clause))
    .sort((a, b) => a.order_index - b.order_index);

  const summary = buildSummary(safeRaw.summary);
  const top_risks = buildTopRisks(clauses);

  return {
    id: toOptionalNumber(safeRaw.id),
    name: toOptionalString(safeRaw.name, ""),
    date: toOptionalString(safeRaw.date, ""),
    text_length: toOptionalNumber(safeRaw.text_length, 0),
    clause_count: toOptionalNumber(safeRaw.clause_count, clauses.length),
    summary,
    clauses,
    top_risks,
  };
}

async function postContractFile(file, endpoint) {
  const formData = new FormData();
  formData.append("file", file);

  let response;
  try {
    response = await fetch(buildApiUrl(endpoint), {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("Dosya yuklenemedi. Sunucu baglantisini kontrol edin.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

export async function uploadContract(file) {
  return postContractFile(file, API_ENDPOINTS.uploadContract);
}

export async function analyzeContract(file) {
  const data = await postContractFile(file, API_ENDPOINTS.analyzeContract);
  return normalizeAnalysisResponse(data);
}
