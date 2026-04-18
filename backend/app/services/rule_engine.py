from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"
RULES_PATH = CONFIG_DIR / "rules.json"


@dataclass(frozen=True, slots=True)
class RuleDefinition:
    id: str
    name: str
    severity: str
    message: str
    recommendation: str
    score_impact: float
    any_keywords: tuple[str, ...]
    all_keywords: tuple[str, ...]
    regex_patterns: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class RuleMatch:
    rule_id: str
    rule_name: str
    severity: str
    message: str
    recommendation: str
    matched_phrases: tuple[str, ...]
    score_impact: float


@lru_cache
def load_rule_definitions() -> tuple[RuleDefinition, ...]:
    payload = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    return tuple(
        RuleDefinition(
            id=rule["id"],
            name=rule["name"],
            severity=rule["severity"],
            message=rule["message"],
            recommendation=rule["recommendation"],
            score_impact=float(rule.get("score_impact", 0.0)),
            any_keywords=tuple(rule.get("any_keywords", [])),
            all_keywords=tuple(rule.get("all_keywords", [])),
            regex_patterns=tuple(rule.get("regex_patterns", [])),
        )
        for rule in payload.get("rules", [])
    )


def evaluate_clause_rules(clause_text: str) -> list[RuleMatch]:
    normalized_text = clause_text.casefold()
    matches: list[RuleMatch] = []

    for rule in load_rule_definitions():
        matched_phrases: list[str] = []

        if rule.any_keywords:
            any_hits = [keyword for keyword in rule.any_keywords if keyword.casefold() in normalized_text]
            if not any_hits:
                continue
            matched_phrases.extend(any_hits)

        if rule.all_keywords:
            if any(keyword.casefold() not in normalized_text for keyword in rule.all_keywords):
                continue
            matched_phrases.extend(rule.all_keywords)

        if rule.regex_patterns:
            regex_hits: list[str] = []
            for pattern in rule.regex_patterns:
                found = [match.group(0) for match in re.finditer(pattern, clause_text, flags=re.IGNORECASE)]
                if not found:
                    regex_hits = []
                    break
                regex_hits.extend(found)
            if not regex_hits:
                continue
            matched_phrases.extend(regex_hits)

        matches.append(
            RuleMatch(
                rule_id=rule.id,
                rule_name=rule.name,
                severity=rule.severity,
                message=rule.message,
                recommendation=rule.recommendation,
                matched_phrases=tuple(dict.fromkeys(matched_phrases)),
                score_impact=rule.score_impact,
            )
        )

    return matches
