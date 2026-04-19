import { useMemo } from "react";

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function renderListItem(item) {
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }

  if (item && typeof item === "object") {
    if (item.message) return item.message;
    if (item.description) return item.description;
    return JSON.stringify(item);
  }

  return "Detay bulunamadi";
}

function getRiskMeta(riskScore) {
  if (riskScore >= 0.7) {
    return { label: "Yuksek Risk", className: "riskHigh" };
  }
  if (riskScore >= 0.3) {
    return { label: "Orta Risk", className: "riskMedium" };
  }
  return { label: "Dusuk Risk", className: "riskLow" };
}

function getRiskLevelMeta(level) {
  if (level === "high") return { label: "Yuksek Risk", className: "riskHigh" };
  if (level === "medium") return { label: "Orta Risk", className: "riskMedium" };
  return { label: "Dusuk Risk", className: "riskLow" };
}

function ClauseItem({ clause, displayIndex, isOpen, onToggle }) {
  const clauseNo = clause?.order_index ?? displayIndex ?? clause?.clause_no ?? "-";
  const clauseText = clause?.clause_text || "Madde metni bulunamadi.";
  const clauseType = clause?.clause_type || "Belirsiz";
  const riskScore = Number(clause?.ml_risk_score ?? clause?.risk_score ?? 0);
  const riskLevel = String(clause?.ml_risk_level || "").toLowerCase();
  const riskMeta = riskLevel ? getRiskLevelMeta(riskLevel) : getRiskMeta(riskScore);
  const ambiguousTerms = useMemo(() => toArray(clause?.ambiguous_terms), [clause?.ambiguous_terms]);
  const ruleResults = useMemo(() => toArray(clause?.rule_results), [clause?.rule_results]);
  const extractedFields = clause?.extracted_fields;
  const status = String(clause?.overall_status || "ok").toLowerCase();
  const statusLabel = status === "violation" ? "Ihlal" : status === "warning" ? "Uyari" : "Uygun";
  const statusClass =
    status === "violation" ? "policyViolation" : status === "warning" ? "policyWarning" : "policyOk";
  const clauseStatusClass =
    status === "violation" ? "statusViolation" : status === "warning" ? "statusWarning" : "statusOk";
  const riskScoreText = Number.isFinite(riskScore) ? riskScore.toFixed(2) : "0.00";

  return (
    <article className={`clauseItem ${clauseStatusClass} ${isOpen ? "open" : ""}`}>
      <button
        type="button"
        className="clauseToggle"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="clauseMeta">
          <span className="phaseLabel phaseN">Madde {clauseNo}</span>
          <span className="badge">{clauseType}</span>
          <span className={`badge riskBadge ${riskMeta.className}`}>
            {riskMeta.label} ({riskScoreText})
          </span>
          <span className={`badge policyBadge ${statusClass}`}>{statusLabel}</span>
        </div>
        <span className={`accordionIcon ${isOpen ? "rotated" : ""}`}>⌄</span>
      </button>

      <div className={`clauseDetails ${isOpen ? "open" : ""}`}>
        <div className="detailBlock">
          <h4>Aciklama</h4>
          <p>{clauseText}</p>
        </div>

        <div className="detailBlock">
          <h4>Analiz Edilen Veriler</h4>
          {extractedFields ? (
            <table className="fieldsTable">
              <thead>
                <tr>
                  <th>Alan</th>
                  <th>Deger</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(extractedFields).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{renderListItem(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Bu madde icin cikarilan alan bulunmuyor.</p>
          )}
        </div>

        <div className="detailBlock">
          <h4>Belirsiz Ifadeler</h4>
          {ambiguousTerms.length ? (
            <ul>
              {ambiguousTerms.map((term, index) => (
                <li key={`a-${index}`}>{renderListItem(term)}</li>
              ))}
            </ul>
          ) : (
            <p>Belirsiz ifade bulunmadi.</p>
          )}
        </div>

        <div className="detailBlock">
          <h4>Kural Sonuclari</h4>
          {ruleResults.length ? (
            <div className="ruleResults">
              {ruleResults.map((rule, index) => (
                <article key={`${rule?.rule_name || "rule"}-${index}`} className="ruleResultItem">
                  <div className="ruleTop">
                    <span className="ruleName">{renderListItem(rule?.rule_name)}</span>
                    <span className={`badge ruleSeverity severity-${String(rule?.severity || "").toLowerCase()}`}>
                      {renderListItem(rule?.severity)}
                    </span>
                  </div>
                  <div className="rulePillRow">
                    {toArray(rule?.matched_phrases).map((phrase, phraseIndex) => (
                      <span key={`phrase-${index}-${phraseIndex}`} className="rulePhrasePill">
                        {renderListItem(phrase)}
                      </span>
                    ))}
                  </div>
                  <p>{renderListItem(rule?.recommendation)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p>Bu madde icin kural sonucu bulunmuyor.</p>
          )}
        </div>
      </div>
    </article>
  );
}

export default ClauseItem;
