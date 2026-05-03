const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

/** Sohbet: varsayilan `/api/v1/chat` (Vite → 8001). Relatif base: VITE_AI_BASE_URL=/ai-proxy. Tam URL: https://... */
function buildChatRequestUrl() {
  const base = import.meta.env.VITE_AI_BASE_URL;
  if (base && /^https?:\/\//i.test(String(base))) {
    return `${String(base).replace(/\/+$/, "")}/api/v1/chat`;
  }
  if (base) {
    return `${String(base).replace(/\/+$/, "")}/api/v1/chat`;
  }
  return "/api/v1/chat";
}

/** Guncel backend'de /auth yok; `vite` dev'de otomatik yerel oturum (prod'da kapali). Kapatmak: VITE_AUTH_BYPASS=0 */
const DEV_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS !== "0";

const BYPASS_AUTH_TOKEN = "__dev_local_session__";
const BYPASS_AUTH_USER = {
  id: 0,
  email: "yerel@ornek.local",
  full_name: "Yerel gelistirme",
  account_type: "individual",
};

export const API_ENDPOINTS = {
  analyzeContract: "/analyze-contract",
  uploadContract: "/upload-contract",
  login: "/auth/login",
  logout: "/auth/logout",
  me: "/auth/me",
  register: "/auth/register",
};

function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function buildAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
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
    recommendation: toOptionalString(safeRule.recommendation, ""),
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
  const normalizedClauseType = safeClause.clause_type ?? safeClause.label;

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
    clause_type: toOptionalString(normalizedClauseType, "Belirsiz"),
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

function isHighRiskClause(clause) {
  const level = String(clause?.ml_risk_level || "").toLowerCase();
  if (level === "high") return true;
  const score = Number(clause?.ml_risk_score ?? clause?.risk_score ?? 0);
  return Number.isFinite(score) && score >= 0.7;
}

function buildSummary(summary, clauses) {
  const safeSummary = toObject(summary);
  const safeClauses = Array.isArray(clauses) ? clauses : [];
  const derivedViolationCount = safeClauses.filter(
    (clause) => String(clause?.overall_status || "").toLowerCase() === "violation"
  ).length;
  const derivedWarningCount = safeClauses.filter(
    (clause) => String(clause?.overall_status || "").toLowerCase() === "warning"
  ).length;
  const derivedHighRiskClauseCount = safeClauses.filter((clause) => isHighRiskClause(clause)).length;
  const derivedAverageRiskScore = safeClauses.length
    ? safeClauses.reduce((sum, clause) => sum + Number(clause?.ml_risk_score ?? clause?.risk_score ?? 0), 0) / safeClauses.length
    : 0;

  const missingClausesRaw = safeSummary.missing_clauses;
  const missing_clauses = Array.isArray(missingClausesRaw)
    ? missingClausesRaw.map((item) => toString(item))
    : [];

  const avgFromBackend = toOptionalNumber(safeSummary.average_ml_risk_score, 0) ?? 0;

  return {
    contract_category: toOptionalString(safeSummary.contract_category, ""),
    executive_summary: toOptionalString(safeSummary.executive_summary, ""),
    missing_clauses,
    violation_count:
      safeClauses.length > 0 ? derivedViolationCount : toOptionalNumber(safeSummary.violation_count, 0) ?? 0,
    warning_count: safeClauses.length > 0 ? derivedWarningCount : toOptionalNumber(safeSummary.warning_count, 0) ?? 0,
    high_risk_clause_count:
      safeClauses.length > 0
        ? derivedHighRiskClauseCount
        : toOptionalNumber(safeSummary.high_risk_clause_count, 0) ?? 0,
    average_ml_risk_score:
      safeClauses.length > 0 ? toRiskRatio(derivedAverageRiskScore) : toRiskRatio(avgFromBackend),
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

  const summary = buildSummary(safeRaw.summary, clauses);
  const top_risks = buildTopRisks(clauses);

  return {
    id: toOptionalNumber(safeRaw.id),
    name: toOptionalString(safeRaw.name, ""),
    date: toOptionalString(safeRaw.date, ""),
    text_length: toOptionalNumber(safeRaw.text_length, 0),
    clause_count: toOptionalNumber(safeRaw.clause_count, clauses.length),
    analysis_source: toOptionalString(safeRaw.analysis_source, "backend_fallback"),
    summary,
    clauses,
    top_risks,
  };
}

async function postContractFile(file, endpoint, token) {
  const formData = new FormData();
  formData.append("file", file);

  let response;
  try {
    response = await fetch(buildApiUrl(endpoint), {
      method: "POST",
      headers: buildAuthHeaders(token),
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

async function postJson(endpoint, payload, token) {
  let response;
  try {
    response = await fetch(buildApiUrl(endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token),
      },
      body: JSON.stringify(payload ?? {}),
    });
  } catch {
    throw new Error("Sunucu baglantisi kurulamadi.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

async function getJson(endpoint, token) {
  let response;
  try {
    response = await fetch(buildApiUrl(endpoint), {
      headers: buildAuthHeaders(token),
    });
  } catch {
    throw new Error("Sunucu baglantisi kurulamadi.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

export async function registerUser(payload) {
  if (DEV_AUTH_BYPASS) {
    void payload;
    return { access_token: BYPASS_AUTH_TOKEN, user: { ...BYPASS_AUTH_USER } };
  }
  return postJson(API_ENDPOINTS.register, payload);
}

export async function loginUser(payload) {
  if (DEV_AUTH_BYPASS) {
    void payload;
    return { access_token: BYPASS_AUTH_TOKEN, user: { ...BYPASS_AUTH_USER } };
  }
  return postJson(API_ENDPOINTS.login, payload);
}

export async function getCurrentUser(token) {
  if (DEV_AUTH_BYPASS && token === BYPASS_AUTH_TOKEN) {
    return { ...BYPASS_AUTH_USER };
  }
  return getJson(API_ENDPOINTS.me, token);
}

export async function logoutUser(token) {
  if (DEV_AUTH_BYPASS && token === BYPASS_AUTH_TOKEN) {
    return {};
  }
  return postJson(API_ENDPOINTS.logout, {}, token);
}

export async function uploadContract(file, token) {
  return postContractFile(file, API_ENDPOINTS.uploadContract, token);
}

export async function analyzeContract(file, token) {
  const data = await postContractFile(file, API_ENDPOINTS.analyzeContract, token);
  return normalizeAnalysisResponse(data);
}

/** Son analiz JSON'undan sohbet baglami (madde metinleri) uretir. */
export function buildContractTextForChat(responseData) {
  if (!responseData?.clauses?.length) return "";
  const list = [...responseData.clauses].sort(
    (a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0)
  );
  return list
    .map((c) => {
      const label = c.label || c.clause_type || "";
      const body = c.text || c.clause_text || "";
      if (!body.trim()) return "";
      return label ? `## ${label}\n${body}` : body;
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Contract-AI-ai: POST /api/v1/chat (gelistirmede Vite bu yolu 8001'e yonlendirir).
 */
export async function sendContractChatMessage({ contractId, contractText, userMessage }) {
  const url = buildChatRequestUrl();
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract_id: Number(contractId) || 1,
        contract_text: contractText ?? "",
        user_message: userMessage,
      }),
    });
  } catch {
    throw new Error(
      "AI sohbet servisine baglanilamadi. Ayri bir terminalde `npm run dev:ai` ile Contract-AI-ai (port 8001) calistirin."
    );
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const data = await response.json();
  if (typeof data?.answer !== "string") {
    throw new Error("AI yaniti beklenen formatta degil.");
  }
  return data.answer;
}
