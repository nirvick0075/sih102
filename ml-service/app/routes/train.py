from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.training_service import training_service

router = APIRouter()

class TrainRequest(BaseModel):
    modelType: Optional[str] = "Isolation Forest"
    datasetPath: Optional[str] = None
    contamination: Optional[float] = 0.15
    versionTag: Optional[str] = "v1.0"

@router.post("/train")
def train_model(payload: TrainRequest):
    return training_service.train(
        dataset_path=payload.datasetPath,
        model_type=payload.modelType,
        contamination=payload.contamination,
        version_tag=payload.versionTag
    )
