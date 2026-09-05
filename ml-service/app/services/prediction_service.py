import os
import joblib
import numpy as np
from app.preprocessing.preprocessing import extract_features_from_dict, FEATURE_COLUMNS
from sklearn.ensemble import IsolationForest

MODEL_DIR = os.path.join(os.path.dirname(__file__), '../models/saved_models')
os.makedirs(MODEL_DIR, exist_ok=True)
DEFAULT_MODEL_PATH = os.path.join(MODEL_DIR, 'active_isolation_forest.joblib')

class PredictionService:
    def __init__(self):
        self.model = None
        self.model_type = "Isolation Forest"
        self.load_active_model()

    def load_active_model(self):
        if os.path.exists(DEFAULT_MODEL_PATH):
            try:
                self.model = joblib.load(DEFAULT_MODEL_PATH)
            except Exception as e:
                print(f"[ML Service] Error loading saved model: {e}")
                self._initialize_baseline_model()
        else:
            self._initialize_baseline_model()

    def _initialize_baseline_model(self):
        # Initialize and fit a baseline Isolation Forest on synthetic distribution
        np.random.seed(42)
        normal_data = np.random.normal(loc=[10, 20, 2, 2.5, 60, 15, 10, 10, 1.2, 365, 0], scale=[10, 15, 1, 1.0, 20, 10, 8, 8, 0.5, 50, 5], size=(1000, 11))
        anomalies = np.random.uniform(low=[50, 120, 4, 6.0, 15, 50, 40, 50, 3.0, 500, 70], high=[120, 300, 8, 12.0, 40, 80, 70, 90, 8.0, 800, 95], size=(150, 11))
        X = np.vstack([normal_data, anomalies])
        
        iso = IsolationForest(n_estimators=100, contamination=0.13, random_state=42)
        iso.fit(X)
        self.model = iso
        joblib.dump(self.model, DEFAULT_MODEL_PATH)
        print("[ML Service] Baseline Isolation Forest fitted and saved.")

    def predict(self, feature_dict: dict) -> dict:
        if self.model is None:
            self.load_active_model()

        X = extract_features_from_dict(feature_dict)
        
        # In Isolation Forest: lower score = more anomalous
        raw_score = self.model.decision_function(X)[0] # e.g. -0.2 (anomaly) to +0.2 (normal)
        # Normalize decision score to [0.0, 1.0] where 1.0 is highest anomaly
        normalized_anomaly_score = float(1.0 / (1.0 + np.exp(raw_score * 8.0)))
        prediction = int(self.model.predict(X)[0]) # -1 for anomaly, 1 for normal
        
        risk_factors = []
        cost_dev = float(feature_dict.get('costDeviationPercentage', 0))
        delay = float(feature_dict.get('delayDays', 0))
        contractor_anom = float(feature_dict.get('contractorAnomalyRate', 0))

        if cost_dev > 30:
            risk_factors.append(f"Cost deviation {cost_dev:.1f}% exceeds safe tolerance")
        if delay > 60:
            risk_factors.append(f"Timeline schedule delay of {delay:.0f} days")
        if contractor_anom > 35:
            risk_factors.append(f"Contractor risk profile anomaly frequency ({contractor_anom:.0f}%)")

        return {
            "anomalyScore": round(normalized_anomaly_score, 4),
            "anomalyDetected": prediction == -1 or normalized_anomaly_score > 0.5,
            "rawDecisionScore": round(float(raw_score), 4),
            "modelType": self.model_type,
            "riskFactors": risk_factors
        }

prediction_service = PredictionService()
