from pydantic import BaseModel
from typing import Optional, List

# Sabit clause tipleri
CLAUSE_TYPES = [
    "payment",
    "penalty",
    "termination",
    "confidentiality",
    "liability",
    "data_protection",
    "other"
]

class ClauseFeatures(BaseModel):
    payment_term_days: Optional[int] = None
    penalty_percentage: Optional[float] = None
    notice_period_days: Optional[int] = None
    duration_years: Optional[int] = None
    ambiguity_flag: bool = False
    ambiguous_phrases: List[str] = []

class Violation(BaseModel):
    rule_id: str
    severity: str  # "violation" veya "warning"
    message: str

class Clause(BaseModel):
    clause_id: int
    text: str
    clause_type: Optional[str] = None
    features: ClauseFeatures = ClauseFeatures()
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None  # low / medium / high
    violations: List[Violation] = []

class ContractAnalysisResult(BaseModel):
    total_clauses: int
    clauses: List[Clause]
    summary: dict