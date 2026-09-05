import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    'costDeviationPercentage',
    'delayDays',
    'paymentCount',
    'paymentAmount',
    'milestoneCompletionRate',
    'contractorDelayRate',
    'contractorCostOverrunRate',
    'contractorAnomalyRate',
    'costPerBeneficiary',
    'projectDuration',
    'duplicateSimilarity'
]

def extract_features_from_dict(data: dict) -> np.ndarray:
    """Extract and normalize numerical feature vector from dictionary"""
    features = [
        float(data.get('costDeviationPercentage', 0.0)),
        float(data.get('delayDays', 0.0)),
        float(data.get('paymentCount', 2.0)),
        float(data.get('paymentAmount', 1000000.0)) / 1000000.0, # Scale to Lakhs/Crores
        float(data.get('milestoneCompletionRate', 50.0)),
        float(data.get('contractorDelayRate', 15.0)),
        float(data.get('contractorCostOverrunRate', 10.0)),
        float(data.get('contractorAnomalyRate', 10.0)),
        float(data.get('costPerBeneficiary', 1000.0)) / 1000.0,
        float(data.get('projectDuration', 365.0)),
        float(data.get('duplicateSimilarity', 0.0))
    ]
    return np.array(features).reshape(1, -1)

def extract_features_from_df(df: pd.DataFrame) -> tuple[pd.DataFrame, list]:
    """Preprocess pandas dataframe for training"""
    processed = pd.DataFrame()
    for col in FEATURE_COLUMNS:
        if col in df.columns:
            processed[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
        else:
            processed[col] = 0.0
    return processed, FEATURE_COLUMNS
