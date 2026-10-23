import os
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
FACTS = {"month": "2026-10", "currency": "INR", "income": "100.00", "expenses": "20.00", "savings": "80.00", "savingsRate": 80, "spending": [], "investmentCost": "0.00", "insights": []}

def test_health():
    assert client.get("/health").status_code == 200

def test_service_authentication():
    assert client.post("/respond", json={"question": "spending", "facts": FACTS}).status_code == 401

def test_missing_provider_does_not_fabricate_response(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN", "a" * 32)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = client.post("/respond", headers={"Authorization": "Bearer " + "a" * 32}, json={"question": "spending", "facts": FACTS})
    assert result.status_code == 503

def test_unrecognized_fields_rejected():
    assert client.post("/respond", json={"question": "spending", "facts": FACTS, "sql": "SELECT * FROM User"}).status_code == 422
