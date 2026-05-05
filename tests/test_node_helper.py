import json
import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
HELPER = REPO_ROOT / "node-helper" / "index.js"


def _run_helper(payload: dict, env_overrides: dict | None = None) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["NODE_HELPER_MOCK"] = "true"
    if env_overrides:
        env.update(env_overrides)
    return subprocess.run(
        ["node", str(HELPER)],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        env=env,
        check=False,
    )


def test_open_position_mock_persists_client_position_mapping(tmp_path):
    position_map = tmp_path / "positions.json"
    payload = {
        "method": "openPosition",
        "params": {
            "poolAddress": "Pool111111111111111111111111111111111111111",
            "amountX": 0,
            "amountY": 100,
            "lowerBinId": -20,
            "upperBinId": 20,
            "clientPositionId": "client-pos-123",
        },
    }

    res = _run_helper(payload, {"NODE_HELPER_POSITION_MAP_PATH": str(position_map)})

    assert res.returncode == 0, res.stderr
    body = json.loads(res.stdout)
    assert body["signature"].startswith("MOCK_SIG_")
    assert body["positionPubkey"].startswith("MOCK_POS_")

    mapped = json.loads(position_map.read_text())
    assert mapped["client-pos-123"] == body["positionPubkey"]


def test_close_position_mock_fails_if_client_position_mapping_missing(tmp_path):
    position_map = tmp_path / "positions.json"

    res = _run_helper(
        {
            "method": "closePosition",
            "params": {
                "poolAddress": "Pool111111111111111111111111111111111111111",
                "positionId": "missing-id",
            },
        },
        {"NODE_HELPER_POSITION_MAP_PATH": str(position_map)},
    )

    assert res.returncode != 0
    assert "Unknown positionId mapping" in res.stderr


def test_open_position_mock_accepts_fractional_ui_amounts(tmp_path):
    position_map = tmp_path / "positions.json"
    payload = {
        "method": "openPosition",
        "params": {
            "poolAddress": "Pool111111111111111111111111111111111111111",
            "amountX": "1.25",
            "amountY": "0.000001",
            "lowerBinId": -20,
            "upperBinId": 20,
            "clientPositionId": "client-pos-fractional",
        },
    }

    res = _run_helper(payload, {"NODE_HELPER_POSITION_MAP_PATH": str(position_map)})

    assert res.returncode == 0, res.stderr
    body = json.loads(res.stdout)
    assert body["signature"].startswith("MOCK_SIG_")
    mapped = json.loads(position_map.read_text())
    assert mapped["client-pos-fractional"] == body["positionPubkey"]
