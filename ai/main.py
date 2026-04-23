from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ai.pipeline import analyze_contract

app = FastAPI(title="Contract AI Service APi")

class ContractRequest(BaseModel):
    id: int = 1
    name: str = "contract"
    text: str

class RuleResultResponse(BaseModel):
    rule_id: str
    rule_name: str
    severity: str
    message: str
    recommendation: str
    matched_phrases: List[str]

class ClauseAnalysisResponse(BaseModel):
    id: int
    contract_id: int
    order_index: int
    label: Optional[str] = None
    text: str
    overall_status: str
    ml_risk_score: float
    ml_risk_level: str
    rewrite_suggestion: Optional[str] = None
    ambiguous_terms: List[str]
    rule_results: List[RuleResultResponse]

class ContractAnalysisSummaryResponse(BaseModel):
    contract_category: Optional[str] = None
    executive_summary: Optional[str] = None
    missing_clauses: List[str] = []
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
    clauses: List[ClauseAnalysisResponse]

@app.post("/api/v1/analyze", response_model=ContractAnalysisResponse)
async def analyze(request: ContractRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Contract text cannot be empty.")
    
    try:
        # Run the AI pipeline
        result = await analyze_contract(request.text)
        
        clauses_out = []
        for i, clause in enumerate(result.clauses):
            rule_results = []
            for v in clause.violations:
                rule_results.append(RuleResultResponse(
                    rule_id=v.rule_id,
                    rule_name=v.rule_id,
                    severity=v.severity,
                    message=v.message,
                    recommendation="Review required.",
                    matched_phrases=[]
                ))
            
            status = "ok"
            if any(r.severity == "violation" for r in rule_results):
                status = "violation"
            elif rule_results or clause.risk_level in ["medium", "high"]:
                status = "warning"
                
            clauses_out.append(ClauseAnalysisResponse(
                id=clause.clause_id,
                contract_id=request.id,
                order_index=i + 1,
                label=None,
                text=clause.text,
                overall_status=status,
                ml_risk_score=clause.risk_score or 0.0,
                ml_risk_level=clause.risk_level or "low",
                rewrite_suggestion=clause.rewrite_suggestion,
                ambiguous_terms=clause.features.ambiguous_phrases,
                rule_results=rule_results
            ))
            
        summary_out = ContractAnalysisSummaryResponse(
            contract_category=result.contract_category,
            executive_summary=result.summary.get("executive_summary"),
            missing_clauses=result.summary.get("missing_clauses", []),
            violation_count=result.summary.get("total_violations", 0),
            warning_count=result.summary.get("total_warnings", 0),
            high_risk_clause_count=result.summary.get("high_risk_count", 0),
            average_ml_risk_score=sum(c.ml_risk_score for c in clauses_out) / len(clauses_out) if clauses_out else 0.0
        )
        
        return ContractAnalysisResponse(
            id=request.id,
            name=request.name,
            date=datetime.utcnow(),
            text_length=len(request.text),
            clause_count=len(clauses_out),
            summary=summary_out,
            clauses=clauses_out
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    contract_id: int
    contract_text: str
    user_message: str

class ChatResponse(BaseModel):
    answer: str

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_with_contract(request: ChatRequest):
    import os
    from openai import AsyncOpenAI
    from groq import AsyncGroq
    
    openai_key = os.environ.get("OPENAI_API_KEY")
    groq_key = os.environ.get("GROQ_API_KEY", "dummy")
    
    system_prompt = f"Sen bir avukatsın. Aşağıdaki sözleşme metnine göre yasal soruları cevapla. Doğrudan maddelere veya sözleşmenin tümüne atıfta bulunabilirsin:\n\nSÖZLEŞME METNİ:\n{request.contract_text}"
    
    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": request.user_message}
        ]
        if openai_key:
            client = AsyncOpenAI(api_key=openai_key)
            completion = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
        else:
            client = AsyncGroq(api_key=groq_key)
            completion = await client.chat.completions.create(
                model="openai/gpt-oss-120b",
                reasoning_effort="medium",
                messages=messages
            )
        return ChatResponse(answer=completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
