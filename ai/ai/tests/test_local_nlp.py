import joblib
import os

def test_nlp_model():
    model_path = os.path.join(os.path.dirname(__file__), "../ml/models/local_nlp_model.pkl")
    
    if not os.path.exists(model_path):
        print("Model bulunamadı!")
        return

    # Modeli ve vektörleştiriciyi yükle
    bundle = joblib.load(model_path)
    vectorizer = bundle["vectorizer"]
    model = bundle["model"]

    # Rastgele uç (Edge Case) test cümleleri (İngilizce - CUAD ile eğitildiği için)
    test_clauses = [
        # Normal risksiz ödeme koşulu
        "The client shall pay the invoice within 30 days of receipt without any deductions.",
        # Çok ağır bir ceza maddesi
        "If the payment is delayed, a penalty of 15% per month will be immediately applied.",
        # Tek taraflı fesih / Warranty içeren riskli maddeler
        "Either party may terminate this agreement at any time for convenience with 3 days prior written notice.",
        # Belirsiz, yoruma açık kelimeler barındıran madde
        "We will try our best effort to provide the maintenance services as soon as possible if necessary.",
        # Masum görünen ama Liability barındıran bir gizlilik maddesi
        "The receiving party shall be strictly liable for any breach of confidentiality up to $5,000,000."
    ]

    print("🔍 Lokal TF-IDF NLP Modeli Test Merkezi\n" + "="*50)

    # Cümleleri matematiksel matrise (TF-IDF) dönüştür
    X_test = vectorizer.transform(test_clauses)
    
    # Model Tahmini
    predictions = model.predict(X_test)
    probs = model.predict_proba(X_test)

    for i, clause in enumerate(test_clauses):
        print(f"📄 Madde: '{clause}'")
        is_risky = bool(predictions[i])
        risk_prob = probs[i][1]
        
        # Olasılığa göre seviye belirleme
        level = "🔴 YÜKSEK RİSK" if risk_prob > 0.7 else ("🟠 ORTA RİSK" if risk_prob > 0.4 else "🟢 DÜŞÜK RİSK")
        
        print(f"👉 Analiz: {level} (Risk Skoru: {risk_prob:.2f})\n")

if __name__ == "__main__":
    test_nlp_model()
