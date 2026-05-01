import os
import joblib
import pandas as pd
import warnings

warnings.filterwarnings("ignore", category=UserWarning)

model_path = os.path.join(os.path.dirname(__file__), "models/cuad_nlp_model.pkl")

_nlp_pipeline = None

def get_model():
    """
    Kaydedilmiş NLP Pipeline modelini cache'e alır ve fırlatır.
    """
    global _nlp_pipeline
    if _nlp_pipeline is None and os.path.exists(model_path):
        _nlp_pipeline = joblib.load(model_path)
    return _nlp_pipeline

def score_risk(clause: dict) -> dict:
    """
    Sözleşme metnini (text) alıp CUAD eğitilmiş NLP modelinden geçirerek risk skoru döner.
    """
    pipeline = get_model()
    if not pipeline:
        return {"risk_score": 0.0, "risk_level": "low"}
        
    text = clause.get("text", "")
    if not text.strip():
        return {"risk_score": 0.0, "risk_level": "low"}
    
    # ML Inference (NLP TF-IDF)
    try:
        # Multi-class output probabilities: 0 (low), 1 (medium), 2 (high)
        probs = pipeline.predict_proba([text])[0]
        
        # Calculate continuous risk score (0.0 to 1.0)
        risk_score = float((probs[1] * 0.5) + (probs[2] * 1.0))
        
    except Exception as e:
        print(f"ML Prediction Error: {e}")
        return {"risk_score": 0.0, "risk_level": "low"}
    
    # Risk Level Mapping
    if risk_score < 0.3:
        level = "low"
    elif risk_score < 0.7:
        level = "medium"
    else:
        level = "high"
        
    return {
        "risk_score": round(risk_score, 2),
        "risk_level": level
    }