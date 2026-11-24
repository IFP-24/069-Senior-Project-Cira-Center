import tkinter as tk

# Logical grid size used by tetris.py (columns x rows)
WIDTH = 68
HEIGHT = 23


class Display:
    def __init__(self, canvas: tk.Canvas, scale: int = 15):
        # canvas may be None (headless), but we expect a Canvas for GUI mode
        self.canvas = canvas
        self.scale = scale
        self.rects = {}
        if self.canvas is not None:
            self._init_grid()

    def _init_grid(self):
        # Pre-create rectangles for every logical pixel so updates are fast
        for x in range(WIDTH):
            for y in range(HEIGHT):
                x0 = x * self.scale
                y0 = y * self.scale
                x1 = x0 + self.scale
                y1 = y0 + self.scale
                rect = self.canvas.create_rectangle(
                    x0, y0, x1, y1, outline="", fill="black"
                )
                self.rects[(x, y)] = rect

    def _rgb_to_hex(self, r: int, g: int, b: int) -> str:
        r = max(0, min(255, int(r)))
        g = max(0, min(255, int(g)))
        b = max(0, min(255, int(b)))
        return f"#{r:02x}{g:02x}{b:02x}"

    def drawPoint(self, x: int, y: int, r: int, g: int, b: int):
        # Clamp to grid and paint the pre-created rectangle
        if self.canvas is None:
            return
        if 0 <= x < WIDTH and 0 <= y < HEIGHT:
            rect = self.rects.get((x, y))
            if rect is not None:
                self.canvas.itemconfig(rect, fill=self._rgb_to_hex(r, g, b))

    def clearDisplay(self):
        # Alias if tetris ever calls it
        self.clearBuilding()

    def clearBuilding(self):
        if self.canvas is None:
            return
        for (x, y), rect in self.rects.items():
            self.canvas.itemconfig(rect, fill="black")
