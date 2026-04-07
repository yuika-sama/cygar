from pathlib import Path
from typing import Dict, List, Optional
import os

import numpy as np
from fastapi import HTTPException, status
from ultralytics import YOLO
from sentence_transformers import SentenceTransformer

from utils.train import OptimizedRecyclingRecommender


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATHS = [
    BASE_DIR / "utils" / "models" / "waste_classification.pt",
    BASE_DIR / "utils" / "models" / "waste_classifcation.pt",
]

_waste_detector: YOLO | None = None
_recommender: OptimizedRecyclingRecommender | None = None
_sentence_transformer: Optional[SentenceTransformer] = None


def get_waste_detector() -> YOLO:
    global _waste_detector
    if _waste_detector is not None:
        return _waste_detector

    model_path = next((path for path in MODEL_PATHS if path.exists()), None)
    if model_path is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không tìm thấy model waste_classification.pt trong utils/models",
        )

    _waste_detector = YOLO(str(model_path))
    return _waste_detector


def get_recommender() -> OptimizedRecyclingRecommender:
    global _recommender
    if _recommender is not None:
        return _recommender

    recommender = OptimizedRecyclingRecommender(model_dir=str(BASE_DIR / "utils" / "models" / "recommender_cache"))
    dataset_paths = [
        str(BASE_DIR / "utils" / "dataset" / "projects_craft.csv"),
        str(BASE_DIR / "utils" / "dataset" / "projects_workshop.csv"),
    ]
    recommender.train_or_load_model(file_paths=dataset_paths, force_retrain=False)
    _recommender = recommender
    return _recommender


def get_sentence_transformer(model_name: Optional[str] = None) -> SentenceTransformer:
    """
    Lazily load and return a SentenceTransformer model.
    Model name can be overridden by `model_name` or env var `SENTENCE_TRANSFORMER_MODEL`.
    """
    global _sentence_transformer
    if _sentence_transformer is not None:
        return _sentence_transformer

    chosen = model_name or os.getenv("SENTENCE_TRANSFORMER_MODEL") or "all-MiniLM-L6-v2"
    _sentence_transformer = SentenceTransformer(chosen)
    return _sentence_transformer


def embed_text(text: str, model_name: Optional[str] = None) -> np.ndarray:
    model = get_sentence_transformer(model_name)
    emb = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
    return emb
