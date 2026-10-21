from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .models import BatchClassifyRequest, BatchClassifyResponse, ClassifyRequest, ClassifyResponse

app = FastAPI(
    title="EcoScan AI — Classification Service",
    version="1.0.0",
    description="Python FastAPI service for waste image classification using Google Gemini Vision API.",
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/classify", response_model=ClassifyResponse, status_code=501)
async def classify(request: ClassifyRequest) -> JSONResponse:
    """Classify a single image. Full implementation in task 3.10."""
    return JSONResponse(
        status_code=501,
        content={"error": "Not Implemented", "code": "NOT_IMPLEMENTED", "retryable": False},
    )


@app.post("/classify/batch", response_model=BatchClassifyResponse, status_code=501)
async def classify_batch(request: BatchClassifyRequest) -> JSONResponse:
    """Classify a batch of images. Full implementation in task 3.10."""
    return JSONResponse(
        status_code=501,
        content={"error": "Not Implemented", "code": "NOT_IMPLEMENTED", "retryable": False},
    )
