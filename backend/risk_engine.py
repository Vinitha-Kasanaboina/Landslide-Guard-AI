import numpy as np
from sklearn.ensemble import RandomForestRegressor

class LandslideRiskEngine:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=50, random_state=42)
        self._train_synthetic_model()

    def _train_synthetic_model(self):
        """
        Trains a Random Forest regressor on synthetic geological & meteorological training data
        to output continuous risk scores (0 to 100).
        Features: [rainfall_24h, soil_moisture, slope_deg, elevation, hist_events, ai_severity_score, report_count]
        """
        np.random.seed(42)
        N = 500
        
        rainfall_24h = np.random.uniform(0, 250, N) # mm
        soil_moisture = np.random.uniform(10, 95, N) # %
        slope_deg = np.random.uniform(5, 65, N) # degrees
        elevation = np.random.uniform(200, 3500, N) # meters
        hist_events = np.random.randint(0, 15, N)
        ai_severity = np.random.uniform(1, 4, N) # 1=Low, 2=Moderate, 3=High, 4=Critical
        report_count = np.random.randint(0, 10, N)

        # Formula for synthetic target risk ground truth with realistic noise
        target_risk = (
            (rainfall_24h / 250.0) * 35.0 +
            (soil_moisture / 100.0) * 20.0 +
            (slope_deg / 65.0) * 20.0 +
            (hist_events / 15.0) * 10.0 +
            (ai_severity / 4.0) * 10.0 +
            (report_count / 10.0) * 5.0
        )
        target_risk = np.clip(target_risk + np.random.normal(0, 2, N), 0, 100)

        X = np.column_stack([
            rainfall_24h,
            soil_moisture,
            slope_deg,
            elevation,
            hist_events,
            ai_severity,
            report_count
        ])
        
        self.model.fit(X, target_risk)

    def predict_risk(
        self,
        rainfall_24h: float = 80.0,
        soil_moisture: float = 65.0,
        slope_deg: float = 38.0,
        elevation: float = 1400.0,
        hist_events: int = 4,
        ai_severity: str = "High",
        nearby_reports: int = 2
    ):
        severity_map = {"Low": 1.0, "Moderate": 2.0, "High": 3.0, "Critical": 4.0}
        ai_sev_num = severity_map.get(ai_severity, 2.5)

        X_input = np.array([[
            rainfall_24h,
            soil_moisture,
            slope_deg,
            elevation,
            hist_events,
            ai_sev_num,
            nearby_reports
        ]])

        predicted_score = float(self.model.predict(X_input)[0])
        predicted_score = round(max(0.0, min(100.0, predicted_score)), 1)

        if predicted_score <= 25.0:
            category = "Low"
        elif predicted_score <= 50.0:
            category = "Moderate"
        elif predicted_score <= 75.0:
            category = "High"
        else:
            category = "Critical"

        # Factor contributions breakdown for explainable AI in UI
        factors = [
            {"name": "24h Cumulative Rainfall", "weight": round((rainfall_24h / 250.0) * 35.0, 1), "value": f"{rainfall_24h} mm"},
            {"name": "Soil Moisture Saturation", "weight": round((soil_moisture / 100.0) * 20.0, 1), "value": f"{soil_moisture}%"},
            {"name": "Slope Steepness", "weight": round((slope_deg / 65.0) * 20.0, 1), "value": f"{slope_deg}°"},
            {"name": "AI Image Incident Severity", "weight": round((ai_sev_num / 4.0) * 10.0, 1), "value": ai_severity},
            {"name": "Historical Landslide Density", "weight": round((hist_events / 15.0) * 10.0, 1), "value": f"{hist_events} past events"},
            {"name": "Nearby Citizen Reports", "weight": round((nearby_reports / 10.0) * 5.0, 1), "value": f"{nearby_reports} reports"}
        ]

        return {
            "risk_score": predicted_score,
            "category": category,
            "contributing_factors": factors,
            "model_type": "Random Forest Regressor (Scikit-Learn)"
        }

# Global instance
risk_engine_instance = LandslideRiskEngine()
