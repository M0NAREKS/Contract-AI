import os
import json
import asyncio
from typing import Dict, Any
from dotenv import load_dotenv
from groq import AsyncGroq
from openai import AsyncOpenAI
from ai.schemas import ContractAnalysisResult

# Çevresel değişkenleri yükle (.env dosyasından)
load_dotenv()

openai_api_key = os.environ.get("OPENAI_API_KEY")
groq_api_key = os.environ.get("GROQ_API_KEY", "dummy_key_for_mock_mode")

openai_client = AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None
groq_client = AsyncGroq(api_key=groq_api_key)

GROQ_MODEL = "openai/gpt-oss-120b"
OPENAI_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = """
Sen uzman bir hukuki analiz yapay zekasısın.
Görevlerin şunlardır:
1. Sözleşmenin türünü 'contract_category' (ör. Kira Sözleşmesi, Hizmet Sözleşmesi vb.) olarak belirle.
2. Sözleşme metnini maddelere ayır (clause by clause). Pydantic formatına uygun bir JSON listesi oluştur.
3. Her bir maddeyi (clause_type) şu türlerden biriyle sınıflandır: "payment", "penalty", "termination", "confidentiality", "liability", "data_protection", "other".
4. Parametrik verileri (vade süresi, ceza oranı, ihbar süresi vb.) "features" sözlüğüne çıkar.
5. "Makul", "en kısa sürede", "gerekirse", "kendi takdirine bağlı olarak" gibi yoruma açık ifadeler yakalarsan "ambiguity_flag" değerini true yap. Bulduğun şüpheli kelimeleri "ambiguous_phrases" dizisine koy.
6. RİSK PUANLAMA (Risk Scorer): Her madde için 0.0 ile 1.0 arasında bir "risk_score" üret. Skorlara göre "risk_level" alanını belirle: 0.0-0.3 "low", 0.3-0.7 "medium", 0.7-1.0 "high". Yüksek risk ("high") taşıyan ve dezavantajlı bulduğun tüm maddeler için sözleşmeyi daha dengeli veya taraf lehine koruyucu hale getirecek bir alternatif metni "rewrite_suggestion" alanına yaz. Riskli değilse null bırak.
7. İHLAL ANALİZİ (Violations): Standart ticari sözleşme poliçelerine göre ihlalleri bul. Örneğin: "Ödeme 60 günü aşamaz", "Ceza oranı %20'den fazla olamaz" gibi kurallar çiğnendiğinde "violations" listesine ekle. Objeler {"rule_id": "İHLAL_KODU", "severity": "violation", "message": "Açıklama"} formatında olmalıdır.
8. EKSİK MADDE KONTROLÜ VE ÖZET (Summary): Tüm analizi bitirdikten sonra ana JSON nesnesindeki "summary" alanına, eksik olan kritik sözleşme maddelerini "missing_clauses" listesine ve sözleşme geneli hakkındaki profesyonel analizini "executive_summary" alanına ekle.

Lütfen çıktının SADECE ContractAnalysisResult modeline tam uyan bir JSON olmasını sağla. Markup etiketleri kullanma.

Örnek Dönüş Formatı:
{
  "contract_category": "Hizmet Sözleşmesi",
  "total_clauses": 1,
  "summary": {
    "executive_summary": "Sözleşme teknik olarak standarttır ancak ödeme süreleri uzundur.",
    "missing_clauses": ["liability", "data_protection"]
  },
  "clauses": [
    {
      "clause_id": 1,
      "text": "Ödeme 90 gün içinde yapılacaktır.",
      "clause_type": "payment",
      "features": {
        "payment_term_days": 90,
        "penalty_percentage": null,
        "notice_period_days": null,
        "duration_years": null,
        "ambiguity_flag": false,
        "ambiguous_phrases": []
      },
      "risk_score": 0.85,
      "risk_level": "high",
      "rewrite_suggestion": "Hizmet bedeli sözleşme tarihinden itibaren 30 gün içinde ödenecektir.",
      "violations": [
        {
          "rule_id": "V-PAY-01",
          "severity": "violation",
          "message": "Ödeme süresi 60 günü aşıyor, bu şirket politikasına aykırıdır."
        }
      ]
    }
  ]
}
"""

MOCK_RESPONSE = {
  "contract_category": "Servis Sözleşmesi",
  "total_clauses": 4,
  "summary": {
    "executive_summary": "Mocked successful extraction. The contract appears standard but contains a high penalty clause and an ambiguous termination condition.",
    "missing_clauses": ["liability", "data_protection"]
  },
  "clauses": [
    {
      "clause_id": 1,
      "text": "Hizmet bedeli fatura tarihinden itibaren 30 gün içinde ödenecektir.",
      "clause_type": "payment",
      "features": {
        "payment_term_days": 30,
        "penalty_percentage": None,
        "ambiguity_flag": False
      },
      "risk_score": 0.1,
      "risk_level": "low",
      "rewrite_suggestion": None,
      "violations": []
    },
    {
      "clause_id": 2,
      "text": "Ödemenin belirtilen süre içinde yapılmaması durumunda, aylık %5 oranında gecikme cezası uygulanacaktır.",
      "clause_type": "penalty",
      "features": {
        "payment_term_days": None,
        "penalty_percentage": 5.0,
        "ambiguity_flag": False
      },
      "risk_score": 0.8,
      "risk_level": "high",
      "rewrite_suggestion": "Olası gecikmelerde gecikme cezası aylık en fazla %1 oranında uygulanacaktır.",
      "violations": [
        {"rule_id": "P-01", "severity": "violation", "message": "Aylık %5 oranında gecikme cezası yasal sınırların üzerindedir."}
      ]
    },
    {
      "clause_id": 3,
      "text": "Taraflar birbirlerine ait her türlü ticari ve teknik bilgiyi sözleşme süresince ve bittikten sonra 3 yıl süreyle gizli tutmayı kabul eder.",
      "clause_type": "confidentiality",
      "features": {
        "payment_term_days": None,
        "penalty_percentage": None,
        "ambiguity_flag": False
      },
      "risk_score": 0.2,
      "risk_level": "low",
      "rewrite_suggestion": None,
      "violations": []
    },
    {
      "clause_id": 4,
      "text": "Herhangi bir taraf, diğer tarafa 15 gün önceden yazılı bildirimde bulunmak suretiyle sözleşmeyi feshedebilir. Taraflar, olası uyuşmazlıkları makul bir sürede çözmek için iyi niyet çerçevesinde gayret gösterecektir.",
      "clause_type": "termination",
      "features": {
        "payment_term_days": None,
        "penalty_percentage": None,
        "ambiguity_flag": True
      },
      "risk_score": 0.6,
      "risk_level": "medium",
      "rewrite_suggestion": None,
      "violations": []
    }
  ]
}

from ai.ml.risk_scorer import score_risk

async def extract_clauses(text: str, mock: bool = False) -> ContractAnalysisResult:
    """
    Sözleşme metnini Groq LLM kullanarak JSON formatında maddelere ayırır ve yapılandırılmış 
    özellikleri çıkarır. LLM'den gelen verileri Lokal Makine Öğrenmesi (ML) 
    modelimize gönderip Risk Skoru ile zenginleştirir.
    """
    try:
        if mock:
            data = MOCK_RESPONSE
        else:
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text}
            ]
            if openai_client:
                completion = await openai_client.chat.completions.create(
                    messages=messages,
                    model=OPENAI_MODEL,
                    temperature=0.0,
                    response_format={"type": "json_object"},
                )
            else:
                completion = await groq_client.chat.completions.create(
                    messages=messages,
                    model=GROQ_MODEL,
                    temperature=0.0,
                    reasoning_effort="medium",
                    response_format={"type": "json_object"},
                )
            data = json.loads(completion.choices[0].message.content)
            
        # 🚀 LOKAL ML MODELİ ENTEGRASYONU (Risk Skorlama)
        # LLM'nin çıkardığı features'ları ML modeline sokup asıl risk değerlerini çekiyoruz
        for clause in data.get("clauses", []):
            ml_risk_data = score_risk(clause)
            clause["risk_score"] = float(ml_risk_data["risk_score"])
            clause["risk_level"] = ml_risk_data["risk_level"]
        
        # Pydantic modeline dönüştürerek schema doğrulaması yap
        return ContractAnalysisResult(**data)
    except Exception as e:
        print(f"Error extracting clauses: {str(e)}")
        # Arıza durumunda boş bir sonuç döndür
        return ContractAnalysisResult(total_clauses=0, clauses=[], summary={"error": str(e)})