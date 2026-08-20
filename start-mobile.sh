#!/bin/bash
export OLLAMA_HOST=0.0.0.0:11434

# Start Ollama
ollama serve &

# Start FastAPI bound to all interfaces
cd backend
source mirrorme_env/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
cd ..

# Start Vite
cd frontend
npm run dev
