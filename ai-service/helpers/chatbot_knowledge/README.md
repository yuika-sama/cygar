# Chatbot Knowledge Folder

This folder is the primary markdown knowledge base for chatbot RAG.

## Suggested files
- `preprompt_template.md`: assistant identity and response policy.
- `gesture_catalog.md`: gesture mapping returned in API output.
- `project_knowledge_template.md`: reusable format for project topics.
- `external_websites.md`: trusted external references.

## How retrieval works
- Backend loads markdown files in this folder.
- Backend also loads markdown files in `ai-service/docs`.
- Backend also ingests dataset rows from `utils/dataset/*.csv`.
- Query is embedded with SentenceTransformer and matched via cosine similarity.
