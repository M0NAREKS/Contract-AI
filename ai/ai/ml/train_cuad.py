import os
import ast
import pandas as pd
import joblib
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

def load_cuad_csv(filepath):
    print("CUAD CSV veri seti yükleniyor...")
    df_csv = pd.read_csv(filepath)
    
    HIGH_RISK_COLS = ["Uncapped Liability", "Liquidated Damages", "Termination For Convenience", "Non-Compete", "Exclusivity"]
    MEDIUM_RISK_COLS = ["Audit Rights", "Warranty Duration", "Post-Termination Services", "Rofr/Rofo/Rofn", "Change Of Control", "Anti-Assignment"]
    LOW_RISK_COLS = ["Governing Law", "Parties", "Document Name"]
    
    samples = []
    
    def extract_texts(row, cols, label):
        for col in cols:
            if col in row and pd.notna(row[col]):
                val = str(row[col]).strip()
                if val.startswith("[") and val.endswith("]"):
                    try:
                        texts = ast.literal_eval(val)
                        if isinstance(texts, list):
                            for text in texts:
                                if len(text) > 20:
                                    samples.append({'text': text, 'risk_class': label})
                    except:
                        pass

    for _, row in df_csv.iterrows():
        extract_texts(row, HIGH_RISK_COLS, 2)
        extract_texts(row, MEDIUM_RISK_COLS, 1)
        extract_texts(row, LOW_RISK_COLS, 0)
        
    df = pd.DataFrame(samples)
    print(f"Toplam {len(df)} adet metin örneği çıkarıldı.")
    return df

def train_nlp_model():
    data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "CUAD_v1", "master_clauses.csv")
    if not os.path.exists(data_path):
        print(f"HATA: CUAD CSV veri seti bulunamadı -> {data_path}")
        return
        
    df = load_cuad_csv(data_path)
    
    if len(df) == 0:
        print("Hata: Çıkarılan veri yok!")
        return

    X = df['text']
    y = df['risk_class']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=2500, min_df=2, stop_words='english', ngram_range=(1, 2))),
        ('classifier', LogisticRegression(max_iter=1500, class_weight='balanced', C=0.3)) # L2 Regularization
    ])
    
    print("NLP Modeli Eğitiliyor (TF-IDF + Logistic Regression)...")
    pipeline.fit(X_train, y_train)
    
    score = pipeline.score(X_test, y_test)
    print(f"\nTest Accuracy: {score:.2f}")
    
    y_pred = pipeline.predict(X_test)
    print("\nSınıflandırma Raporu:")
    print(classification_report(y_test, y_pred, target_names=["Low", "Medium", "High"], zero_division=0))
    
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, 'cuad_nlp_model.pkl')
    
    joblib.dump(pipeline, model_path)
    print(f"\nNLP Modeli başarıyla kaydedildi: {model_path}")

if __name__ == "__main__":
    train_nlp_model()
