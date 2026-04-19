import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder

CLAUSE_TYPE_LIST = [
    "payment", "penalty", "termination",
    "confidentiality", "liability", "data_protection", "other"
]

# LabelEncoder'ı sabit sırayla fit et (her çalışmada aynı encoding)
label_encoder = LabelEncoder()
label_encoder.fit(CLAUSE_TYPE_LIST)

AMBIGUOUS_KEYWORDS = ["reasonable", "as soon as possible", "best effort", "if necessary", "makul", "en kısa sürede"]

def detect_ambiguity(text: str) -> bool:
    """
    Kural tabanlı belirsizlik kontrolü (Keyword + Logic)
    """
    if not text:
        return False
    text_lower = text.lower()
    return any(kw in text_lower for kw in AMBIGUOUS_KEYWORDS)

def build_feature_vector(clause: dict) -> list:
    """
    Bir clause dict'ini ML için feature listesine çevirir.
    """
    features = clause.get("features", {})
    clause_type = clause.get("clause_type", "other")
    text = clause.get("text", "")

    # None değerleri 0'a çevir
    payment_term_days = features.get("payment_term_days") or 0
    penalty_percentage = features.get("penalty_percentage") or 0.0
    
    # Hem LLM'den gelen flag, hem kural tabanlı KW kontrolü
    llm_ambiguity = bool(features.get("ambiguity_flag", False))
    logic_ambiguity = detect_ambiguity(text)
    ambiguity_flag = 1 if (llm_ambiguity or logic_ambiguity) else 0

    # Clause type encoding
    if clause_type not in CLAUSE_TYPE_LIST:
        clause_type = "other"
    clause_type_enc = label_encoder.transform([clause_type])[0]

    return [payment_term_days, penalty_percentage, ambiguity_flag, clause_type_enc]


def build_dataframe(clauses: list) -> pd.DataFrame:
    """Birden fazla clause için DataFrame oluşturur."""
    rows = []
    for c in clauses:
        vec = build_feature_vector(c)
        rows.append({
            "payment_term_days": vec[0],
            "penalty_percentage": vec[1],
            "ambiguity_flag": vec[2],
            "clause_type_enc": vec[3],
        })
    return pd.DataFrame(rows)