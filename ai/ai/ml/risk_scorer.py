import os
import joblib
import warnings

warnings.filterwarnings("ignore", category=UserWarning)

model_path = os.path.join(os.path.dirname(__file__), "models/nlp_risk_model.pkl")

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
    Sadece sözleşme metnini alıp CUAD eğitilmiş NLP modelinden geçirerek risk skoru döner.
    """
    pipeline = get_model()
    if not pipeline:
        return {"risk_score": 0.0, "risk_level": "low"}
        
    text = clause.get("text", "")
    if not text.strip():
        return {"risk_score": 0.0, "risk_level": "low"}
    
    # NLP Inference (pure text)    
    risk_prob = float(pipeline.predict_proba([text])[0][1])
    
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