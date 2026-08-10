#!/bin/bash
set -e

echo "Setting up MirrorMe..."

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "Python 3 required. Install from https://python.org"; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "Node.js required. Install from https://nodejs.org"; exit 1; }
command -v ollama  >/dev/null 2>&1 || { echo "Ollama required. Install from https://ollama.ai"; exit 1; }

# Backend setup
echo "Setting up backend..."
cd backend
python3 -m venv mirrorme_env
source mirrorme_env/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Frontend setup
echo "Setting up frontend..."
cd frontend
npm install
cd ..

# Model selection
echo ""
echo "Choose your AI model:"
echo "  1) llama3.2:3b    (recommended, 2GB, fast)"
echo "  2) phi3            (Microsoft, 2.3GB, efficient)"
echo "  3) gemma3:4b      (Google, 3.3GB, capable)"
echo "  4) mistral         (7B, 4.1GB, powerful)"
echo "  5) llama3.1:8b    (Meta, 4.7GB, most capable)"
read -p "Enter choice [1-5, default=1]: " model_choice

case $model_choice in
  2) MODEL="phi3" ;;
  3) MODEL="gemma3:4b" ;;
  4) MODEL="mistral" ;;
  5) MODEL="llama3.1:8b" ;;
  *) MODEL="llama3.2:3b" ;;
esac

echo "Pulling $MODEL and embedding model..."
ollama pull $MODEL
ollama pull nomic-embed-text

# Save chosen model to local config
echo "OLLAMA_MODEL=$MODEL" > .mirrorme_config

echo ""
echo "MirrorMe setup complete!"
echo "Run ./start.sh to launch the app"
