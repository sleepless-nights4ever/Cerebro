"""Compare assessment models against the repository's existing rule-based target."""

from argparse import ArgumentParser
from pathlib import Path
from tempfile import NamedTemporaryFile

import joblib

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import StratifiedGroupKFold, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier

DATASET = Path(__file__).with_name("dataset.csv")
TARGET_FIELDS = {
    "family_history": {"No": 0, "Yes": 1},
    "Mental_Health_History": {"No": 0, "Maybe": 1, "Yes": 2},
    "Growing_Stress": {"No": 0, "Maybe": 1, "Yes": 2},
    "Mood_Swings": {"Low": 0, "Medium": 1, "High": 2},
    "Coping_Struggles": {"No": 0, "Yes": 1},
}


def load_data():
    data = pd.read_csv(DATASET).drop(columns="Timestamp").drop_duplicates()
    scores = pd.DataFrame({field: data[field].map(values)
                           for field, values in TARGET_FIELDS.items()})
    valid = scores.notna().all(axis=1)
    features = data.loc[valid].drop(columns=list(TARGET_FIELDS))
    target = (scores.loc[valid].sum(axis=1) > 4).astype(int)
    return features, target


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--export-stack", action="store_true",
                        help="Save the evaluated stack for live questionnaire predictions.")
    args = parser.parse_args()
    features, target = load_data()
    # Group identical model inputs so they cannot cross the holdout boundary.
    groups = pd.util.hash_pandas_object(features, index=False)
    train_groups, test_groups = train_test_split(
        groups.unique(), test_size=0.2, random_state=42
    )
    train = groups.isin(train_groups)
    test = groups.isin(test_groups)
    preprocessing = ColumnTransformer([
        ("categorical", make_pipeline(
            SimpleImputer(strategy="most_frequent"),
            OneHotEncoder(handle_unknown="ignore")
        ), features.columns.tolist())
    ])
    learners = [
        ("random_forest", RandomForestClassifier(
            n_estimators=100, max_depth=10, random_state=42, n_jobs=2
        )),
        ("xgboost", XGBClassifier(
            n_estimators=100, max_depth=5, random_state=42, n_jobs=2
        )),
        ("mlp", MLPClassifier(
            hidden_layer_sizes=(32,), max_iter=120, random_state=42
        )),
    ]
    folds = list(StratifiedGroupKFold(n_splits=3, shuffle=True, random_state=42).split(
        features.loc[train], target.loc[train], groups.loc[train]
    ))
    print("Evaluation target: questionnaire-derived binary proxy")
    print(f"Training rows: {train.sum()}, holdout rows: {test.sum()}")
    for name, learner in [*learners, ("stack", None)]:
        # Fit preprocessing within every stacking fold.
        if name == "stack":
            model = StackingClassifier(
                estimators=[(label, make_pipeline(preprocessing, estimator))
                            for label, estimator in learners],
                final_estimator=LogisticRegression(), cv=folds
            )
        else:
            model = make_pipeline(preprocessing, learner)
        model.fit(features.loc[train], target.loc[train])
        predictions = model.predict(features.loc[test])
        print(f"\n{name}")
        print(classification_report(target.loc[test], predictions, zero_division=0))
        print(confusion_matrix(target.loc[test], predictions, labels=[0, 1]))
        if name == "stack" and args.export_stack:
            destination = DATASET.with_name("stack.joblib")
            with NamedTemporaryFile(dir=destination.parent, delete=False) as temporary:
                temporary_path = Path(temporary.name)
            try:
                joblib.dump(model, temporary_path, compress=3)
                temporary_path.replace(destination)
            finally:
                temporary_path.unlink(missing_ok=True)
            print(f"Saved {destination}")


if __name__ == "__main__":
    main()
