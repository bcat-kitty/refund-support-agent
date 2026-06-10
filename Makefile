.PHONY: install seed dev backend frontend test clean

PY ?= python3

install:
	cd backend && $(PY) -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
	cd frontend && npm install

seed:
	cd backend && . .venv/bin/activate && $(PY) -m app.seed

backend:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	@echo "Run 'make backend' in one terminal and 'make frontend' in another."
	@echo "Or: cd backend && uvicorn app.main:app --reload --port 8000"
	@echo "    cd frontend && npm run dev"

test:
	cd backend && . .venv/bin/activate && pytest

clean:
	rm -f backend/refund_agent.db backend/refund_agent.db-journal backend/refund_agent.db-wal backend/refund_agent.db-shm
	rm -rf backend/.venv frontend/node_modules frontend/dist
