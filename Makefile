# Actor Factory — Development Makefile
# Stack: FastAPI/Python (uv) + Next.js (npm)
# Ports: API=8082, Frontend=3002

.DEFAULT_GOAL := help
.PHONY: help setup _check-setup dev-up dev-down dev-restart dev-status test build-docker run-docker clean

API_PORT := 8082
WEB_PORT := 3002

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@echo "  help           Show this help message"
	@echo "  setup          Install all dependencies (Python + Node)"
	@echo "  dev-up         Start dev servers (idempotent)"
	@echo "  dev-down       Stop dev servers (no-ops if nothing running)"
	@echo "  dev-restart    Restart dev servers cleanly"
	@echo "  dev-status     Check health of local servers"
	@echo "  test           Run tests with pytest"
	@echo "  build-docker   Build the Docker image"
	@echo "  run-docker     Run the Docker container locally"
	@echo "  clean          Remove build artifacts and environments"

# ─── Setup ────────────────────────────────────────────────────────────────────

setup: ## Install all dependencies
	@echo "Installing backend dependencies..."
	uv sync
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo ""
	@echo "✅ Setup complete. Run 'make dev-up' to start."

# ─── Internal Guards ──────────────────────────────────────────────────────────

_check-setup:
	@if [ ! -d .venv ]; then \
		echo "❌ Backend not set up. Run 'make setup' first."; exit 1; \
	fi
	@if [ ! -d frontend/node_modules ]; then \
		echo "❌ Frontend not set up. Run 'make setup' first."; exit 1; \
	fi

# ─── Dev Lifecycle ────────────────────────────────────────────────────────────

dev-up: _check-setup ## Start dev servers (idempotent)
	@STARTED=0; \
	if curl -sf http://localhost:$(API_PORT)/health > /dev/null 2>&1; then \
		echo "⚡ API already running on :$(API_PORT), skipping..."; \
	else \
		echo "Starting FastAPI server in background..."; \
		nohup uv run uvicorn src.actor_factory.main:app --reload --port $(API_PORT) > fastapi.log 2>&1 & echo $$! > .api.pid; \
		STARTED=1; \
	fi; \
	if curl -sf http://localhost:$(WEB_PORT) > /dev/null 2>&1; then \
		echo "⚡ Frontend already running on :$(WEB_PORT), skipping..."; \
	else \
		echo "Starting Next.js frontend in background..."; \
		cd frontend && nohup npm run dev -- -p $(WEB_PORT) > ../nextjs.log 2>&1 & echo $$! > ../.web.pid; \
		STARTED=1; \
	fi; \
	if [ $$STARTED -eq 1 ]; then \
		echo "Waiting for servers to start..."; sleep 4; \
	fi
	@$(MAKE) dev-status

dev-down: ## Stop dev servers (no-ops if nothing running)
	@API=$$(curl -sf http://localhost:$(API_PORT)/health > /dev/null 2>&1 && echo 1 || echo 0); \
	WEB=$$(curl -sf http://localhost:$(WEB_PORT) > /dev/null 2>&1 && echo 1 || echo 0); \
	if [ $$API -eq 0 ] && [ $$WEB -eq 0 ]; then \
		echo "ℹ️  No servers running. Nothing to stop."; \
	else \
		echo "Stopping API server..."; \
		if [ -f .api.pid ]; then kill -9 $$(cat .api.pid) 2>/dev/null || true; rm -f .api.pid; fi; \
		echo "Stopping frontend..."; \
		if [ -f .web.pid ]; then kill -9 $$(cat .web.pid) 2>/dev/null || true; rm -f .web.pid; fi; \
		pkill -f "uvicorn src.actor_factory.main:app" || true; \
		pkill -f "next dev" || true; \
		pkill -f "next-server" || true; \
		echo "Stopped."; \
	fi

dev-restart: _check-setup ## Restart dev servers cleanly
	@RUNNING=0; \
	if curl -sf http://localhost:$(API_PORT)/health > /dev/null 2>&1; then RUNNING=1; fi; \
	if curl -sf http://localhost:$(WEB_PORT) > /dev/null 2>&1; then RUNNING=1; fi; \
	if [ $$RUNNING -eq 1 ]; then \
		$(MAKE) dev-down; \
		echo "Waiting for ports to clear..."; sleep 2; \
	else \
		echo "No servers running, skipping shutdown..."; \
	fi
	@$(MAKE) dev-up

dev-status: ## Check health of local servers
	@echo ""
	@echo "=================================================="
	@echo "🚀 ActorFactory Dev Environment Status"
	@echo "=================================================="
	@if curl -sf http://localhost:$(WEB_PORT) > /dev/null 2>&1; then \
		echo "✅ Online        | Frontend UI     | http://localhost:$(WEB_PORT)"; \
	else \
		echo "❌ Offline       | Frontend UI     | http://localhost:$(WEB_PORT)"; \
	fi
	@if curl -sf http://localhost:$(API_PORT)/health > /dev/null 2>&1; then \
		echo "✅ Online        | FastAPI Health  | http://localhost:$(API_PORT)/health"; \
	else \
		echo "❌ Offline       | FastAPI Health  | http://localhost:$(API_PORT)/health"; \
	fi
	@if curl -sf http://localhost:$(API_PORT)/docs > /dev/null 2>&1; then \
		echo "✅ Online        | Swagger UI      | http://localhost:$(API_PORT)/docs"; \
	else \
		echo "❌ Offline       | Swagger UI      | http://localhost:$(API_PORT)/docs"; \
	fi
	@if curl -sf http://localhost:11434/ > /dev/null 2>&1; then \
		echo "✅ Online        | Ollama Daemon   | http://localhost:11434/"; \
	else \
		echo "❌ Offline       | Ollama Daemon   | http://localhost:11434/"; \
	fi
	@echo "=================================================="
	@echo ""

# ─── Quality ──────────────────────────────────────────────────────────────────

test: ## Run tests
	@echo "Running tests..."
	PYTHONPATH=. uv run pytest tests/ -v

# ─── Docker ───────────────────────────────────────────────────────────────────

build-docker: ## Build the Docker image
	@echo "Building Docker image..."
	docker build -t actor-factory:latest .

run-docker: ## Run the Docker container locally
	@echo "Running Docker container..."
	docker run -p $(API_PORT):$(API_PORT) actor-factory:latest

# ─── Cleanup ─────────────────────────────────────────────────────────────────

clean: ## Remove build artifacts and environments
	@echo "Cleaning up..."
	rm -rf .venv frontend/node_modules frontend/.next fastapi.log nextjs.log .api.pid .web.pid
	find . -type d -name "__pycache__" -exec rm -rf {} +
	@echo "✅ Clean."
