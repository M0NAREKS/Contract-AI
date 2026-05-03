from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import io
from pypdf import PdfReader
import logging
import os
from openai import AsyncOpenAI
from groq import AsyncGroq
from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "dummy")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# Chatbot ve diğer tekil işlemler için ayrı bir API Key tanımlanmışsa onu kullan, yoksa ana listedeki İLK key'i al
GROQ_CHAT_API_KEY = os.environ.get("GROQ_CHAT_API_KEY")
if GROQ_CHAT_API_KEY:
    chat_groq_key = GROQ_CHAT_API_KEY.strip()
else:
    chat_groq_key = GROQ_API_KEY.split(",")[0].strip()

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
groq_client = AsyncGroq(api_key=chat_groq_key)
anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

from ai.pipeline import analyze_contract

app = FastAPI(title="Contract AI Service APi")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Fixed CORS vulnerability
    allow_methods=["*"],
    allow_headers=["*"],
)

class ContractRequest(BaseModel):
    id: int = 1
    name: str = "contract"
    text: str = Field(..., max_length=500_000)
    provider: str = "groq"

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
    extracted_fields: dict = {}

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
        result = await analyze_contract(request.text, provider=request.provider)
        
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
                
            final_risk_score = clause.risk_score or 0.0
            final_risk_level = clause.risk_level or "low"
            
            if status == "violation":
                final_risk_score = max(final_risk_score, 0.95)
                final_risk_level = "high"
            elif status == "warning":
                final_risk_score = max(final_risk_score, 0.50)
                if final_risk_score >= 0.7:
                    final_risk_level = "high"
                else:
                    final_risk_level = "medium"
            
            # Eğer AI risk bulmuşsa ama rule_engine sebep üretememişse (keyword yoksa), sentetik bir sebep ekle:
            if not rule_results and status in ["warning", "violation"]:
                rule_results.append(RuleResultResponse(
                    rule_id="ml_ai_risk",
                    rule_name="AI Anomali Tespiti",
                    severity=status,
                    message="Yapay Zeka bu maddede potansiyel olarak taraflı, alışılmadık veya riskli bir hukuki dil tespit etti.",
                    recommendation="Maddeyi manuel olarak dikkatlice inceleyin.",
                    matched_phrases=[]
                ))
                
            clauses_out.append(ClauseAnalysisResponse(
                id=clause.clause_id,
                contract_id=request.id,
                order_index=i + 1,
                label=clause.clause_type or "other",
                text=clause.text,
                overall_status=status,
                ml_risk_score=final_risk_score,
                ml_risk_level=final_risk_level,
                rewrite_suggestion=clause.rewrite_suggestion,
                ambiguous_terms=clause.features.ambiguous_phrases,
                rule_results=rule_results,
                extracted_fields=clause.features.model_dump(exclude={"ambiguous_phrases", "ambiguity_flag"})
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
        logger.error(f"Pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

def extract_text_from_file(filename: str, content: bytes) -> str:
    if filename.lower().endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        return "\n".join([page.extract_text() or "" for page in reader.pages])
    elif filename.lower().endswith(".docx"):
        import docx
        doc = docx.Document(io.BytesIO(content))
        return "\n".join([para.text for para in doc.paragraphs])
    return content.decode("utf-8", errors="replace")

class ContractUploadResponse(BaseModel):
    id: int
    name: str
    date: datetime
    text_length: int

global_contract_counter = 1
MEMORY_STORE = {
    "contracts": {},
    "chat_history": {}
}

@app.post("/upload-contract", response_model=ContractUploadResponse)
async def upload_contract_file(file: UploadFile = File(...)):
    global global_contract_counter
    cid = global_contract_counter
    global_contract_counter += 1
    
    content = await file.read()
    text = extract_text_from_file(file.filename or "", content)
    
    MEMORY_STORE["contracts"][cid] = text
    MEMORY_STORE["chat_history"][cid] = []
    
    return ContractUploadResponse(
        id=cid,
        name=file.filename or "contract",
        date=datetime.utcnow(),
        text_length=len(text)
    )

@app.post("/analyze-contract", response_model=ContractAnalysisResponse)
async def analyze_contract_file(file: UploadFile = File(...)):
    global global_contract_counter
    cid = global_contract_counter
    global_contract_counter += 1
    
    content = await file.read()
    text = extract_text_from_file(file.filename or "", content)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Contract text cannot be empty.")
    
    MEMORY_STORE["contracts"][cid] = text
    MEMORY_STORE["chat_history"][cid] = []
    
    # Groq TPM limitini aşmamak için çok uzun metinleri kırpıyoruz (yaklaşık 8000 token = 25000 karakter)
    if len(text) > 25000:
        text = text[:25000] + "\n\n... [SÖZLEŞMENİN GERİ KALANI ÇOK UZUN OLDUĞU İÇİN KESİLDİ] ..."

    request = ContractRequest(id=cid, name=file.filename or "contract", text=text, provider="groq")
    return await analyze(request)

class ChatRequest(BaseModel):
    contract_id: int
    contract_text: str
    user_message: str

class ChatResponse(BaseModel):
    answer: str

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_with_contract(request: ChatRequest):
    c_id = request.contract_id
    contract_text = MEMORY_STORE["contracts"].get(c_id, request.contract_text)
    history = MEMORY_STORE["chat_history"].get(c_id, [])
    
    system_prompt = f"Sen bir avukatsın. Aşağıdaki sözleşme metnine göre yasal soruları cevapla. Doğrudan maddelere veya sözleşmenin tümüne atıfta bulunabilirsin:\n\nSÖZLEŞME METNİ:\n{contract_text}"
    
    try:
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": request.user_message})
        
        if openai_client:
            completion = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
        else:
            completion = await groq_client.chat.completions.create(
                model="openai/gpt-oss-120b",
                reasoning_effort="medium",
                messages=messages
            )
            
        answer = completion.choices[0].message.content
        
        # Save to memory with constraint
        history.append({"role": "user", "content": request.user_message})
        history.append({"role": "assistant", "content": answer})
        if c_id in MEMORY_STORE["chat_history"]:
            MEMORY_STORE["chat_history"][c_id] = history[-20:]
            
        return ChatResponse(answer=answer)
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

class ReviseRequest(BaseModel):
    contract_text: str
    company_policy: str
    provider: str = "anthropic"

class ReviseResponse(BaseModel):
    revised_text: str

@app.post("/api/v1/revise", response_model=ReviseResponse)
async def revise_contract(request: ReviseRequest):
    system_prompt = (
        "Sen uzman bir şirket avukatısın. Sana verilen sözleşme metnini ve ŞİRKET POLİTİKASINI (company_policy) incele.\n"
        "Politikaya aykırı olan maddeleri tespit et ve sözleşmeyi politikaya tam uyacak şekilde, "
        "hukuki dilden sapmadan yeniden yaz. Sadece revize edilmiş SÖZLEŞME METNİNİ döndür, hiçbir ekstra açıklama yapma."
    )
    user_prompt = f"ŞİRKET POLİTİKASI:\n{request.company_policy}\n\nSÖZLEŞME:\n{request.contract_text}"

    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        if request.provider == "anthropic" and anthropic_client:
            completion = await anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=8000,
                temperature=0.2,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            ans = completion.content[0].text
        elif request.provider == "openai" and openai_client:
            completion = await openai_client.chat.completions.create(model="gpt-4o-mini", messages=messages)
            ans = completion.choices[0].message.content
        else:
            completion = await groq_client.chat.completions.create(model="openai/gpt-oss-120b", messages=messages)
            ans = completion.choices[0].message.content
        return ReviseResponse(revised_text=ans)
    except Exception as e:
        logger.error(f"Revise error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

class GenerateRequest(BaseModel):
    scenario: str
    provider: str = "anthropic"

class GenerateResponse(BaseModel):
    drafted_contract: str

@app.post("/api/v1/generate", response_model=GenerateResponse)
async def generate_contract(request: GenerateRequest):
    system_prompt = (
        "Sen kıdemli bir kurumsal avukatsın. Sana verilen SENARYO'ya dayanarak, "
        "ilgili kanunlara uygun, tüm standart koruyucu maddeleri (gizlilik, fesih, mücbir sebep, yetkili mahkeme) içeren, "
        "kapsamlı ve profesyonel bir sözleşme taslağı oluştur. Sadece SÖZLEŞME METNİNİ döndür."
    )
    user_prompt = f"SENARYO:\n{request.scenario}"

    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        if request.provider == "anthropic" and anthropic_client:
            completion = await anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=8000,
                temperature=0.3,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            ans = completion.content[0].text
        elif request.provider == "openai" and openai_client:
            completion = await openai_client.chat.completions.create(model="gpt-4o", messages=messages)
            ans = completion.choices[0].message.content
        else:
            completion = await groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=messages)
            ans = completion.choices[0].message.content
        return GenerateResponse(drafted_contract=ans)
    except Exception as e:
        logger.error(f"Generate error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
