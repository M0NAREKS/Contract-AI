from typing import List, Dict
import re

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

KEYWORD_RULES = [
    {"keywords": ["sınırsız", "limitsiz", "tüm zararlar", "doğrudan ve dolaylı", "müteselsilen", "her türlü zarar"], "severity": "violation", "message": "Sınırsız veya geniş kapsamlı sorumluluk/ceza ifadesi tespit edildi.", "id": "uncapped_liability"},
    {"keywords": ["tek taraflı fesih", "derhal fesih", "önceden bildirmeksizin", "dilediği zaman", "sebep göstermeksizin", "tek taraflı olarak değiştir"], "severity": "violation", "message": "Tek taraflı fesih veya sözleşmeyi tek taraflı değiştirme hakkı tespit edildi.", "id": "unfair_termination"},
    {"keywords": ["gecikme cezası", "cezai şart", "tazminat", "yaptırım", "gecikme faizi", "muacceliyet", "fahiş"], "severity": "warning", "message": "Ceza, faiz veya ağır tazminat şartı içeriyor, dikkatlice incelenmeli.", "id": "penalty_clause"},
    {"keywords": ["feragat", "kabul etmez", "sorumlu değildir", "sorumlu tutulamaz", "sorumsuzluk", "peşinen kabul", "gayrikabili rücu"], "severity": "violation", "message": "Sorumluluktan feragat veya peşinen kabul ifadesi içeriyor.", "id": "liability_waiver"},
    {"keywords": ["rekabet yasağı", "başka bir firmayla çalışamaz", "çalışması yasaktır"], "severity": "warning", "message": "Çalışan veya firma için rekabet yasağı (non-compete) tespit edildi.", "id": "non_compete"},
]

def check_violations(features: dict, text: str = "") -> List[Dict]:
    """
    Feature dict'i ve ham metni kurallara/anahtar kelimelere göre kontrol eder.
    """
    violations = []
    text_lower = text.lower()

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

    for kw_rule in KEYWORD_RULES:
        for kw in kw_rule["keywords"]:
            if kw in text_lower:
                violations.append({
                    "rule_id": kw_rule["id"],
                    "severity": kw_rule["severity"],
                    "message": f"{kw_rule['message']} (Bulunan ifade: '{kw}')"
                })
                break

    return violations