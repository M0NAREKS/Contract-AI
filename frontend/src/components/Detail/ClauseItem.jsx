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

function getEffectiveRiskMeta(riskLevel, riskScore) {
  const levelMeta = getRiskLevelMeta(riskLevel);
  const scoreMeta = getRiskMeta(riskScore);
  const priority = { riskLow: 0, riskMedium: 1, riskHigh: 2 };
  return (priority[scoreMeta.className] ?? 0) > (priority[levelMeta.className] ?? 0)
    ? scoreMeta
    : levelMeta;
}

function ClauseItem({ clause, displayIndex, isOpen, onToggle, anchorId }) {
  const clauseNo = clause?.order_index ?? displayIndex ?? clause?.clause_no ?? "-";
  const clauseId = clause?.id ?? "-";
  const contractId = clause?.contract_id ?? "-";
  const clauseLabel = clause?.label ?? "Belirsiz";
  const clauseText = clause?.clause_text || "Madde metni bulunamadi.";
  const clauseType = clause?.clause_type || "Belirsiz";
  const riskScore = Number(clause?.ml_risk_score ?? clause?.risk_score ?? 0);
  const riskLevel = String(clause?.ml_risk_level || "").toLowerCase();
  const riskMeta = getEffectiveRiskMeta(riskLevel, riskScore);
  const ambiguousTerms = useMemo(() => toArray(clause?.ambiguous_terms), [clause?.ambiguous_terms]);
  const ruleResults = useMemo(() => toArray(clause?.rule_results), [clause?.rule_results]);
  const extractedFields = clause?.extracted_fields && typeof clause.extracted_fields === "object" ? clause.extracted_fields : {};
  const hasExtractedFields = Object.keys(extractedFields).length > 0;
  const status = String(clause?.overall_status || "ok").toLowerCase();
  const statusLabel = status === "violation" ? "Ihlal" : status === "warning" ? "Uyari" : "Uygun";
  const statusClass =
    status === "violation" ? "policyViolation" : status === "warning" ? "policyWarning" : "policyOk";
  const clauseStatusClass =
    status === "violation" ? "statusViolation" : status === "warning" ? "statusWarning" : "statusOk";
  const riskScoreText = Number.isFinite(riskScore) ? riskScore.toFixed(2) : "0.00";

  return (
    <article id={anchorId} className={`clauseItem ${clauseStatusClass} ${isOpen ? "open" : ""}`}>
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
          <h4>Kayit Bilgileri</h4>
          <ul>
            <li>Clause ID: {renderListItem(clauseId)}</li>
            <li>Contract ID: {renderListItem(contractId)}</li>
            <li>Sira: {renderListItem(clauseNo)}</li>
            <li>Etiket: {renderListItem(clauseLabel)}</li>
          </ul>
        </div>

        <div className="detailBlock">
          <h4>Aciklama</h4>
          <p>{clauseText}</p>
        </div>

        <div className="detailBlock">
          <h4>Analiz Edilen Veriler</h4>
          {hasExtractedFields ? (
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
                    <span
                      className={`badge ruleSeverity ${(() => {
                        const s = String(rule?.severity || "").toLowerCase();
                        if (s === "violation" || s === "critical") return "severity-critical";
                        if (s === "high") return "severity-high";
                        if (s === "warning" || s === "medium") return "severity-warning";
                        return "severity-ok";
                      })()}`}
                    >
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
                  <p>{renderListItem(rule?.message)}</p>
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
