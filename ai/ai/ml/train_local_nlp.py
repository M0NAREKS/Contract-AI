import os
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix

def train_local_nlp():
    dataset_path = os.path.join(os.path.dirname(__file__), "cuad_parsed_clauses.csv")
    if not os.path.exists(dataset_path):
        print("Dataset bulunamadı. Lütfen önce cuad_parser.py çalıştırın.")
        return
        
    print(f"Loading real CUAD data: {dataset_path}")
    df = pd.read_csv(dataset_path)
    
    # Metni olmayan veya etiketi olmayanları temizle
    df = df.dropna(subset=['clause_text', 'is_risk_related'])
    
    X_text = df['clause_text']
    y = df['is_risk_related'].astype(int)
    
    print(f"Dataset Size: {len(X_text)} clauses.")
    
    X_train, X_test, y_train, y_test = train_test_split(X_text, y, test_size=0.2, random_state=42, stratify=y)
    
    print("🧠 TF-IDF + Neural Network (MLP) Pipeline Oluşturuluyor...")
    
    # NLP Pipeline: Advanced Tfidf extraction -> MLP
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=10000, stop_words='english', ngram_range=(1, 2))),
        ('mlp', MLPClassifier(hidden_layer_sizes=(128,), max_iter=200, early_stopping=True, verbose=True, random_state=42))
    ])
    
    print("🚀 Pipeline Eğitiliyor (CUAD Gerçek Metinler)...")
    pipeline.fit(X_train, y_train)
    
    print("\n=== Model Performansı (Test Seti) ===")
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]
    
    print(classification_report(y_test, y_pred))
    
    try:
        auc_score = roc_auc_score(y_test, y_proba)
        print(f"ROC AUC Score: {auc_score:.4f}")
    except ValueError:
        pass
        
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    model_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(model_dir, exist_ok=True)
    
    save_path = os.path.join(model_dir, "nlp_risk_model.pkl")
    joblib.dump(pipeline, save_path)
    print(f"\n✅ Derin Öğrenme Lisan Modeli kaydedildi: {save_path}")

if __name__ == "__main__":
    train_local_nlp()
