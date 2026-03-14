import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

import joblib

# Load dataset
df = pd.read_csv("dataset.csv")

# ----------------------
# DATA CLEANING
# ----------------------

df.drop_duplicates(inplace=True)

if "Timestamp" in df.columns:
    df.drop(["Timestamp"], axis=1, inplace=True)

for col in df.columns:
    df[col] = df[col].fillna(df[col].mode()[0])

# ----------------------
# ENCODING
# ----------------------

encoders = {}

for col in df.columns:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    encoders[col] = le

# ----------------------
# FEATURE ENGINEERING
# ----------------------

df["Stress_Score"] = (
    df["Growing_Stress"] +
    df["Mood_Swings"] +
    df["Coping_Struggles"]
)

df["Isolation_Score"] = (
    df["Days_Indoors"] +
    df["Social_Weakness"]
)

df["Risk_Score"] = (
    df["family_history"] +
    df["Mental_Health_History"] +
    df["Stress_Score"]
)

# ----------------------
# TARGET
# ----------------------

df["Depression_Risk"] = np.where(df["Risk_Score"] > 4, 1, 0)

X = df.drop("Depression_Risk", axis=1)
y = df["Depression_Risk"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ----------------------
# TRAIN MODEL
# ----------------------

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    random_state=42
)

model.fit(X_train, y_train)

pred = model.predict(X_test)

print(classification_report(y_test, pred))

# ----------------------
# SAVE MODEL
# ----------------------

joblib.dump(model, "model.pkl")
joblib.dump(encoders, "encoder.pkl")

print("Model trained and saved")