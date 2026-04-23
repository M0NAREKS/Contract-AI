from ai.extraction.clause_extractor import extract_clauses
from ai.extraction.structured_extractor import extract_features
from ai.analysis.ambiguity import detect_ambiguity
from ai.analysis.rule_engine import check_violations
from ai.schemas import (
    Clause, ClauseFeatures, Violation, ContractAnalysisResult
)


async def analyze_contract(contract_text: str) -> ContractAnalysisResult:
    """
    Sözleşme metnini alır, tam analizi döndürür.
    Bu fonksiyon tüm AI pipeline'ını çalıştırır.
    """

    # 1. Maddelere ayır ve sınıflandır
    extraction_result = await extract_clauses(contract_text)
    
    # If extraction fails or is empty, return early
    if not extraction_result.clauses:
        return extraction_result

    processed_clauses = []

    for idx, c in enumerate(extraction_result.clauses):
        # We need raw dict or attributes since extract_clauses returns Pydantic models.
        # But wait, original code treated raw_clauses as dicts. 
        # extract_clauses already runs ML risk scoring and returns Pydantic!
        # So we just augment it here.
        raw_text = c.text
        c_type = c.clause_type or "other"
        
        # 2. Yapısal veri çıkar
        raw_features = extract_features(raw_text, c_type)

        # 3. Ambiguity detection
        ambiguity_result = detect_ambiguity(raw_text)
        raw_features["ambiguity_flag"] = ambiguity_result["ambiguity_flag"]
        raw_features["ambiguous_phrases"] = ambiguity_result["ambiguous_phrases"]

        # 4. Rule engine
        violations_raw = check_violations(raw_features)
        violations = [
            Violation(
                rule_id=v["rule_id"],
                severity=v["severity"],
                message=v["message"]
            ) for v in violations_raw
        ]

        # 5. Risk skoru was already run in extract_clauses locally! We just re-use it or re-run.
        # 6. Clause nesnesini oluştur
        clause = Clause(
            clause_id=c.clause_id,
            text=raw_text,
            clause_type=c_type,
            features=ClauseFeatures(**{
                k: v for k, v in raw_features.items()
                if k in ClauseFeatures.model_fields
            }),
            risk_score=c.risk_score,
            risk_level=c.risk_level,
            rewrite_suggestion=c.rewrite_suggestion,
            violations=violations
        )
        processed_clauses.append(clause)

    # 7. Executive summary
    base_summary = extraction_result.summary if isinstance(extraction_result.summary, dict) else {}
    summary = _build_summary(processed_clauses)
    summary["executive_summary"] = base_summary.get("executive_summary")
    summary["missing_clauses"] = base_summary.get("missing_clauses", [])

    return ContractAnalysisResult(
        contract_category=extraction_result.contract_category,
        total_clauses=len(processed_clauses),
        clauses=processed_clauses,
        summary=summary
    )


def _build_summary(clauses: list) -> dict:
    total = len(clauses)
    if total == 0:
        return {}

    high_risk = sum(1 for c in clauses if c.risk_level == "high")
    medium_risk = sum(1 for c in clauses if c.risk_level == "medium")
    low_risk = sum(1 for c in clauses if c.risk_level == "low")
    total_violations = sum(
        len([v for v in c.violations if v.severity == "violation"])
        for c in clauses
    )
    total_warnings = sum(
        len([v for v in c.violations if v.severity == "warning"])
        for c in clauses
    )
    ambiguous_count = sum(1 for c in clauses if c.features.ambiguity_flag)

    return {
        "total_clauses": total,
        "high_risk_count": high_risk,
        "medium_risk_count": medium_risk,
        "low_risk_count": low_risk,
        "total_violations": total_violations,
        "total_warnings": total_warnings,
        "ambiguous_clauses": ambiguous_count,
        "risk_distribution": {
            "high": round(high_risk / total, 2),
            "medium": round(medium_risk / total, 2),
            "low": round(low_risk / total, 2),
        }
    }