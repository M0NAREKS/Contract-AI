import re
import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EXTRACTION_PROMPT = """
Verilen sözleşme maddesinden yapısal veriyi JSON formatında çıkar.

Döndürmen gereken format:
{
  "payment_term_days": null,
  "penalty_percentage": null,
  "notice_period_days": null,
  "duration_years": null
}

Kurallar:
- Gün/hafta/ay/yıl ifadelerini güne çevir (1 ay = 30 gün, 1 yıl = 365 gün)
- Yüzde ifadelerini sayıya çevir (%15 → 15.0)
- Değer yoksa null döndür
- Sadece JSON döndür
"""

def extract_features(clause_text: str, clause_type: str) -> dict:
    """
    Madde metninden sayısal feature'ları çıkarır.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": EXTRACTION_PROMPT},
                {"role": "user", "content": f"Clause type: {clause_type}\n\nMadde: {clause_text}"}
            ],
            temperature=0
        )
        return json.loads(response.choices[0].message.content)

    except Exception as e:
        print(f"Feature extraction hatası: {e}")
        return {
            "payment_term_days": None,
            "penalty_percentage": None,
            "notice_period_days": None,
            "duration_years": None
        }