// config.js
require('dotenv').config();

const config = {
    server: {
        port: process.env.PORT || 8080,
        corsOrigin: process.env.CORS_ORIGIN || '*',
    },
    puter: {
        token: process.env.PUTER_AUTH_TOKEN || process.env.PUTTER_API_KEY || '',
        baseUrl: (process.env.PUTTER_API_BASE_URL || 'https://api.putter.ai').replace(/\/$/, ''),
        timeout: parseInt(process.env.PUTTER_API_TIMEOUT || '30', 10) * 1000,
        // Cấu hình mặc định cho Model AI
        defaultModel: 'gpt-4o', 
        options: {
            temperature: 0.7,
            max_tokens: 1000,
        }
    },
    rag: {
        knowledgeDir: process.env.KNOWLEDGE_DIR || './ai-service/helpers/chatbot_knowledge',
        topK: 3,
        chunkOverlap: 0.2, // Tỉ lệ trùng lặp nếu bạn muốn cải thiện split
    }
};

module.exports = config;