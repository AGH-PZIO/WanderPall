"""
Export the FastAPI app's OpenAPI schema to docs/openapi.json.

Usage (from the repo root):
    PYTHONPATH=backend .venv/bin/python -m scripts.export_openapi

Or from inside the backend directory:
    python -m scripts.export_openapi
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from app.main import app

OUTPUT_PATH = os.environ.get("OPENAPI_OUTPUT_PATH", str(Path(__file__).resolve().parents[2] / "docs" / "openapi.json"))


def main() -> None:
    schema = app.openapi()
    output = Path(OUTPUT_PATH)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
    print(f"OpenAPI schema written to {output}")


if __name__ == "__main__":
    main()
