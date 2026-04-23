from enum import Enum

class ClauseType(str, Enum):
    PAYMENT = "payment"
    PENALTY = "penalty"
    TERMINATION = "termination"
    CONFIDENTIALITY = "confidentiality"
    LIABILITY = "liability"
    DATA_PROTECTION = "data_protection"
    OTHER = "other"

AMBIGUOUS_KEYWORDS = [
    "reasonable", "as soon as possible", "best effort",
    "if necessary", "promptly", "substantially",
    "at its discretion", "mutually agreed upon",
    "makul", "en kısa sürede", "mümkün olduğunca",
    "gerekirse", "derhal", "önemli ölçüde",
    "kendi takdirine bağlı olarak", "karşılıklı anlaşılarak"
]
