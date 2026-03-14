import sys
import json
import pandas as pd
import joblib
import os

# --------------------------------------------------
# LOAD MODEL
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model = joblib.load(os.path.join(BASE_DIR, "model.pkl"))
encoders = joblib.load(os.path.join(BASE_DIR, "encoder.pkl"))

# --------------------------------------------------
# RECEIVE INPUT FROM NODE
# --------------------------------------------------

if len(sys.argv) > 1:
    try:
        input_data = json.loads(sys.argv[1])
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)
else:
    input_data = {
        "Gender":"Male",
        "Country":"India",
        "Occupation":"Student",
        "self_employed":"No",
        "family_history":"Yes",
        "treatment":"No",
        "Days_Indoors":"3",
        "Growing_Stress":"Often",
        "Changes_Habits":"Yes",
        "Mental_Health_History":"No",
        "Mood_Swings":"Sometimes",
        "Coping_Struggles":"Yes",
        "Work_Interest":"Low",
        "Social_Weakness":"Yes",
        "mental_health_interview":"No",
        "care_options":"Yes"
    }

# --------------------------------------------------
# CREATE DATAFRAME
# --------------------------------------------------

df = pd.DataFrame([input_data])

# --------------------------------------------------
# FEATURE ENGINEERING
# --------------------------------------------------

df["Stress_Score"] = (
    df["Growing_Stress"].map({"Yes":2, "Often":2, "Sometimes":1, "No":0}).fillna(0)
)

df["Isolation_Score"] = (
    df["Days_Indoors"].astype(int) +
    df["Social_Weakness"].map({"Yes":2, "No":0}).fillna(0)
)

df["Risk_Score"] = (
    df["family_history"].map({"Yes":2, "No":0}).fillna(0) +
    df["Mental_Health_History"].map({"Yes":2, "No":0}).fillna(0)
)

# --------------------------------------------------
# ENCODE FEATURES
# --------------------------------------------------

for col in df.columns:
    if col in encoders:
        try:
            df[col] = encoders[col].transform(df[col])
        except:
            df[col] = 0

# --------------------------------------------------
# MODEL PREDICTION
# --------------------------------------------------

prob = model.predict_proba(df)[0][1]

# --------------------------------------------------
# SCORE CALCULATION
# --------------------------------------------------

mental_score = int((1 - prob) * 100)

if mental_score >= 80:
    risk = "Healthy"
elif mental_score >= 60:
    risk = "Mild Stress"
elif mental_score >= 40:
    risk = "Moderate Risk"
else:
    risk = "High Risk"

# ⭐ IMPROVED CONFIDENCE
confidence = max(prob, 1 - prob)
# --------------------------------------------------
# IDENTIFY RISK FACTORS
# --------------------------------------------------

risk_factors = []

if input_data.get("Growing_Stress") in ["Often", "Yes"]:
    risk_factors.append("Growing Stress")

if input_data.get("Social_Weakness") == "Yes":
    risk_factors.append("Social Weakness")

if input_data.get("Coping_Struggles") == "Yes":
    risk_factors.append("Coping Struggles")

if input_data.get("Work_Interest") == "Low":
    risk_factors.append("Low Work Interest")

if input_data.get("family_history") == "Yes":
    risk_factors.append("Family Mental Health History")

if input_data.get("Mental_Health_History") == "Yes":
    risk_factors.append("Previous Mental Health Issues")

if int(input_data.get("Days_Indoors",0)) >= 5:
    risk_factors.append("High Social Isolation")
# --------------------------------------------------
# OUTPUT RESULT
# --------------------------------------------------

result = {
    "mental_score": mental_score,
    "risk_level": risk,
    "confidence": float(confidence),
    "top_risk_factors": risk_factors[:3]
}
print(json.dumps(result))