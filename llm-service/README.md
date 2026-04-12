# llm-service

Lightweight microservice that proxies chat/generation requests to a Putter.ai-compatible endpoint.

Quick start

1. Copy environment variables:

```bash
cp .env.example .env
# set PUTTER_API_KEY in .env
```

2. Install dependencies and run:

```bash
cd llm-service
npm install
npm start
```

Endpoints

- `POST /chat` — Accepts `{ model, messages, options }`. `messages` is an array of `{ role, content }`. Returns `{ role, content, text, details, raw }`.
- `POST /generate` — Accepts `{ prompt, ...opts }` and proxies to the Putter generate endpoint.
- `GET /health` — service health + whether PUTTER_API_KEY is configured.

Notes

- The service will attempt to include the preprompt template from the main repo (`ai-service/helpers/chatbot_knowledge/preprompt_template.md`) if present.
