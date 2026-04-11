import json
import os
from pathlib import Path

from app.main import app


def main() -> None:
    output_path = Path(os.environ.get("OPENAPI_OUTPUT_PATH", "../docs/openapi.json")).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
