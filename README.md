# MirrorMe 🪞

> Your life, reflected.

## Why this exists

For the past few years I've grown increasingly concerned with cloud-based tools — especially as advancements in Data Science, Machine Learning, and Deep Learning have given rise to LLMs and powerful AI systems. These tools are incredible, but they come with a cost most people don't think about: your data, your habits, your goals, your patterns — all living on someone else's server, trained on, monetized, or lost if a company shuts down.

Additionally, most of these tools are expensive — $10, $20, sometimes more per month — putting them out of reach for many people around the world. I wanted to build something genuinely powerful that anyone can use for free, runs entirely on their own machine, and never sends their data anywhere.

So I decided to build something different — a tool that is genuinely helpful, runs entirely on your own machine, costs $0 forever, and treats your personal data as exactly that: personal.

The result is MirrorMe — a local-first, AI-powered personal planner that doesn't just track what you do, but reflects who you are becoming.

## What it does

- **Path** — a gamified daily task journey (Duolingo-style nodes, timers, and stars) that turns your day into a meaningful progression
- **Planner** — a 7-day kanban board that syncs automatically to your Path so planning and doing stay connected
- **Goals** — a growing tree where each branch is a goal and fruits represent milestones you've reached
- **Mirror** — habit insights, star charts, and AI observations that reflect your real patterns over time — not vanity metrics
- **AI assistant** — a local LLM that knows your full context (tasks, goals, habits, history) and takes actions on your behalf

## The principles

- **Local-first** — your data lives in a SQLite file on your machine, nowhere else
- **Offline-capable** — works without internet, always
- **$0 forever** — no API keys, no subscriptions, no cloud
- **Open source** — MIT licensed, fork it, build on it, make it yours
- **Privacy by design** — the AI runs locally via Ollama, nothing is sent to external servers

## Tech stack

- **Backend**: Python + FastAPI + SQLite + ChromaDB
- **Frontend**: React + Vite + Tailwind CSS
- **AI**: Ollama (llama3.2:3b) + nomic-embed-text for RAG

## Prerequisites

- Python 3.11+
- Node 18+
- [Ollama](https://ollama.ai) installed with:

```bash
  ollama pull llama3.2:3b
  ollama pull nomic-embed-text
```

## Quick start

```bash
./setup.sh   # one-time install: backend/frontend deps + model pull
./start.sh   # launches backend, frontend, and Ollama
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for data-flow diagrams, or the full
[Contributor Onboarding Guide](https://docs.google.com/document/d/1CTdlnsnm-34Ai2OKQLPHZfM_QZZijbe1LDvPhAaRC-M/edit?usp=sharing)
for stack rationale, a walkthrough, and known rough edges.

## Contributing

Contributions are welcome, especially from any developers building.See CONTRIBUTING.md.

## License

MIT — open source, built with intention.

---

\_Built by [Livingstone Rwagatare](https://github.com/Rwagatare)
