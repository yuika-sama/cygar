from datetime import datetime, timezone
from typing import Any, Dict

from firebase_admin import firestore


def ensure_user_document(uid: str, token_payload: Dict[str, Any]) -> Dict[str, Any]:
    db = firestore.client()
    user_ref = db.collection("users").document(uid)
    snapshot = user_ref.get()
    if snapshot.exists:
        return snapshot.to_dict() or {}

    user_doc = {
        "display_name": token_payload.get("name") or token_payload.get("display_name"),
        "email": token_payload.get("email"),
        "usage_count": 0,
        "last_updated": firestore.SERVER_TIMESTAMP,
        "history": [],
        "viewed_recipes": [],
    }
    user_ref.set(user_doc, merge=True)
    return user_doc


def build_history_record(
    execution_id: str,
    session_id: str,
    primary_label: str | None,
    detected_count: int,
) -> Dict[str, Any]:
    return {
        "action": "execute",
        "target_id": execution_id,
        "session_id": session_id,
        "target_name": primary_label or "unknown",
        "detected_count": detected_count,
        "timestamp": datetime.now(timezone.utc),
    }
