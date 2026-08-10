#!/bin/bash

# Load model config if exists
if [ -f .mirrorme_config ]; then
  source .mirrorme_config
fi
MODEL=${OLLAMA_MODEL:-llama3.2:3b}

echo "Starting MirrorMe with model: $MODEL"

# Start backend
cd backend
source mirrorme_env/bin/activate
uvicorn main:app --reload --reload-exclude 'mirrorme_env/*' --reload-exclude 'data/*' &
BACKEND_PID=$!
deactivate
cd ..

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Start Ollama
ollama serve &
OLLAMA_PID=$!

echo ""
echo "MirrorMe is running!"
echo "   App:     http://localhost:5173"
echo "   API:     http://localhost:8000"
echo "   Docs:    http://localhost:8000/docs"
echo "   Model:   $MODEL"
echo ""
echo "Press Ctrl+C to stop all services"

sleep 3
open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || true

trap "kill $BACKEND_PID $FRONTEND_PID $OLLAMA_PID 2>/dev/null; echo 'MirrorMe stopped.'" EXIT
wait
