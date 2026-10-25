"""
ml.py — No-Show Prediction Model for QueueCare
================================================
Uses scikit-learn's GradientBoostingClassifier to predict whether a patient
will skip their appointment. The model trains on synthetic data on first run.

Features used:
  1. lead_days    — days between booking and appointment (longer = riskier)
  2. age          — patient age (younger patients no-show more)
  3. prior_no_shows — past no-shows for the same phone number
  4. hour         — appointment hour (some hours have higher no-show rates)
  5. reminder_sent — whether an SMS/reminder was sent (0 or 1)
"""

import os
import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingClassifier

# Model file lives next to this script
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "noshow_model.joblib")


# ---------------------------------------------------------------------------
# Synthetic Data Generation
# ---------------------------------------------------------------------------

def generate_synthetic_data(n=2000, seed=42):
    """
    Generate realistic synthetic training data for the no-show model.

    ── To swap in the Kaggle "Medical Appointment No Shows" dataset: ──
    #
    # 1. Download from https://www.kaggle.com/datasets/joniarroba/noshowappointments
    # 2. Load with pandas:
    #        import pandas as pd
    #        df = pd.read_csv("KaggleV2-May-2016.csv")
    # 3. Engineer features:
    #        df['lead_days'] = (pd.to_datetime(df['AppointmentDay'])
    #                           - pd.to_datetime(df['ScheduledDay'])).dt.days.clip(lower=0)
    #        df['hour']      = pd.to_datetime(df['ScheduledDay']).dt.hour
    #        df['prior_no_shows'] = 0  # compute per-patient if you have history
    #        df['reminder_sent']  = df['SMS_received']
    #        X = df[['lead_days','Age','prior_no_shows','hour','reminder_sent']].values
    #        y = (df['No-show'] == 'Yes').astype(int).values
    # 4. Call: train_model(X, y)
    #
    """
    rng = np.random.RandomState(seed)

    # --- Random feature generation ---
    lead_days      = rng.randint(0, 30, n)                          # 0 = same-day
    age            = rng.randint(5, 90, n)                          # 5-89 years
    prior_no_shows = rng.choice([0, 0, 0, 0, 1, 1, 2, 3], n)      # most have 0
    hour           = rng.choice([9, 10, 11, 12, 14, 15, 16], n)    # clinic hours
    reminder_sent  = rng.choice([0, 1], n, p=[0.4, 0.6])           # 60% reminded

    # --- Compute realistic no-show probability via logistic function ---
    logit = (
        -2.0                            # base rate (most people show up)
        + 0.05  * lead_days             # longer wait → more no-shows
        - 0.01  * age                   # older patients more reliable
        + 0.8   * prior_no_shows        # past behaviour predicts future
        + 0.02  * (hour - 12) ** 2      # midday slots slightly worse
        - 0.7   * reminder_sent         # reminders reduce no-shows
    )
    prob = 1 / (1 + np.exp(-logit))     # sigmoid → probability
    y = (rng.random(n) < prob).astype(int)

    X = np.column_stack([lead_days, age, prior_no_shows, hour, reminder_sent])
    return X, y


# ---------------------------------------------------------------------------
# Model Training & Loading
# ---------------------------------------------------------------------------

def train_model(X=None, y=None):
    """Train the gradient-boosting model and save to disk."""
    if X is None or y is None:
        X, y = generate_synthetic_data()

    model = GradientBoostingClassifier(
        n_estimators=100,   # 100 sequential trees
        max_depth=3,        # shallow trees prevent overfitting
        learning_rate=0.1,  # shrinkage for gradual learning
        random_state=42,
    )
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)
    print(f"[OK] No-show model trained on {len(y)} samples -> {MODEL_PATH}")
    return model


def load_model():
    """Load the saved model, or train a new one if none exists."""
    if not os.path.exists(MODEL_PATH):
        print("No saved model found — training on synthetic data...")
        return train_model()
    return joblib.load(MODEL_PATH)


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

def predict_no_show(model, lead_days, age, prior_no_shows, hour, reminder_sent=0):
    """
    Predict no-show probability for a single appointment.

    Returns: float between 0.0 and 1.0
    """
    features = np.array([[lead_days, age, prior_no_shows, hour, reminder_sent]])
    prob = model.predict_proba(features)[0][1]   # P(class=1) = P(no-show)
    return round(float(prob), 3)


# ---------------------------------------------------------------------------
# Quick test when run directly
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    m = load_model()
    # Example: 5-day lead, age 25, 0 prior no-shows, 10am, no reminder
    p = predict_no_show(m, lead_days=5, age=25, prior_no_shows=0, hour=10)
    print(f"Sample no-show probability: {p:.1%}")
