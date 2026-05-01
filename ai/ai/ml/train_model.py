import os
import pandas as pd
import numpy as np
import joblib
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression

def generate_synthetic_data(n_samples=2000):
    np.random.seed(42)
    
    clause_types = ['payment', 'penalty', 'termination', 'confidentiality', 'liability', 'data_protection', 'other']
    
    data = []
    for _ in range(n_samples):
        c_type = np.random.choice(clause_types)
        
        # Default values
        penalty = 0.0
        payment_days = 0
        ambiguity = np.random.choice([0, 1], p=[0.8, 0.2])
        
        if c_type == 'penalty':
            penalty = np.random.exponential(scale=3.0) # mostly low, but some high
        elif c_type == 'payment':
            payment_days = int(np.random.normal(loc=30, scale=45))
            if payment_days < 0:
                payment_days = 0
                
        # Base risk logic for synthetic labels
        risk_score = 0.0
        
        # Penalties > 5% are high risk
        if c_type == 'penalty':
            if penalty > 10.0:
                risk_score += 0.8
            elif penalty > 3.0:
                risk_score += 0.4
            else:
                risk_score += 0.1
                
        # Payment terms > 60 days are high risk
        if c_type == 'payment':
            if payment_days > 90:
                risk_score += 0.7
            elif payment_days > 45:
                risk_score += 0.3
            else:
                risk_score += 0.1
                
        # Ambiguity always adds risk
        if ambiguity == 1:
            risk_score += 0.3
            
        # Certain clauses carry inherent medium risk if not standard
        if c_type in ['liability', 'termination']:
            risk_score += 0.2
            
        # Add some noise
        risk_score += np.random.normal(0, 0.05)
        
        # Bound risk
        risk_score = max(0.0, min(1.0, risk_score))
        
        # Mapping to classes: 0 (low), 1 (medium), 2 (high)
        if risk_score < 0.3:
            label = 0
        elif risk_score < 0.7:
            label = 1
        else:
            label = 2
            
        data.append({
            'clause_type': c_type,
            'penalty_percentage': penalty,
            'payment_term_days': payment_days,
            'ambiguity_flag': ambiguity,
            'risk_class': label
        })
        
    return pd.DataFrame(data)

def train_and_save_model():
    print("Sentetik veri üretiliyor...")
    df = generate_synthetic_data(3000)
    
    X = df[['clause_type', 'penalty_percentage', 'payment_term_days', 'ambiguity_flag']]
    y = df['risk_class']
    
    numeric_features = ['penalty_percentage', 'payment_term_days', 'ambiguity_flag']
    numeric_transformer = StandardScaler()

    categorical_features = ['clause_type']
    categorical_transformer = OneHotEncoder(handle_unknown='ignore')

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ])

    clf = Pipeline(steps=[('preprocessor', preprocessor),
                          ('classifier', LogisticRegression(max_iter=1000))])

    print("Model (Logistic Regression) eğitiliyor...")
    clf.fit(X, y)
    
    score = clf.score(X, y)
    print(f"Eğitim Skoru (Accuracy): {score:.2f}")
    
    os.makedirs(os.path.join(os.path.dirname(__file__), 'models'), exist_ok=True)
    model_path = os.path.join(os.path.dirname(__file__), 'models', 'structured_risk_model.pkl')
    
    joblib.dump(clf, model_path)
    print(f"Model başarıyla kaydedildi: {model_path}")

if __name__ == "__main__":
    train_and_save_model()