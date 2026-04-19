import pandas as pd
import numpy as np
import joblib
import os
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix

# Veriyi yükle
df = pd.read_csv("data/datasets/synthetic_clauses.csv")

CLAUSE_TYPE_LIST = [
    "payment", "penalty", "termination",
    "confidentiality", "liability", "data_protection", "other"
]

le = LabelEncoder()
le.fit(CLAUSE_TYPE_LIST)
df["clause_type_enc"] = le.transform(df["clause_type"])

FEATURES = ["payment_term_days", "penalty_percentage", "ambiguity_flag", "clause_type_enc"]
X = df[FEATURES]
y = df["risk_label"]

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Scale
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Model eğit
model = LogisticRegression(random_state=42, max_iter=1000)
model.fit(X_train_scaled, y_train)

# Değerlendirme
print("=== Model Performansı ===")
y_pred = model.predict(X_test_scaled)
print(classification_report(y_test, y_pred))

cv_scores = cross_val_score(model, scaler.transform(X), y, cv=5)
print(f"Cross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

# Kaydet
os.makedirs("backend/ai/ml/saved_model", exist_ok=True)
joblib.dump({
    "model": model,
    "scaler": scaler,
    "encoder": le,
    "features": FEATURES
}, "backend/ai/ml/saved_model/risk_model.pkl")

print("\nModel kaydedildi: backend/ai/ml/saved_model/risk_model.pkl")