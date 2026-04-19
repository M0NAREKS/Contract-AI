import pandas as pd
import numpy as np
import os

def generate_synthetic_data(num_samples=500):
    np.random.seed(42)
    data = []
    
    clause_types = ["payment", "penalty", "termination", "confidentiality", "liability", "data_protection", "other"]
    
    for i in range(num_samples):
        # Rastgele feature'lar
        c_type = np.random.choice(clause_types)
        
        # Payment_term_days: 0-120
        payment_term = int(np.random.normal(loc=30, scale=30))
        payment_term = max(0, min(payment_term, 120)) if c_type == "payment" else 0
        
        # Penalty_percentage: 0-30
        penalty_perc = np.random.normal(loc=5, scale=5)
        penalty_perc = max(0.0, min(penalty_perc, 30.0)) if c_type == "penalty" else 0.0
        
        # Ambiguity Flag
        ambiguity_flag = np.random.choice([0, 1], p=[0.7, 0.3])
        
        # Basit Kural: 
        # Ödeme 60 günden fazla ise riskli
        # Ceza %10'dan fazla ise riskli
        # Ambiguity varsa risk artar
        risk_score = 0.0
        if c_type == "payment" and payment_term > 60: risk_score += 0.5
        if c_type == "penalty" and penalty_perc > 10.0: risk_score += 0.6
        if ambiguity_flag == 1: risk_score += 0.3
        if c_type in ["liability", "termination"]: risk_score += 0.2
        
        # noise ekle
        risk_score += np.random.normal(0, 0.1)
        risk_score = max(0.0, min(risk_score, 1.0))
        
        data.append({
            "payment_term_days": payment_term,
            "penalty_percentage": round(penalty_perc, 2),
            "ambiguity_flag": ambiguity_flag,
            "clause_type": c_type,
            "risk_label": risk_score
        })
        
    df = pd.DataFrame(data)
    
    # Klasör yoksa oluştur
    os.makedirs(os.path.dirname(__file__), exist_ok=True)
    df.to_csv(os.path.join(os.path.dirname(__file__), "synthetic_clauses.csv"), index=False)
    print(f"✅ {num_samples} satırlık synthetic dataset oluşturuldu: synthetic_clauses.csv")

if __name__ == "__main__":
    generate_synthetic_data()