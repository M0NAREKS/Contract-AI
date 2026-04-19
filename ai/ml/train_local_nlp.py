import os
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

def train_local_nlp():
    dataset_path = os.path.join(os.path.dirname(__file__), "cuad_parsed_clauses.csv")
    if not os.path.exists(dataset_path):
        print("Dataset bulunamadı. Lütfen önce cuad_parser.py çalıştırın.")
        return
        
    df = pd.read_csv(dataset_path)
    # Metni olmayan veya etiketi olmayanları temizle
    df = df.dropna(subset=['clause_text', 'is_risk_related'])
    
    X_text = df['clause_text']
    y = df['is_risk_related'].astype(int)
    
    print(f"📊 TF-IDF Vektörleştirici Eğitiliyor ({len(X_text)} kayıt)...")
    # İngilizce stop words ve n-gram'lar ile gelişmiş lokal kelime analizörü
    vectorizer = TfidfVectorizer(max_features=5000, stop_words='english', ngram_range=(1, 2))
    X_features = vectorizer.fit_transform(X_text)
    
    X_train, X_test, y_train, y_test = train_test_split(X_features, y, test_size=0.2, random_state=42)
    
    print("🧠 Logistic Regression Modeli Eğitiliyor (Sadece Lokal İşlemci İle)...")
    # Dataset dengesiz olabilir diye class_weight='balanced' kullanıyoruz
    model = LogisticRegression(class_weight='balanced', max_iter=1000)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print("\n✅ Model Eğitimi Başarılı! Lokal Modelin Doğruluk Raporu:\n")
    print(classification_report(y_test, y_pred))
    
    model_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(model_dir, exist_ok=True)
    
    bundle = {
        "vectorizer": vectorizer,
        "model": model
    }
    
    save_path = os.path.join(model_dir, "local_nlp_model.pkl")
    joblib.dump(bundle, save_path)
    print(f"💾 Tamamen Lokal NLP Modeli kaydedildi: {save_path}")

if __name__ == "__main__":
    train_local_nlp()
