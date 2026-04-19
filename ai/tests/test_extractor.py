import os
import pytest
from ai.extraction.clause_extractor import extract_clauses

# Helper to read dummy contract
def get_dummy_contract():
    path = os.path.join(os.path.dirname(__file__), "../../../data/test_cases/dummy_contract.txt")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@pytest.mark.asyncio
async def test_extract_clauses_produces_valid_schema():
    use_mock = not bool(os.environ.get("GROQ_API_KEY"))

    text = get_dummy_contract()
    result = await extract_clauses(text, mock=use_mock)
    
    # Assertions based on our dummy contract
    assert result is not None
    assert result.total_clauses >= 4  # Olası olarak başlık vs ayrı düşünülürse en az 4 olmalı
    assert len(result.clauses) == result.total_clauses
    
    # Check if clause types and features are extracted correctly
    clause_types_found = [c.clause_type for c in result.clauses]
    assert "payment" in clause_types_found
    assert "penalty" in clause_types_found
    assert "confidentiality" in clause_types_found
    assert "termination" in clause_types_found
    
    # Verify specific feature extraction values (e.g. payment_term_days = 30)
    payment_clause = next((c for c in result.clauses if c.clause_type == "payment"), None)
    assert payment_clause is not None
    assert payment_clause.features.payment_term_days == 30
    
    penalty_clause = next((c for c in result.clauses if c.clause_type == "penalty"), None)
    assert penalty_clause is not None
    assert penalty_clause.features.penalty_percentage == 5.0
