import { useMemo } from "react";

const HIGH_RISK_SCORE = 0.7;
const MEDIUM_RISK_SCORE = 0.45;

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function hasRuleSeverity(clause, wanted) {
  const wantedNorm = String(wanted || "").toLowerCase();
  return toArray(clause?.rule_results).some((rule) => {
    const sev = String(rule?.severity || "").toLowerCase();
    if (!sev) return false;
    if (wantedNorm === "warning") {
      return sev === "warning" || sev === "medium";
    }
    if (wantedNorm === "high") {
      return sev === "high" || sev === "critical" || sev === "violation";
    }
    return sev === wantedNorm;
  });
}

function isHighRiskClause(clause) {
  const level = String(clause?.ml_risk_level || "").toLowerCase();
  if (level === "high") return true;
  const score = Number(clause?.ml_risk_score ?? clause?.risk_score ?? 0);
  return Number.isFinite(score) && score >= HIGH_RISK_SCORE;
}

function isWarningClause(clause) {
  const status = String(clause?.overall_status || "").toLowerCase();
  if (status === "violation") return false;

  const level = String(clause?.ml_risk_level || "").toLowerCase();
  if (level === "medium" || level === "warning") return true;

  const score = Number(clause?.ml_risk_score ?? clause?.risk_score ?? 0);
  if (Number.isFinite(score) && score >= MEDIUM_RISK_SCORE && score < HIGH_RISK_SCORE) return true;

  if (status === "warning") return true;

  return hasRuleSeverity(clause, "warning");
}

function isRiskPanelClause(clause) {
  return isHighRiskClause(clause) || isWarningClause(clause);
}

function getClauseKind(clause) {
  const status = String(clause?.overall_status || "").toLowerCase();
  if (status === "violation" || isHighRiskClause(clause) || hasRuleSeverity(clause, "high")) {
    return "risk";
  }
  return "uyari";
}

function clauseKey(clause, fallbackIndex) {
  const no = clause?.order_index ?? clause?.clause_no;
  if (no !== undefined && no !== null) return `no:${no}`;
  if (clause?.id !== undefined && clause?.id !== null) return `id:${clause.id}`;
  return `idx:${fallbackIndex}`;
}

function getRiskReason(clause) {
  const firstRule = Array.isArray(clause?.rule_results) ? clause.rule_results[0] : null;
  if (firstRule?.message) return firstRule.message;
  if (firstRule?.recommendation) return firstRule.recommendation;
  if (clause?.ambiguous_terms?.length) return `Belirsiz ifade: ${clause.ambiguous_terms[0]}`;
  return "Risk gerekcesi bulunamadi.";
}

function RiskSummary({ clauses, onSelectClause }) {
  const panelClauses = useMemo(() => {
    if (!Array.isArray(clauses)) return [];
    const deduped = new Map();
    let fallbackIndex = 0;
    [...clauses].filter(isRiskPanelClause).forEach((clause) => {
      deduped.set(clauseKey(clause, fallbackIndex), clause);
      fallbackIndex += 1;
    });
    return [...deduped.values()].sort(
      (a, b) => Number(b?.ml_risk_score ?? b?.risk_score ?? 0) - Number(a?.ml_risk_score ?? a?.risk_score ?? 0)
    );
  }, [clauses]);

  if (!panelClauses.length) return null;

  const riskCount = panelClauses.filter((c) => getClauseKind(c) === "risk").length;
  const uyariCount = panelClauses.length - riskCount;

  return (
    <section className="riskBlock">
      <div className="riskHeader">
        <h3>Riskli Maddeler</h3>
        <span className="badge">
          {panelClauses.length} Madde · {riskCount} Risk · {uyariCount} Uyarı
        </span>
      </div>
      <div className="riskList">
        {panelClauses.map((clause, index) => {
          const clauseNo = clause?.order_index ?? clause?.clause_no ?? null;
          const isClickable = typeof onSelectClause === "function" && clauseNo !== null && clauseNo !== undefined;
          const kind = getClauseKind(clause);
          const scoreText = Number(clause?.ml_risk_score ?? clause?.risk_score ?? 0).toFixed(2);
          return (
            <article
              key={clauseKey(clause, index)}
              className="riskItem"
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={
                isClickable
                  ? () => {
                      onSelectClause(clauseNo);
                    }
                  : undefined
              }
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectClause(clauseNo);
                      }
                    }
                  : undefined
              }
            >
            <div className="riskItemTop">
              <strong>
                Madde {clauseNo ?? "-"} - {clause?.label || "Belirsiz"}
              </strong>
              <span className="riskScore">
                <span className={`riskKindPill ${kind === "risk" ? "riskKindRisk" : "riskKindUyari"}`}>
                  {kind === "risk" ? "Risk" : "Uyarı"}
                </span>
                Skor: {scoreText}
              </span>
            </div>
            <p className="riskReason">{getRiskReason(clause)}</p>
          </article>
          );
        })}
      </div>
    </section>
  );
}

export default RiskSummary;
