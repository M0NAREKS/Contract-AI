import os
import pytest
from ai.extraction.clause_extractor import extract_clauses
from ai.extraction.rewriter import suggest_rewrite
from ai.schemas import Violation

@pytest.mark.asyncio
async def test_empty_contract():
    use_mock = not bool(os.environ.get("GROQ_API_KEY"))
    text = "   \n  " # Boş veya anlamsız
    result = await extract_clauses(text, mock=use_mock)
    
    # Beklenti: Ya validasyon hatası vermemeli, ya total_clauses = 0 dönmeli
    # Gerçek LLM'e giderse de empty object bekliyoruz.
    assert result is not None
    # Eğer API'deyse muhtemelen maddesi olmadığı için clauses=0 veya mock kullanılıyorsa mock_response gelir.
    # Mock kullanılıyorsa test_extractor onu 4 dönecektir.

@pytest.mark.asyncio
async def test_very_short_text():
    use_mock = not bool(os.environ.get("GROQ_API_KEY"))
    text = "Sözleşme tek bir cümledir ve herhangi bir bağlayıcılığı yoktur."
    result = await extract_clauses(text, mock=use_mock)
    
    assert result is not None

@pytest.mark.asyncio
async def test_rewriter():
    # Rewrite suggestion sistemine edge case ihlalleri atalım
    mock_violations = [
        Violation(rule_id="R-1", severity="violation", message="Çok ağır bir oran.")
    ]
    rewritten = await suggest_rewrite("Bozarsan faiz ödersin.", violations=mock_violations)
    assert rewritten is not None
    assert len(rewritten) > 0
