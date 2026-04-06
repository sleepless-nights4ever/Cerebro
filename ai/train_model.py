import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

import joblib

# ----------------------
# LOAD DATASET
# ----------------------

df = pd.read_csv("dataset.csv")

# ----------------------
# DATA CLEANING
# ----------------------

# Remove duplicate rows
df.drop_duplicates(inplace=True)

# Remove timestamp column if present
if "Timestamp" in df.columns:
    df.drop("Timestamp", axis=1, inplace=True)

# Handle missing values using mode
for col in df.columns:
    df[col] = df[col].fillna(df[col].mode()[0])

# ----------------------
# ENCODING CATEGORICAL DATA
# ----------------------

encoders = {}

for col in df.columns:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    encoders[col] = le

# ----------------------
# FEATURE ENGINEERING
# ----------------------

# Create stress score
df["Stress_Score"] = (
    df["Growing_Stress"] +
    df["Mood_Swings"] +
    df["Coping_Struggles"]
)

# Create isolation score
df["Isolation_Score"] = (
    df["Days_Indoors"] +
    df["Social_Weakness"]
)

# Create risk score
df["Risk_Score"] = (
    df["family_history"] +
    df["Mental_Health_History"] +
    df["Stress_Score"]
)

# ----------------------
# CREATE TARGET VARIABLE
# ----------------------

df["Depression_Risk"] = np.where(df["Risk_Score"] > 4, 1, 0)

# ----------------------
# REMOVE DATA LEAKAGE FEATURES
# ----------------------

features_to_remove = [
    "Depression_Risk",
    "Risk_Score",
    "Stress_Score",
    "family_history",
    "Mental_Health_History",
    "Growing_Stress",
    "Mood_Swings",
    "Coping_Struggles"
]

X = df.drop(features_to_remove, axis=1)
y = df["Depression_Risk"]

print("Features used for training:")
print(X.columns)

# ----------------------
# TRAIN TEST SPLIT
# ----------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
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

# ----------------------
# PREDICTION
# ----------------------

pred = model.predict(X_test)

# ----------------------
# MODEL EVALUATION
# ----------------------

print("\nClassification Report:\n")
print(classification_report(y_test, pred))

accuracy = accuracy_score(y_test, pred)
print("\nAccuracy:", accuracy)

print("\nConfusion Matrix:\n")
print(confusion_matrix(y_test, pred))

# ----------------------
# SAVE MODEL
# ----------------------

joblib.dump(model, "model.pkl")
joblib.dump(encoders, "encoder.pkl")

print("\nModel trained and saved successfully.")