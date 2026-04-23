import json
import os
import pandas as pd

def parse_cuad():
    """
    Kök dizindeki data/CUAD_v1/CUAD_v1.json dosyasını okuyup, 
    risk analizi ve clause tespiti için yerel bir DataFrame'e çevirir.
    """
    cuad_path = os.path.join(os.path.dirname(__file__), "../../data/CUAD_v1/CUAD_v1.json")
    
    if not os.path.exists(cuad_path):
        print(f"Hata: CUAD veri seti bulunamadı. Yol: {cuad_path}")
        return None

    print(f"📖 CUAD Veri Seti Okunuyor: {cuad_path}")
    
    with open(cuad_path, "r", encoding="utf-8") as f:
        cuad_data = json.load(f)["data"]
        
    extracted_clauses = []
    
    # CUAD SQuAD formatındadır.
    for doc in cuad_data:
        title = doc["title"]
        for para in doc["paragraphs"]:
            context = para["context"]
            for qa in para["qas"]:
                question = qa["question"]
                is_impossible = qa.get("is_impossible", False)
                answers = qa.get("answers", [])
                
                # Biz şimdilik Termination, Penalty, Warranty gibi riskli maddeleri çekiyoruz.
                if not is_impossible and len(answers) > 0:
                    for ans in answers:
                        extracted_clauses.append({
                            "document": title,
                            "clause_type": question, # Soru genelde clause tipini belirtir
                            "clause_text": ans["text"],
                            "is_risk_related": 1 if any(kw in question.lower() for kw in ["terminate", "penalty", "warranty", "liability", "audit"]) else 0
                        })
                        
    df = pd.DataFrame(extracted_clauses)
    output_path = os.path.join(os.path.dirname(__file__), "cuad_parsed_clauses.csv")
    df.to_csv(output_path, index=False)
    
    print(f"✅ CUAD ayrıştırıldı! Toplam {len(df)} adet gerçek dünya sözleşme maddesi çıkarıldı.")
    print(f"💾 Kayıt yeri: {output_path}")
    return df

if __name__ == "__main__":
    parse_cuad()
