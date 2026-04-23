import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

def train_gradient_boosting_model():
    # Find dataset path
    dataset_path = os.path.join(os.path.dirname(__file__), "../../data/datasets/synthetic_clauses.csv")
    if not os.path.exists(dataset_path):
        dataset_path = "data/datasets/synthetic_clauses.csv"

    print(f"Veri yükleniyor: {dataset_path}")
    df = pd.read_csv(dataset_path)

    CLAUSE_TYPE_LIST = [
        "payment", "penalty", "termination",
        "confidentiality", "liability", "data_protection", "other"
    ]

    le = LabelEncoder()
    le.fit(CLAUSE_TYPE_LIST)
    
    # Handle unseen clause types
    df["clause_type"] = df["clause_type"].apply(lambda x: x if x in CLAUSE_TYPE_LIST else "other")
    df["clause_type_enc"] = le.transform(df["clause_type"])

    FEATURES = ["payment_term_days", "penalty_percentage", "ambiguity_flag", "clause_type_enc"]
    X = df[FEATURES]
    
    # Hedef değişkenini (risk skoru 0-1) binary risk etiketine (1 veya 0) çevir
    y = (df["risk_label"] >= 0.5).astype(int)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print("=== HistGradientBoosting Modeli Eğitiliyor (Grid Search) ===")
    
    gb_base = HistGradientBoostingClassifier(random_state=42)
    
    param_grid = {
        'max_iter': [50, 100, 200],
        'max_depth': [3, 5, 7],
        'learning_rate': [0.01, 0.1, 0.2]
    }
    
    grid_search = GridSearchCV(
        estimator=gb_base,
        param_grid=param_grid,
        scoring='roc_auc',
        cv=3,
        n_jobs=-1,
        verbose=1
    )
    
    grid_search.fit(X_train_scaled, y_train)
    
    best_model = grid_search.best_estimator_
    print(f"\nEn iyi hiperparametreler: {grid_search.best_params_}")

    # Değerlendirme
    print("\n=== Gradient Boosting Model Performansı (Test Seti) ===")
    y_pred = best_model.predict(X_test_scaled)
    y_proba = best_model.predict_proba(X_test_scaled)[:, 1]
    
    print(classification_report(y_test, y_pred))
    try:
        auc_score = roc_auc_score(y_test, y_proba)
        print(f"ROC AUC Score: {auc_score:.4f}")
    except ValueError:
        print("Tüm test setinde tek bir sınıf olabilir, ROC hesaplanamadı.")
        
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Cross Val
    cv_scores = cross_val_score(best_model, scaler.transform(X), y, cv=5, scoring='accuracy')
    print(f"\nCross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

    # Modeli Kaydet
    save_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(save_dir, exist_ok=True)
    
    model_path = os.path.join(save_dir, "risk_model.pkl")
    joblib.dump({
        "model": best_model,
        "scaler": scaler,
        "encoder": le,
        "features": FEATURES
    }, model_path)
    
    print(f"\n✅ Gelişmiş Risk Modeli kaydedildi: {model_path}")

if __name__ == "__main__":
    train_gradient_boosting_model()