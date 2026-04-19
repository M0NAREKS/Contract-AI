import os
import joblib
import warnings
from ai.ml.features import build_feature_vector

# Uyarıları gizle (scaler versiyon uyuşmazlığı vs.)
warnings.filterwarnings("ignore", category=UserWarning)

model_path = os.path.join(os.path.dirname(__file__), "models/risk_model.pkl")

_model_bundle = None

def get_model():
    """
    Kaydedilmiş ML model dosyasını cache'e alır ve fırlatır.
    """
    global _model_bundle
    if _model_bundle is None and os.path.exists(model_path):
        _model_bundle = joblib.load(model_path)
    return _model_bundle

def score_risk(clause: dict) -> dict:
    """
    Pydantic formatındaki clause dict'ini alıp risk_score ve risk_level döner.
    {
       "clause_id": 1,
       "text": "...",
       "features": {...}
    }
    """
    bundle = get_model()
    if not bundle:
        # Eğer henüz model eğitilmemişse default dön
        return {"risk_score": 0.0, "risk_level": "low"}
        
    model = bundle["model"]
    scaler = bundle["scaler"]
    
    vec = build_feature_vector(clause)
    
    # Skalalama işlemi
    scaled_vec = scaler.transform([vec])
    
    # Risk (probability of class 1)
    risk_prob = float(model.predict_proba(scaled_vec)[0][1])
    
    # Risk Level Mapping
    if risk_prob < 0.3:
        level = "low"
    elif risk_prob < 0.7:
        level = "medium"
    else:
        level = "high"
        
    return {
        "risk_score": round(risk_prob, 2),
        "risk_level": level
    }