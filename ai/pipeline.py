from backend.ai.extraction.clause_extractor import extract_clauses
from backend.ai.extraction.structured_extractor import extract_features
from backend.ai.analysis.ambiguity import detect_ambiguity
from backend.ai.analysis.rule_engine import check_violations
from backend.ai.ml.risk_scorer import score_clause
from backend.ai.schemas import (
    Clause, ClauseFeatures, Violation, ContractAnalysisResult
)


def analyze_contract(contract_text: str) -> ContractAnalysisResult:
    """
    Sözleşme metnini alır, tam analizi döndürür.
    Bu fonksiyon tüm AI pipeline'ını çalıştırır.
    """

    # 1. Maddelere ayır ve sınıflandır
    raw_clauses = extract_clauses(contract_text)

    processed_clauses = []

    for raw in raw_clauses:
        # 2. Yapısal veri çıkar
        raw_features = extract_features(raw["text"], raw.get("clause_type", "other"))

        # 3. Ambiguity detection
        ambiguity_result = detect_ambiguity(raw["text"])
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

        # 5. Risk skoru
        clause_for_scoring = {
            "clause_type": raw.get("clause_type", "other"),
            "features": raw_features
        }
        risk_result = score_clause(clause_for_scoring)

        # 6. Clause nesnesini oluştur
        clause = Clause(
            clause_id=raw["clause_id"],
            text=raw["text"],
            clause_type=raw.get("clause_type", "other"),
            features=ClauseFeatures(**{
                k: v for k, v in raw_features.items()
                if k in ClauseFeatures.model_fields
            }),
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            violations=violations
        )
        processed_clauses.append(clause)

    # 7. Executive summary
    summary = _build_summary(processed_clauses)

    return ContractAnalysisResult(
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