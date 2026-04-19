import asyncio
import os
from ai.extraction.clause_extractor import extract_clauses

# Gerçek dünya testi için ground truth etiketleri
GROUND_TRUTH = [
    {"clause_id": 1, "clause_type": "payment"},
    {"clause_id": 2, "clause_type": "penalty"},
    {"clause_id": 3, "clause_type": "confidentiality"},
    {"clause_id": 4, "clause_type": "termination"}
]

async def run_accuracy_test():
    # Test verisinin bulunduğu yol
    file_path = os.path.join(os.path.dirname(__file__), "../../../data/test_cases/dummy_contract.txt")
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()

    print("Extraction başlatılıyor...")
    # Mock modunda koşturarak test senaryosunu hızlıca sınıyoruz
    # Gerçek API kullanmak için mock=False yapıp .env'e GROQ_API_KEY eklenebilir.
    use_mock = not bool(os.environ.get("GROQ_API_KEY"))
    result = await extract_clauses(text, mock=use_mock)
    
    predictions = result.clauses
    correct = 0
    total = len(GROUND_TRUTH)
    
    print(f"Tanınan madde sayısı: {len(predictions)} / Beklenen: {total}")

    for gt in GROUND_TRUTH:
        pred = next((c for c in predictions if c.clause_id == gt["clause_id"]), None)
        if pred and pred.clause_type == gt["clause_type"]:
            correct += 1
            print(f"  [Başarılı] Madde {gt['clause_id']} tipi '{gt['clause_type']}' olarak doğru bilindi.")
        else:
            wrong_type = pred.clause_type if pred else "Bulunamadı"
            print(f"  [Hata] Madde {gt['clause_id']} beklenti: '{gt['clause_type']}', bulunan: '{wrong_type}'")

    accuracy = correct / total if total > 0 else 0
    print("-" * 30)
    print(f"Classification accuracy: {accuracy:.1%}")
    assert accuracy >= 0.8, "Doğruluk %80'in altında!"

if __name__ == "__main__":
    asyncio.run(run_accuracy_test())
