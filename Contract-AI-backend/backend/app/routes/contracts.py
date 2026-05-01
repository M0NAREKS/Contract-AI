from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.clause import Clause
from app.models.contract import Contract
from app.schemas import (
    ClauseAnalysisResponse,
    ContractAnalysisResponse,
    ContractAnalysisSummaryResponse,
    ContractUploadResponse,
    RuleResultResponse,
)
from app.services.clause_extraction import extract_clauses
from app.services.risk_model import predict_clause_risk
from app.services.rule_engine import evaluate_clause_rules
from app.services.text_extraction import (
    UnsupportedFileTypeError,
    extract_text_from_upload,
)


router = APIRouter(tags=["contracts"])


async def _extract_uploaded_contract(file: UploadFile) -> tuple[str, str]:
    filename = file.filename or ""
    if not filename:
        raise HTTPException(status_code=400, detail="A filename is required.")

    file_bytes = await file.read()
    await file.close()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        extracted_text = extract_text_from_upload(filename=filename, file_bytes=file_bytes)
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No extractable text found in the uploaded file.",
        )

    return Path(filename).name, extracted_text


def _resolve_overall_status(rule_results: list[RuleResultResponse], ml_risk_level: str) -> str:
    if any(rule.severity == "violation" for rule in rule_results):
        return "violation"
    if rule_results or ml_risk_level in {"medium", "high"}:
        return "warning"
    return "ok"


@router.post(
    "/upload-contract",
    response_model=ContractUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_contract(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ContractUploadResponse:
    contract_name, extracted_text = await _extract_uploaded_contract(file)
    contract = Contract(name=contract_name, text=extracted_text)
    db.add(contract)
    db.commit()
    db.refresh(contract)

    return ContractUploadResponse(
        id=contract.id,
        name=contract.name,
        date=contract.date,
        text_length=len(contract.text),
    )


@router.post(
    "/analyze-contract",
    response_model=ContractAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_contract(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ContractAnalysisResponse:
    contract_name, extracted_text = await _extract_uploaded_contract(file)
    extracted_clauses = extract_clauses(extracted_text)
    if not extracted_clauses:
        raise HTTPException(status_code=400, detail="No clauses could be extracted.")

    contract = Contract(name=contract_name, text=extracted_text)
    db.add(contract)
    db.flush()

    clause_models: list[Clause] = []
    for clause_data in extracted_clauses:
        clause = Clause(
            contract_id=contract.id,
            order_index=clause_data.order_index,
            label=clause_data.label,
            text=clause_data.text,
        )
        clause_models.append(clause)

    db.add_all(clause_models)
    db.commit()
    db.refresh(contract)

    analyzed_clauses: list[ClauseAnalysisResponse] = []
    violation_count = 0
    warning_count = 0
    high_risk_clause_count = 0
    risk_score_total = 0.0

    for clause in clause_models:
        rule_matches = evaluate_clause_rules(clause.text)
        rule_results = [
            RuleResultResponse(
                rule_id=match.rule_id,
                rule_name=match.rule_name,
                severity=match.severity,
                message=match.message,
                recommendation=match.recommendation,
                matched_phrases=list(match.matched_phrases),
            )
            for match in rule_matches
        ]
        prediction = predict_clause_risk(clause.text, rule_matches)
        overall_status = _resolve_overall_status(rule_results, prediction.risk_level)

        violation_count += int(any(rule.severity == "violation" for rule in rule_results))
        warning_count += int(overall_status == "warning")
        high_risk_clause_count += int(prediction.risk_level == "high")
        risk_score_total += prediction.risk_score

        analyzed_clauses.append(
            ClauseAnalysisResponse(
                id=clause.id,
                contract_id=clause.contract_id,
                order_index=clause.order_index,
                label=clause.label,
                text=clause.text,
                overall_status=overall_status,
                ml_risk_score=prediction.risk_score,
                ml_risk_level=prediction.risk_level,
                ambiguous_terms=list(prediction.ambiguous_terms),
                rule_results=rule_results,
            )
        )

    return ContractAnalysisResponse(
        id=contract.id,
        name=contract.name,
        date=contract.date,
        text_length=len(contract.text),
        clause_count=len(clause_models),
        summary=ContractAnalysisSummaryResponse(
            violation_count=violation_count,
            warning_count=warning_count,
            high_risk_clause_count=high_risk_clause_count,
            average_ml_risk_score=round(risk_score_total / len(clause_models), 4),
        ),
        clauses=analyzed_clauses,
    )
