from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from app.services.prediction_service import prediction_service

router = APIRouter()

class ProjectFeatures(BaseModel):
    costDeviationPercentage: Optional[float] = 0.0
    delayDays: Optional[float] = 0.0
    paymentCount: Optional[float] = 2.0
    paymentAmount: Optional[float] = 1000000.0
    milestoneCompletionRate: Optional[float] = 50.0
    contractorDelayRate: Optional[float] = 15.0
    contractorCostOverrunRate: Optional[float] = 10.0
    contractorAnomalyRate: Optional[float] = 10.0
    costPerBeneficiary: Optional[float] = 1000.0
    projectDuration: Optional[float] = 365.0
    duplicateSimilarity: Optional[float] = 0.0

class BatchPredictRequest(BaseModel):
    projects: List[ProjectFeatures]

@router.post("/predict")
def predict_anomaly(features: ProjectFeatures):
    return prediction_service.predict(features.model_dump())

@router.post("/batch-predict")
def batch_predict(payload: BatchPredictRequest):
    results = [prediction_service.predict(p.model_dump()) for p in payload.projects]
    return {"predictions": results}
