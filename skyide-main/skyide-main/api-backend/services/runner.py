import os
import subprocess
import sys
import pathlib


def launch_game(game_id: str, config_path: pathlib.Path):
    env = os.environ.copy()
    env["SKYIDE_CONFIG"] = str(config_path)
    runner = pathlib.Path(__file__).parent.parent / "games" / "run.py"
    py = sys.executable
    process = subprocess.Popen([py, str(runner)], env=env)
    return {"ok": True, "pid": process.pid, "game": game_id}
