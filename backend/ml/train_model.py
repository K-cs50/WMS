"""
Model Training Pipeline:
Predicting Water Stress Index & Supply Reliability constrained by Weather Features
Follows strict ML Best Practices:
1. Chronological Train/Validation/Test Split
2. Featurization fit ONLY on Training Set
3. Multi-Model Comparison (Ridge Regression, Random Forest, Gradient Boosting)
4. Comprehensive Error Evaluation (MAE, RMSE, R2)
5. Feature Importance Analysis for Meteorological Constraints
"""

import os
import json
import joblib
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def train_and_evaluate():
    ml_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(ml_dir, "synthetic_water_weather_dataset.csv")

    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at: {data_path}")

    print("Loading synthetic dataset...")
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} records. Columns: {list(df.columns)}")

    # Sort chronologically by date
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Feature definitions
    numeric_features = [
        "latitude", "longitude", "elevation_m", "pipeline_age_years",
        "base_capacity_mld", "temperature_c", "humidity_pct",
        "rainfall_mm", "wind_speed_kmh", "evapotranspiration_mm",
        "heat_wave_flag"
    ]
    categorical_features = ["zone", "season"]

    feature_cols = numeric_features + categorical_features
    target_col = "water_stress_index"  # Primary target
    aux_target_col = "supply_reliability_score"

    X = df[feature_cols]
    y = df[target_col]

    # Chronological Split (Strict featurization ordering): 70% Train, 15% Validation, 15% Test
    n = len(df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    X_train, y_train = X.iloc[:train_end], y.iloc[:train_end]
    X_val, y_val = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
    X_test, y_test = X.iloc[val_end:], y.iloc[val_end:]

    print(f"Dataset Split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")

    # Preprocessing Pipeline (Fit strictly on X_train)
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
        ]
    )

    # Candidate Models for Comparison
    models = {
        "Baseline_Ridge": Ridge(alpha=1.0),
        "Random_Forest": RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42),
        "Gradient_Boosting": GradientBoostingRegressor(n_estimators=120, learning_rate=0.08, max_depth=5, random_state=42),
    }

    results = {}
    best_model_name = None
    best_r2 = -float("inf")
    best_pipeline = None

    for name, model in models.items():
        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", model)
        ])

        # Fit ONLY on training data
        pipeline.fit(X_train, y_train)

        # Evaluate on Validation set
        val_preds = pipeline.predict(X_val)
        val_mae = mean_absolute_error(y_val, val_preds)
        val_rmse = np.sqrt(mean_squared_error(y_val, val_preds))
        val_r2 = r2_score(y_val, val_preds)

        results[name] = {
            "val_mae": float(round(val_mae, 4)),
            "val_rmse": float(round(val_rmse, 4)),
            "val_r2": float(round(val_r2, 4)),
        }
        print(f"[{name}] Val MAE: {val_mae:.4f} | RMSE: {val_rmse:.4f} | R2: {val_r2:.4f}")

        if val_r2 > best_r2:
            best_r2 = val_r2
            best_model_name = name
            best_pipeline = pipeline

    print(f"\nOptimal Model Selected: {best_model_name} (R2={best_r2:.4f})")

    # Evaluate Best Model on Unseen Holdout Test Set
    test_preds = best_pipeline.predict(X_test)
    test_mae = mean_absolute_error(y_test, test_preds)
    test_rmse = np.sqrt(mean_squared_error(y_test, test_preds))
    test_r2 = r2_score(y_test, test_preds)

    print(f"Final Test Evaluation: MAE={test_mae:.4f} | RMSE={test_rmse:.4f} | R2={test_r2:.4f}")

    # Extract Feature Importances from Best Model (if tree-based)
    regressor = best_pipeline.named_steps["regressor"]
    transformed_cats = best_pipeline.named_steps["preprocessor"].named_transformers_["cat"].get_feature_names_out(categorical_features)
    all_feature_names = numeric_features + list(transformed_cats)

    importances = {}
    if hasattr(regressor, "feature_importances_"):
        raw_importances = regressor.feature_importances_
        for feat, imp in zip(all_feature_names, raw_importances):
            importances[feat] = float(round(imp, 4))
        # Sort by importance descending
        importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    # Compile Final Metrics Payload
    metrics_payload = {
        "model_name": best_model_name,
        "trained_date": datetime.now().isoformat(),
        "training_samples": len(X_train),
        "validation_samples": len(X_val),
        "test_samples": len(X_test),
        "model_comparison": results,
        "final_test_metrics": {
            "mae": float(round(test_mae, 4)),
            "rmse": float(round(test_rmse, 4)),
            "r2_score": float(round(test_r2, 4))
        },
        "meteorological_feature_importances": importances,
        "input_features": {
            "numeric": numeric_features,
            "categorical": categorical_features
        }
    }

    # Save Pipeline and Metrics
    model_path = os.path.join(ml_dir, "water_weather_ml_pipeline.joblib")
    metrics_path = os.path.join(ml_dir, "model_metrics.json")

    joblib.dump(best_pipeline, model_path)
    with open(metrics_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"\nModel pipeline saved to: {model_path}")
    print(f"Metrics report saved to: {metrics_path}")

    return metrics_payload

if __name__ == "__main__":
    train_and_evaluate()
