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
        "treatment":"No",
        "Days_Indoors":"3",
        "Changes_Habits":"Yes",
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

def safe_int(val, default=0):
    try:
        return int(val)
    except (ValueError, TypeError):
        return default

# Isolation score (same logic used in training)
df["Isolation_Score"] = (
    safe_int(df["Days_Indoors"].iloc[0]) +
    (1 if df["Social_Weakness"].iloc[0] == "Yes" else 0)
)

# --------------------------------------------------
# SELECT ONLY FEATURES USED IN TRAINING
# --------------------------------------------------

feature_columns = [
    "Gender",
    "Country",
    "Occupation",
    "self_employed",
    "treatment",
    "Days_Indoors",
    "Changes_Habits",
    "Work_Interest",
    "Social_Weakness",
    "mental_health_interview",
    "care_options",
    "Isolation_Score"
]

df = df[feature_columns]

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

confidence = max(prob, 1 - prob)

# --------------------------------------------------
# IDENTIFY RISK FACTORS
# --------------------------------------------------

risk_factors = []

if input_data.get("Social_Weakness") == "Yes":
    risk_factors.append("Social Weakness")

if input_data.get("Work_Interest") == "Low":
    risk_factors.append("Low Work Interest")

if input_data.get("Changes_Habits") == "Yes":
    risk_factors.append("Lifestyle Changes")

if safe_int(input_data.get("Days_Indoors", 0)) >= 5:
    risk_factors.append("High Social Isolation")

if input_data.get("mental_health_interview") == "No":
    risk_factors.append("Avoiding Mental Health Discussion")

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