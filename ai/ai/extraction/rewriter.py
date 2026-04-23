import os
from typing import List, Union
from groq import AsyncGroq
from ai.schemas import Violation

# Initialize the Groq client. Assumes GROQ_API_KEY is an environment variable.
client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", "dummy_key_for_mock_mode"))

MODEL_NAME = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """
Sen uzman bir hukuki danışmansın. 
Görevin, şirket politikalarını veya yasal sınırları ihlal eden riskli bir sözleşme maddesini (clause) kurallara ve yasalara uygun bir şekilde yeniden yazmaktır.
Sana orijinal madde ve tespit edilen ihlal (violation) nedenleri verilecek.
Sadece yeni madde metnini döndür, hiçbir açıklama, yorum veya giriş cümlesi ekleme.
"""

async def suggest_rewrite(clause_text: str, violations: Union[List[dict], List[Violation]]) -> str:
    """
    Riskli bir maddeyi verilen ihlal nedenlerine uygun olarak düzeltip LLM yardımıyla yeniden yazar.
    """
    if os.environ.get("GROQ_API_KEY") is None or os.environ.get("GROQ_API_KEY") == "dummy_key_for_mock_mode":
        return f"[MOCK REWRITE]: {clause_text} (Tespit edilen riskler ve ihlaller giderilecek şekilde yasalara uygun olarak düzeltildi.)"
        
    violation_texts = []
    for v in violations:
        if isinstance(v, Violation):
            violation_texts.append(v.message)
        elif isinstance(v, dict) and "message" in v:
            violation_texts.append(v["message"])
            
    violation_summary = ", ".join(violation_texts)
    
    user_prompt = f"İhlaller: {violation_summary}\n\nOrijinal Madde:\n{clause_text}"
    
    try:
        completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_NAME,
            temperature=0.3, # Daha deterministik bir rewrite
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error rewriting clause: {str(e)}")
        return "Yeniden yazım işlemi sırasında bir hata oluştu."
