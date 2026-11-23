import sys
import json
import pandas as pd
import joblib
import os

# --------------------------------------------------
# LOAD MODEL
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

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
        "Days_Indoors":"1-14 days",
        "Changes_Habits":"Yes",
        "Work_Interest":"No",
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
    "care_options"
]

df = df[feature_columns].copy()

stack_path = os.path.join(BASE_DIR, "stack.joblib")
if os.path.isfile(stack_path):
    model = joblib.load(stack_path)
    model_name = "Stacked ensemble"
else:
    model = joblib.load(os.path.join(BASE_DIR, "model.pkl"))
    encoders = joblib.load(os.path.join(BASE_DIR, "encoder.pkl"))
    model_name = "Random Forest"
    for column in feature_columns:
        try:
            df[column] = encoders[column].transform(df[column])
        except ValueError:
            df[column] = 0
    df["Isolation_Score"] = df["Days_Indoors"] + df["Social_Weakness"]

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

if input_data.get("Work_Interest") == "No":
    risk_factors.append("Low Work Interest")

if input_data.get("Changes_Habits") == "Yes":
    risk_factors.append("Lifestyle Changes")

if input_data.get("Days_Indoors") in {"15-30 days", "31-60 days", "More than 2 months"}:
    risk_factors.append("High Social Isolation")

if input_data.get("mental_health_interview") == "No":
    risk_factors.append("Avoiding Mental Health Discussion")

# --------------------------------------------------
# OUTPUT RESULT
# --------------------------------------------------

result = {
    "mental_score": mental_score,
    "model": model_name,
    "risk_level": risk,
    "confidence": float(confidence),
    "top_risk_factors": risk_factors[:3]
}

print(json.dumps(result))