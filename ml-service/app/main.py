from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.predict import router as predict_router
from app.routes.train import router as train_router

app = FastAPI(
    title="MPLAD Anomaly Detection ML Service",
    description="FastAPI Machine Learning Service powering SIH26102 MPLAD Intelligence System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router, tags=["Inference"])
app.include_router(train_router, tags=["Training"])

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "Python FastAPI ML Anomaly Engine",
        "algorithm": "Isolation Forest & Random Forest Ensemble"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
