import os
import json
import tkinter as tk
from display_GUI import Display, WIDTH, HEIGHT
from tetris import Tetris

GAME_DELAY_MS = 50  # default; can be overridden via config


def load_config():
    path = os.environ.get("SKYIDE_CONFIG")
    if path and os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


class RunGame:
    def __init__(self, cfg):
        # key map
        self.pressed = {
            "2-Left": False,
            "2-Right": False,
            "2-Up": False,
            "2-Down": False,
            "space": False,
            "q": False,
        }

        # GUI
        self.root = tk.Tk()
        self.root.title("Tetris (Blockly Test)")
        scale = 15
        self.canvas = tk.Canvas(
            self.root,
            width=WIDTH * scale,
            height=HEIGHT * scale,
            highlightthickness=0,
            bg=cfg.get("background", "black"),
        )
        self.canvas.pack()
        self.display = Display(self.canvas, scale=scale)
        self.display.clearBuilding()

        # game (+ optional color overrides)
        self.game = Tetris(self.display, self.pressed)
        if "colors" in cfg:
            for k, rgb in cfg["colors"].items():
                if k in self.game.colors:
                    self.game.colors[k] = rgb

        # controls remap example (optional)
        self.control_map = cfg.get("controls", {"rotate": "space"})
        self._bind_keys()

        # gravity timing tweak (coarse)
        self.delay_ms = int(cfg.get("tick_ms", GAME_DELAY_MS))

        self._tick()
        self.root.mainloop()

    def _bind_keys(self):
        self.root.bind("<KeyPress>", self._on_press)
        self.root.bind("<KeyRelease>", self._on_release)

    def _on_press(self, e):
        key = e.keysym.lower()
        if key == "left":
            self.pressed["2-Left"] = True
        if key == "right":
            self.pressed["2-Right"] = True
        if key == "up":
            self.pressed["2-Up"] = True
        if key == "down":
            self.pressed["2-Down"] = True
        if key == self.control_map.get("rotate", "space"):
            self.pressed["space"] = True
        if key == "q":
            self.root.quit()

    def _on_release(self, e):
        key = e.keysym.lower()
        if key == "left":
            self.pressed["2-Left"] = False
        if key == "right":
            self.pressed["2-Right"] = False
        if key == "up":
            self.pressed["2-Up"] = False
        if key == "down":
            self.pressed["2-Down"] = False
        if key == self.control_map.get("rotate", "space"):
            self.pressed["space"] = False

    def _tick(self):
        self.game.gameStep()
        self.root.after(self.delay_ms, self._tick)


if __name__ == "__main__":
    cfg = load_config()
    RunGame(cfg)
