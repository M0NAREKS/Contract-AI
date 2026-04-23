from typing import List, Dict

# Şirket politika kuralları — buraya yeni kurallar eklenebilir
RULES = [
    {
        "id": "payment_term_max_60",
        "field": "payment_term_days",
        "operator": "gt",
        "threshold": 60,
        "severity": "violation",
        "message": "Ödeme süresi şirket politikasının üzerinde (max 60 gün)"
    },
    {
        "id": "penalty_max_15pct",
        "field": "penalty_percentage",
        "operator": "gt",
        "threshold": 15,
        "severity": "violation",
        "message": "Ceza oranı şirket politikasının üzerinde (max %15)"
    },
    {
        "id": "payment_term_warn_45",
        "field": "payment_term_days",
        "operator": "gt",
        "threshold": 45,
        "severity": "warning",
        "message": "Ödeme süresi 45 günü geçiyor, dikkat edilmesi önerilir"
    },
]


def check_violations(features: dict) -> List[Dict]:
    """
    Feature dict'i kurallara göre kontrol eder.

    Döndürür:
        [{"rule_id": "payment_term_max_60", "severity": "violation", "message": "..."}]
    """
    violations = []

    for rule in RULES:
        value = features.get(rule["field"])

        if value is None:
            continue

        triggered = False
        if rule["operator"] == "gt" and value > rule["threshold"]:
            triggered = True
        elif rule["operator"] == "lt" and value < rule["threshold"]:
            triggered = True
        elif rule["operator"] == "eq" and value == rule["threshold"]:
            triggered = True

        if triggered:
            violations.append({
                "rule_id": rule["id"],
                "severity": rule["severity"],
                "message": rule["message"]
            })

    return violations