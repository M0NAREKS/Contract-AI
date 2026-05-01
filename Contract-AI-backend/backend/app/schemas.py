from datetime import datetime

from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str


class ContractUploadResponse(BaseModel):
    id: int
    name: str
    date: datetime
    text_length: int

    model_config = ConfigDict(from_attributes=True)


class ClauseResponse(BaseModel):
    id: int
    contract_id: int
    order_index: int
    label: str | None
    text: str

    model_config = ConfigDict(from_attributes=True)


class RuleResultResponse(BaseModel):
    rule_id: str
    rule_name: str
    severity: str
    message: str
    recommendation: str
    matched_phrases: list[str]


class ClauseAnalysisResponse(ClauseResponse):
    overall_status: str
    ml_risk_score: float
    ml_risk_level: str
    ambiguous_terms: list[str]
    rule_results: list[RuleResultResponse]


class ContractAnalysisSummaryResponse(BaseModel):
    violation_count: int
    warning_count: int
    high_risk_clause_count: int
    average_ml_risk_score: float


class ContractAnalysisResponse(BaseModel):
    id: int
    name: str
    date: datetime
    text_length: int
    clause_count: int
    summary: ContractAnalysisSummaryResponse
    clauses: list[ClauseAnalysisResponse]

    model_config = ConfigDict(from_attributes=True)
