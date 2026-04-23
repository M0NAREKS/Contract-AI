from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import pandas as pd
import os

def train_model():
    dataset_path = os.path.join(os.path.dirname(__file__), "../../data/datasets/synthetic_clauses.csv")
    if not os.path.exists(dataset_path):
        print("Dataset bulunamadı. Lütfen önce generate_synthetic.py scriptini çalıştırın.")
        return

    df = pd.read_csv(dataset_path)
    
    le = LabelEncoder()
    df["clause_type_enc"] = le.fit_transform(df["clause_type"])

    X = df[["payment_term_days", "penalty_percentage", "ambiguity_flag", "clause_type_enc"]]
    # Logistic Regression sınıflandırma bekler, bu yüzden risk_label > 0.5 ise riskli (1) yapıyoruz.
    y = (df["risk_label"] >= 0.5).astype(int)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = LogisticRegression()
    model.fit(X_train_scaled, y_train)

    print("Model Eğitimi Tamamlandı. Test Sonuçları:")
    print(classification_report(y_test, model.predict(X_test_scaled)))
    
    model_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(model_dir, exist_ok=True)
    
    model_bundle = {"model": model, "scaler": scaler, "encoder": le}
    joblib.dump(model_bundle, os.path.join(model_dir, "risk_model.pkl"))
    print("✅ Model kaydedildi: ai/ml/models/risk_model.pkl")

if __name__ == "__main__":
    train_model()
