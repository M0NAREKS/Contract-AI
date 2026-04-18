from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.services.rule_engine import RuleMatch


CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"
MODEL_PATH = CONFIG_DIR / "ml_model.json"


@dataclass(frozen=True, slots=True)
class ModelConfig:
    intercept: float
    medium_risk_threshold: float
    high_risk_threshold: float
    weights: dict[str, float]
    ambiguous_terms: tuple[str, ...]
    risk_keywords: dict[str, tuple[str, ...]]


@dataclass(frozen=True, slots=True)
class RiskPrediction:
    risk_score: float
    risk_level: str
    ambiguous_terms: tuple[str, ...]
    features: dict[str, float]


@lru_cache
def load_model_config() -> ModelConfig:
    payload = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
    return ModelConfig(
        intercept=float(payload["intercept"]),
        medium_risk_threshold=float(payload["medium_risk_threshold"]),
        high_risk_threshold=float(payload["high_risk_threshold"]),
        weights={key: float(value) for key, value in payload.get("weights", {}).items()},
        ambiguous_terms=tuple(payload.get("ambiguous_terms", [])),
        risk_keywords={
            key: tuple(value)
            for key, value in payload.get("risk_keywords", {}).items()
        },
    )


def predict_clause_risk(clause_text: str, rule_matches: list[RuleMatch]) -> RiskPrediction:
    config = load_model_config()
    words = re.findall(r"\b\w+\b", clause_text.casefold())
    word_count = max(len(words), 1)
    normalized_text = clause_text.casefold()
    ambiguous_terms = tuple(
        term
        for term in config.ambiguous_terms
        if term.casefold() in normalized_text
    )

    features = {
        "has_violation_rule": float(any(match.severity == "violation" for match in rule_matches)),
        "has_warning_rule": float(any(match.severity == "warning" for match in rule_matches)),
        "ambiguity_count": float(len(ambiguous_terms)),
        "liability_terms": float(_count_keyword_hits(normalized_text, config.risk_keywords.get("liability_terms", ()))),
        "termination_terms": float(_count_keyword_hits(normalized_text, config.risk_keywords.get("termination_terms", ()))),
        "payment_terms": float(_count_keyword_hits(normalized_text, config.risk_keywords.get("payment_terms", ()))),
        "keyword_density": float(
            sum(len(match.matched_phrases) for match in rule_matches) / word_count
        ),
        "text_length_log": math.log(word_count + 1),
    }

    raw_score = config.intercept
    raw_score += sum(config.weights.get(name, 0.0) * value for name, value in features.items())
    raw_score += sum(match.score_impact for match in rule_matches)

    risk_score = 1.0 / (1.0 + math.exp(-raw_score))
    risk_level = _classify_risk_level(
        risk_score=risk_score,
        medium_threshold=config.medium_risk_threshold,
        high_threshold=config.high_risk_threshold,
    )

    return RiskPrediction(
        risk_score=round(risk_score, 4),
        risk_level=risk_level,
        ambiguous_terms=ambiguous_terms,
        features=features,
    )


def _count_keyword_hits(normalized_text: str, keywords: tuple[str, ...]) -> int:
    return sum(1 for keyword in keywords if keyword.casefold() in normalized_text)


def _classify_risk_level(risk_score: float, medium_threshold: float, high_threshold: float) -> str:
    if risk_score >= high_threshold:
        return "high"
    if risk_score >= medium_threshold:
        return "medium"
    return "low"
