from __future__ import annotations

import csv
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from helpers.models import get_sentence_transformer

# Optional prebuilt recommender (sklearn TF-IDF) support
# Use Path(__file__) here so the constant does not depend on BASE_DIR
PREBUILT_RECOMMENDER_DIR = Path(__file__).resolve().parent.parent / "utils" / "models"


BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_KNOWLEDGE_DIR = BASE_DIR / "helpers" / "chatbot_knowledge"
DEFAULT_PROJECT_DOCS_DIR = BASE_DIR / "docs"
DEFAULT_DATASET_PATHS = [
    BASE_DIR / "utils" / "dataset" / "projects_craft.csv",
    BASE_DIR / "utils" / "dataset" / "projects_workshop.csv",
]
DEFAULT_PREPROMPT_FILE = DEFAULT_KNOWLEDGE_DIR / "preprompt_template.md"
DEFAULT_GESTURE_FILE = DEFAULT_KNOWLEDGE_DIR / "gesture_catalog.md"

DEFAULT_POLICY: Dict[str, str] = {
    "assistant_name": "Yuika",
    "assistant_role": "AI assistant",
    "app_name": "CyGar",
    "mission": "Help users with project knowledge, on-site suggestions, and reference links.",
    "language": "vi",
    "tone": "friendly, concise, actionable",
    "max_context_items": "3",
    "fallback_gesture": "neutral_idle",
}

DEFAULT_GESTURES = [
    {
        "gesture": "neutral_idle",
        "when_to_use": "default response, neutral information",
        "description": "Default calm gesture",
    },
    {
        "gesture": "greet_wave",
        "when_to_use": "user greets, starts a new conversation",
        "description": "Warm greeting gesture",
    },
    {
        "gesture": "explain_point",
        "when_to_use": "assistant explains concepts or steps",
        "description": "Pointing/explaining gesture",
    },
    {
        "gesture": "suggest_action",
        "when_to_use": "assistant gives recommendations or options",
        "description": "Suggestion gesture",
    },
    {
        "gesture": "empathy_soft",
        "when_to_use": "assistant handles confusion or failures",
        "description": "Soft empathetic gesture",
    },
]

RECOMMEND_KEYWORDS = {
    "goi y",
    "de xuat",
    "recommend",
    "suggest",
    "website",
    "trang",
    "du an",
    "project",
    "tham khao",
}


@dataclass
class KnowledgeChunk:
    source: str
    text: str


@dataclass
class GestureRule:
    gesture: str
    when_to_use: str
    description: str


class ChatRAGService:
    def __init__(
        self,
        knowledge_dir: Path = DEFAULT_KNOWLEDGE_DIR,
        project_docs_dir: Path = DEFAULT_PROJECT_DOCS_DIR,
        dataset_paths: Optional[List[Path]] = None,
        preprompt_file: Path = DEFAULT_PREPROMPT_FILE,
        gesture_file: Path = DEFAULT_GESTURE_FILE,
        prebuilt_model_dir: Path = PREBUILT_RECOMMENDER_DIR,
    ) -> None:
        self.knowledge_dir = knowledge_dir
        self.project_docs_dir = project_docs_dir
        self.dataset_paths = dataset_paths or DEFAULT_DATASET_PATHS
        self.preprompt_file = preprompt_file
        self.gesture_file = gesture_file
        self.prebuilt_model_dir = prebuilt_model_dir

        self._policy: Dict[str, str] = dict(DEFAULT_POLICY)
        self._preprompt_text: str = ""
        self._chunks: List[KnowledgeChunk] = []
        self._chunk_embeddings: Optional[np.ndarray] = None
        self._gestures: List[GestureRule] = []
        self._gesture_embeddings: Optional[np.ndarray] = None
        self._is_loaded = False
        self._recommender = None

    def refresh(self) -> None:
        self._policy = dict(DEFAULT_POLICY)
        self._preprompt_text = ""
        self._chunks = []
        self._chunk_embeddings = None
        self._gestures = []
        self._gesture_embeddings = None
        self._is_loaded = False

    def describe(self) -> Dict[str, Any]:
        self._ensure_loaded()
        return {
            "model": os.getenv("SENTENCE_TRANSFORMER_MODEL", "paraphrase-multilingual-MiniLM-L12-v2"),
            "knowledge_chunks": len(self._chunks),
            "gesture_count": len(self._gestures),
            "knowledge_dir": str(self.knowledge_dir),
            "preprompt_file": str(self.preprompt_file),
        }

    def answer(self, user_message: str, messages: Optional[List[Dict[str, Any]]] = None, top_k: int = 4) -> Dict[str, Any]:
        self._ensure_loaded()

        normalized_message = (user_message or "").strip()
        if not normalized_message:
            return {
                "role": "assistant",
                "content": "Vui long nhap cau hoi de minh ho tro.",
                "gesture": self._policy.get("fallback_gesture", "neutral_idle"),
                "sources": [],
            }
        # Quick canned answers for common recycling questions (e.g. PET)
        lc = normalized_message.lower()
        if "tái chế" in lc and "pet" in lc:
            assistant_name = self._policy.get("assistant_name", "Yuika")
            short = "Tái chế PET: Thu gom, rửa, nghiền, và tái chế cơ học."
            details = "\n".join(
                [
                    f"{assistant_name} (AI assistant của CyGar)",
                    "Dưới đây là tổng quan các bước cơ bản để tái chế nhựa PET:",
                    "- Thu gom và phân loại: gom riêng PET (chai, bao bì), loại bỏ rác khác.",
                    "- Rửa sạch: loại bỏ nhãn, nắp, và tạp chất để tránh nhiễm bẩn.",
                    "- Nghiền/ép: nghiền thành mảnh hoặc nén để giảm thể tích.",
                    "- Tái chế cơ học: làm sạch sâu, tan chảy và đùn thành hạt tái chế (recycled pellets).",
                    "- Sử dụng lại: hạt tái chế được dùng cho sản phẩm mới hoặc sợi polyester.",
                    "Lưu ý: Quy trình chi tiết và yêu cầu kỹ thuật có thể khác nhau giữa cơ sở. Nếu bạn cần hướng dẫn cụ thể hoặc nguồn tham khảo, mình có thể tìm giúp.",
                ]
            )
            return {
                "role": "assistant",
                "content": short,
                "text": short,
                "details": details,
                "gesture": self._select_gesture(normalized_message, details),
                "sources": [],
            }

        query_text = self._build_query_text(normalized_message, messages or [])
        query_embedding = self._encode_text(query_text)

        if self._chunk_embeddings is None or len(self._chunks) == 0:
            fallback = "Mình chưa có tri thức nội bộ để trả lời. Hãy cập nhật tài liệu trong helpers/chatbot_knowledge."
            return {
                "role": "assistant",
                "content": fallback,
                "gesture": self._policy.get("fallback_gesture", "neutral_idle"),
                "sources": [],
            }

        similarities = np.dot(self._chunk_embeddings, query_embedding)
        top_indices = np.argsort(-similarities)[: max(1, top_k)]
        ranked_chunks = [self._chunks[int(idx)] for idx in top_indices]

        # build human-friendly content
        content = self._compose_content(normalized_message, ranked_chunks)
        # short text for UI (first line)
        short_text = (content.splitlines()[0] if content else "")
        gesture = self._select_gesture(normalized_message, content)
        sources = self._compact_sources(ranked_chunks)

        # If the user asked for recommendations, produce `suggested_articles`.
        message_lc = normalized_message.lower()
        is_recommend_query = any(keyword in message_lc for keyword in RECOMMEND_KEYWORDS)
        suggested_articles: List[Dict[str, Any]] = []
        if is_recommend_query:
            # Prefer the prebuilt TF-IDF recommender when available
            if self._recommender is not None:
                # Try to detect material keyword that matches recommender mapping
                material = None
                try:
                    for k in getattr(self._recommender, 'material_mapping', {}).keys():
                        if k.lower() in message_lc:
                            material = k
                            break
                except Exception:
                    material = None

                # heuristics for common forms
                if not material:
                    if 'pet' in message_lc or 'chai nhựa' in message_lc or 'chai nhua' in message_lc:
                        material = 'PET'

                if material:
                    try:
                        recs = self._recommender.recommend(material, top_n=top_k)
                        for r in recs:
                            suggested_articles.append({
                                'title': r.get('title'),
                                'link': r.get('link'),
                                'snippet': r.get('title') or '',
                                'match_score': None,
                            })
                    except Exception:
                        suggested_articles = []

            # Fallback: extract dataset rows from ranked chunks (existing behavior)
            if not suggested_articles:
                for idx in top_indices:
                    try:
                        chunk = self._chunks[int(idx)]
                        txt = chunk.text
                        # Try to parse dataset project row_text created in _load_dataset_chunks
                        # Format: "Dataset project: {title}. ... Reference link: {link or 'n/a'}."
                        title_match = re.search(r"Dataset project:\s*([^\.]+)\.", txt)
                        link_match = re.search(r"Reference link:\s*([^\.]+)\.", txt)
                        title = title_match.group(1).strip() if title_match else None
                        link = link_match.group(1).strip() if link_match else None
                        if title:
                            score = float(similarities[int(idx)]) if similarities is not None else 0.0
                            suggested_articles.append({
                                "title": title,
                                "link": link if link and link != 'n/a' else None,
                                "snippet": self._trim(txt, 240),
                                "match_score": round(float(score), 4),
                            })
                    except Exception:
                        continue

        reply: Dict[str, Any] = {
            "role": "assistant",
            "content": short_text,
            "text": short_text,
            "details": content,
            "gesture": gesture,
            "sources": sources,
        }

        if suggested_articles:
            reply["suggested_articles"] = suggested_articles

        return reply

    def _ensure_loaded(self) -> None:
        if self._is_loaded:
            return

        self._preprompt_text = self._read_text_file(self.preprompt_file)
        parsed_policy = self._parse_policy(self._preprompt_text)
        self._policy = {**DEFAULT_POLICY, **parsed_policy}

        chunks: List[KnowledgeChunk] = []
        # Load markdown files from the main knowledge folder (exclude preprompt and gesture file)
        chunks.extend(self._load_markdown_chunks(self.knowledge_dir, exclude_names={self.preprompt_file.name, self.gesture_file.name}))

        # If a prebuilt TF-IDF recommender (.pkl) exists, load it and skip loading the many
        # `projects/` markdown files to save startup time and memory.
        prebuilt_ok = False
        try:
            vectorizer_file = self.prebuilt_model_dir / "vectorizer.pkl"
            matrix_file = self.prebuilt_model_dir / "tfidf_matrix.pkl"
            data_file = self.prebuilt_model_dir / "processed_data.pkl"
            if vectorizer_file.exists() and matrix_file.exists() and data_file.exists():
                # lazy import to avoid hard dependency at module import time
                try:
                    from utils.train import OptimizedRecyclingRecommender

                    recommender = OptimizedRecyclingRecommender(model_dir=str(self.prebuilt_model_dir))
                    # this will load the saved vectorizer/matrix if present
                    recommender.train_or_load_model(file_paths=None, force_retrain=False)
                    self._recommender = recommender
                    prebuilt_ok = True
                except Exception:
                    prebuilt_ok = False
        except Exception:
            prebuilt_ok = False

        # Also include project docs that may live under a `projects/` subfolder inside the knowledge dir
        # Only load them when no prebuilt model is available.
        projects_subdir = self.knowledge_dir / "projects"
        if not prebuilt_ok and projects_subdir.exists() and projects_subdir.is_dir():
            chunks.extend(self._load_markdown_chunks(projects_subdir))
        # Load docs from the project_docs_dir (e.g., BASE_DIR/docs)
        chunks.extend(self._load_markdown_chunks(self.project_docs_dir))
        # Load dataset-derived chunks (CSV rows)
        chunks.extend(self._load_dataset_chunks())

        if not chunks:
            chunks.append(
                KnowledgeChunk(
                    source="system:fallback",
                    text="No knowledge documents were loaded. Add markdown files under helpers/chatbot_knowledge.",
                )
            )

        self._chunks = chunks

        model = get_sentence_transformer()
        self._chunk_embeddings = model.encode(
            [chunk.text for chunk in self._chunks],
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        self._gestures = self._load_gesture_rules()
        self._gesture_embeddings = model.encode(
            [f"{g.gesture}. {g.when_to_use}. {g.description}" for g in self._gestures],
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        self._is_loaded = True

    def _build_query_text(self, user_message: str, messages: List[Dict[str, Any]]) -> str:
        recent_user_messages = [
            str(item.get("content", "")).strip()
            for item in messages
            if str(item.get("role", "")).lower() == "user" and str(item.get("content", "")).strip()
        ]
        history_tail = " ".join(recent_user_messages[-2:])
        return f"{history_tail} {user_message}".strip() if history_tail else user_message

    def _compose_content(self, user_message: str, ranked_chunks: List[KnowledgeChunk]) -> str:
        assistant_name = self._policy.get("assistant_name", "Ami")
        assistant_role = self._policy.get("assistant_role", "AI assistant")
        app_name = self._policy.get("app_name", "Cygar")

        max_items = self._safe_int(self._policy.get("max_context_items"), default_value=3)
        selected = ranked_chunks[: max(1, max_items)]

        message_lc = user_message.lower()
        is_recommend_query = any(keyword in message_lc for keyword in RECOMMEND_KEYWORDS)

        if is_recommend_query:
            lead = "Duoi day la cac goi y phu hop tu tai lieu, dataset va nguon tham khao."
        else:
            lead = "Duoi day la thong tin phu hop nhat tu tri thuc du an."

        lines = [
            f"{assistant_name} ({assistant_role} cua {app_name})",
            lead,
        ]

        for chunk in selected:
            lines.append(f"- {self._trim(chunk.text, 260)}")

        lines.append("Neu can, ban co the mo rong cau hoi de minh tra loi sat hon theo ngu canh website hien tai.")
        return "\n".join(lines)

    def _select_gesture(self, user_message: str, content: str) -> str:
        if self._gesture_embeddings is None or not self._gestures:
            return self._policy.get("fallback_gesture", "neutral_idle")

        query = f"{user_message}\n{content}"
        query_embedding = self._encode_text(query)
        scores = np.dot(self._gesture_embeddings, query_embedding)
        best_idx = int(np.argmax(scores))
        best_score = float(scores[best_idx])

        if best_score < 0.15:
            return self._policy.get("fallback_gesture", "neutral_idle")
        return self._gestures[best_idx].gesture

    def _load_markdown_chunks(self, folder: Path, exclude_names: Optional[set[str]] = None) -> List[KnowledgeChunk]:
        chunks: List[KnowledgeChunk] = []
        if not folder.exists() or not folder.is_dir():
            return chunks

        excluded = {name.lower() for name in (exclude_names or set())}

        for md_file in sorted(folder.glob("*.md")):
            if md_file.name.lower() in excluded:
                continue
            text = self._read_text_file(md_file)
            if not text.strip():
                continue
            source_prefix = self._normalize_source_path(md_file)
            chunks.extend(self._split_markdown_to_chunks(text, source_prefix))

        return chunks

    def _split_markdown_to_chunks(self, text: str, source_prefix: str) -> List[KnowledgeChunk]:
        chunks: List[KnowledgeChunk] = []
        heading = "General"
        buffer: List[str] = []
        chunk_index = 0

        def flush_buffer() -> None:
            nonlocal chunk_index
            paragraph = " ".join(line.strip() for line in buffer if line.strip())
            buffer.clear()
            paragraph = re.sub(r"\s+", " ", paragraph).strip()
            if len(paragraph) < 40:
                return
            chunk_index += 1
            chunks.append(KnowledgeChunk(source=f"{source_prefix}#chunk-{chunk_index}", text=f"{heading}: {paragraph}"))

        for raw_line in text.splitlines():
            line = raw_line.strip()
            if line.startswith("#"):
                flush_buffer()
                heading = line.lstrip("#").strip() or heading
                continue
            if not line:
                flush_buffer()
                continue
            buffer.append(line)

        flush_buffer()
        return chunks

    def _load_dataset_chunks(self) -> List[KnowledgeChunk]:
        chunks: List[KnowledgeChunk] = []
        max_rows = self._safe_int(os.getenv("CHAT_DATASET_MAX_ROWS", "600"), default_value=600)

        for dataset_path in self.dataset_paths:
            if not dataset_path.exists():
                continue
            try:
                with dataset_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
                    reader = csv.DictReader(csv_file)
                    for row_index, row in enumerate(reader, start=2):
                        if len(chunks) >= max_rows:
                            break

                        title = self._first_non_empty(row, ["Project-Title", "title", "Title"])
                        link = self._first_non_empty(row, ["Instructables-link", "link", "url"])
                        creator = self._first_non_empty(row, ["Creator", "author", "Author"])
                        subcategory = self._first_non_empty(row, ["Subcategory", "category", "Category"])
                        favorites = self._first_non_empty(row, ["Favorites", "favorite", "likes"])
                        views = self._first_non_empty(row, ["Views", "view", "views"])

                        if not title:
                            continue

                        row_text = (
                            f"Dataset project: {title}. "
                            f"Category: {subcategory or 'n/a'}. "
                            f"Creator: {creator or 'n/a'}. "
                            f"Favorites: {favorites or '0'}. "
                            f"Views: {views or '0'}. "
                            f"Reference link: {link or 'n/a'}."
                        )
                        chunks.append(
                            KnowledgeChunk(
                                source=f"{self._normalize_source_path(dataset_path)}#row-{row_index}",
                                text=row_text,
                            )
                        )
            except Exception:
                continue

        return chunks

    def _load_gesture_rules(self) -> List[GestureRule]:
        text = self._read_text_file(self.gesture_file)
        if not text.strip():
            return [GestureRule(**item) for item in DEFAULT_GESTURES]

        lines = [line.strip() for line in text.splitlines() if line.strip()]
        table_lines = [line for line in lines if line.startswith("|") and line.endswith("|")]

        if len(table_lines) < 3:
            return [GestureRule(**item) for item in DEFAULT_GESTURES]

        headers = [cell.strip().lower() for cell in table_lines[0].strip("|").split("|")]
        if "gesture" not in headers:
            return [GestureRule(**item) for item in DEFAULT_GESTURES]

        gestures: List[GestureRule] = []
        for row_line in table_lines[2:]:
            if set(row_line.replace("|", "").replace("-", "").replace(":", "").strip()) == set():
                continue
            cells = [cell.strip() for cell in row_line.strip("|").split("|")]
            if len(cells) < len(headers):
                cells.extend([""] * (len(headers) - len(cells)))
            row = dict(zip(headers, cells))

            gesture_name = row.get("gesture", "").strip()
            when_to_use = row.get("when_to_use", "").strip()
            description = row.get("description", "").strip()
            if not gesture_name:
                continue
            gestures.append(
                GestureRule(
                    gesture=gesture_name,
                    when_to_use=when_to_use,
                    description=description,
                )
            )

        return gestures or [GestureRule(**item) for item in DEFAULT_GESTURES]

    def _parse_policy(self, text: str) -> Dict[str, str]:
        if not text.strip():
            return {}

        policy: Dict[str, str] = {}
        pattern = re.compile(r"^\s*-?\s*([A-Za-z0-9_]+)\s*:\s*(.+?)\s*$")

        for raw_line in text.splitlines():
            match = pattern.match(raw_line)
            if not match:
                continue
            key = match.group(1).strip().lower()
            value = match.group(2).strip()
            if "{{" in value and "}}" in value:
                continue
            policy[key] = value

        return policy

    def _encode_text(self, text: str) -> np.ndarray:
        model = get_sentence_transformer()
        return model.encode(text, convert_to_numpy=True, normalize_embeddings=True)

    def _compact_sources(self, ranked_chunks: List[KnowledgeChunk], max_items: int = 5) -> List[str]:
        seen = set()
        sources: List[str] = []
        for chunk in ranked_chunks:
            if chunk.source in seen:
                continue
            seen.add(chunk.source)
            sources.append(chunk.source)
            if len(sources) >= max_items:
                break
        return sources

    def _read_text_file(self, path: Path) -> str:
        if not path.exists() or not path.is_file():
            return ""
        try:
            return path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return path.read_text(encoding="utf-8-sig")
        except Exception:
            return ""

    def _normalize_source_path(self, path: Path) -> str:
        try:
            return str(path.relative_to(BASE_DIR)).replace("\\", "/")
        except ValueError:
            return str(path).replace("\\", "/")

    def _first_non_empty(self, row: Dict[str, Any], candidates: List[str]) -> str:
        for key in candidates:
            value = row.get(key)
            if value is None:
                continue
            value = str(value).strip()
            if value:
                return value
        return ""

    def _safe_int(self, value: Optional[str], default_value: int) -> int:
        if value is None:
            return default_value
        try:
            return int(value)
        except (TypeError, ValueError):
            return default_value

    def _trim(self, text: str, max_len: int) -> str:
        normalized = re.sub(r"\s+", " ", text).strip()
        if len(normalized) <= max_len:
            return normalized
        return normalized[: max_len - 3].rstrip() + "..."


_chat_rag_service: Optional[ChatRAGService] = None


def get_chat_rag_service() -> ChatRAGService:
    global _chat_rag_service
    if _chat_rag_service is None:
        _chat_rag_service = ChatRAGService()
    return _chat_rag_service
