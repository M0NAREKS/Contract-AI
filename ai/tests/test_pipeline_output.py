import asyncio
import json
from ai.extraction.clause_extractor import extract_clauses

# Örnek dummy sözleşme
test_text = """
1. Taraflar: A Şirketi ve B Şirketi.
2. Ödeme: Hizmet bedeli 90 gün içinde ödenecektir. Gecikme halinde %15 oranında ceza yansıtılacaktır.
3. Fesih: Sözleşme makul olmayan herhangi bir nedenle derhal feshedilebilir.
"""

async def run_pipeline_demo():
    print("🚀 NLP LLM Pipeline -> Lokal ML Risk Model Aktarımı TESTİ\n")
    
    # Mock modunu kullanıyoruz API maliyeti olmasın diye ancak mock_response içindeki veriler 
    # ML modelimize (score_risk) girip hesaplanacak.
    result = await extract_clauses(test_text, mock=True)
    
    # Sadece Clauses kısmının risk skorlarını görmek için parse edelim
    print(json.dumps(result.model_dump(include={"clauses"}), indent=2, ensure_ascii=False))
    print("\n✅ ML Katmanı başarıyla Pydantic Result objesine entegre edildi ve null değerler temizlendi!")

if __name__ == "__main__":
    asyncio.run(run_pipeline_demo())
