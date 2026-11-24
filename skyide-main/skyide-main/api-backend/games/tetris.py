from display_GUI import Display, WIDTH, HEIGHT
import random
import math
import sys

COUNT_DOWN_DELAY = 15
BLOCK = False


class Tetris:
    # geometry and buffers
    old_screen_r = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]
    old_screen_g = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]
    old_screen_b = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]

    screen_r = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]
    screen_g = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]
    screen_b = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]

    setShapes = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]
    setColors = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]

    # game state
    state = "attract"
    generalTimer = 0
    fallingTimer = 20
    slidingTimer = 1
    timer = 0

    stop = False
    checked = False
    gameOverY = HEIGHT - 1

    attract_r = 255
    attract_g = 255
    attract_b = 255

    # shapes (ported directly)
    line = {}
    line[0] = [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 0, 1, 2]]
    line[1] = [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0], [1, 2, 0, 0]]

    Tshape = {}
    Tshape[0] = [[0, 1, 0], [1, 1, 1], [0, 0, 0], [0, 1, 0, 0]]
    Tshape[1] = [[0, 1, 0], [0, 1, 1], [0, 1, 0], [0, 0, 1, 0]]
    Tshape[2] = [[0, 0, 0], [1, 1, 1], [0, 1, 0], [1, 0, 0, 0]]
    Tshape[3] = [[0, 1, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0, 1]]

    L = {}
    L[0] = [[0, 0, 0], [1, 1, 1], [1, 0, 0], [1, 0, 0, 0]]
    L[1] = [[1, 1, 0], [0, 1, 0], [0, 1, 0], [0, 0, 0, 1]]
    L[2] = [[0, 0, 1], [1, 1, 1], [0, 0, 0], [0, 1, 0, 0]]
    L[3] = [[0, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1, 0]]

    RL = {}
    RL[0] = [[0, 0, 0], [1, 1, 1], [0, 0, 1], [1, 0, 0, 0]]
    RL[1] = [[0, 1, 0], [0, 1, 0], [1, 1, 0], [0, 0, 0, 1]]
    RL[2] = [[1, 0, 0], [1, 1, 1], [0, 0, 0], [0, 1, 0, 0]]
    RL[3] = [[0, 1, 1], [0, 1, 0], [0, 1, 0], [0, 0, 1, 0]]

    S = {}
    S[0] = [[0, 1, 1], [1, 1, 0], [0, 0, 0], [0, 1, 0, 0]]
    S[1] = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0, 1]]

    RS = {}
    RS[0] = [[1, 1, 0], [0, 1, 1], [0, 0, 0], [0, 1, 0, 0]]
    RS[1] = [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 1, 0]]

    Block = {}
    Block[0] = [[1, 1, 0], [1, 1, 0], [0, 0, 0], [0, 1, 0, 1]]

    colors = {
        "Line": [255, 128, 0],
        "T": [255, 255, 0],
        "L": [127, 0, 255],
        "Reverse_L": [0, 0, 255],
        "Squiggly": [0, 255, 255],
        "Reverse_Squiggly": [0, 255, 0],
        "Block": [255, 0, 0],
    }

    characters = {}
    characters["t"] = [
        [1, 1, 1, 1],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
    ]
    characters["e"] = [
        [1, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 1, 1, 1],
    ]
    characters["r"] = [
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 0],
        [1, 0, 0, 1],
    ]
    characters["i"] = [
        [1, 1, 1, 1],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [1, 1, 1, 1],
    ]
    characters["s"] = [
        [1, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 1],
        [1, 1, 1, 1],
    ]

    characters["1"] = [
        [0, 0, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
    ]
    characters["2"] = [
        [1, 1, 1, 1],
        [0, 0, 0, 1],
        [1, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 1, 1, 1],
    ]
    characters["3"] = [
        [1, 1, 1, 1],
        [0, 0, 0, 1],
        [0, 1, 1, 1],
        [0, 0, 0, 1],
        [1, 1, 1, 1],
    ]

    shapes = {
        "Line": line,
        "T": Tshape,
        "L": L,
        "Reverse_L": RL,
        "Squiggly": S,
        "Reverse_Squiggly": RS,
        "Block": Block,
    }
    shapeNames = [
        "Line",
        "T",
        "L",
        "Reverse_L",
        "Squiggly",
        "Reverse_Squiggly",
        "Block",
    ]

    currentShape = ""
    pastShape = ""
    currentRotation = 0
    gaps = []
    shapeX = 0
    shapeY = 0
    size = 0
    move = True

    def __init__(self, display: Display, pressed: dict):
        self.display = display
        self.pressed = pressed

    # drawing helpers
    def clearScreen(self, r, g, b):
        for i in range(WIDTH):
            for j in range(HEIGHT):
                self.screen_r[i][j] = r
                self.screen_g[i][j] = g
                self.screen_b[i][j] = b

    def drawCharacter(self, character, x, y, r, g, b):
        if character == "t":
            if character in self.characters:
                pattern = self.characters[character]
                for i in range(len(pattern[0])):
                    for j in range(len(pattern)):
                        if pattern[j][i] == 1:
                            if j > 0:
                                self.putPixel(x + i * 2 + 1, y + j * 2, r, g, b)
                                self.putPixel(x + i * 2 + 2, y + j * 2, r, g, b)
                                self.putPixel(x + i * 2 + 1, y + j * 2 + 1, r, g, b)
                                self.putPixel(x + i * 2 + 2, y + j * 2 + 1, r, g, b)
                            else:
                                self.putPixel(x + i * 2, y + j * 2, r, g, b)
                                self.putPixel(x + i * 2 + 1, y + j * 2, r, g, b)
                                self.putPixel(x + i * 2, y + j * 2 + 1, r, g, b)
                                self.putPixel(x + i * 2 + 1, y + j * 2 + 1, r, g, b)
        else:
            if character in self.characters:
                pattern = self.characters[character]
                for i in range(len(pattern[0])):
                    for j in range(len(pattern)):
                        if pattern[j][i] == 1:
                            self.putPixel(x + i * 2, y + j * 2, r, g, b)
                            self.putPixel(x + i * 2 + 1, y + j * 2, r, g, b)
                            self.putPixel(x + i * 2, y + j * 2 + 1, r, g, b)
                            self.putPixel(x + i * 2 + 1, y + j * 2 + 1, r, g, b)

    def putPixel(self, x, y, r, g, b):
        if 0 <= x < WIDTH and 0 <= y < HEIGHT:
            self.screen_r[x][y] = r
            self.screen_g[x][y] = g
            self.screen_b[x][y] = b

    def screenUpdate(self):
        for i in range(WIDTH):
            for j in range(HEIGHT):
                if (
                    self.screen_r[i][j] != self.old_screen_r[i][j]
                    or self.screen_g[i][j] != self.old_screen_g[i][j]
                    or self.screen_b[i][j] != self.old_screen_b[i][j]
                ):
                    self.display.drawPoint(
                        i,
                        j,
                        self.screen_r[i][j],
                        self.screen_g[i][j],
                        self.screen_b[i][j],
                    )
                    self.old_screen_r[i][j] = self.screen_r[i][j]
                    self.old_screen_g[i][j] = self.screen_g[i][j]
                    self.old_screen_b[i][j] = self.screen_b[i][j]

    # main step
    def gameStep(self):
        if self.state == "attract":
            self.attractGameStep()
        elif self.state == "count down":
            self.countDownGameStep()
        elif self.state == "playing":
            if self.generalTimer < 1:
                self.generalTimer += 1
            else:
                self.playingGameStep()
                self.generalTimer = 0
        elif self.state == "delete":
            self.deleteGameStep()
        elif self.state == "game over":
            self.gameOverGameStep()
        else:
            self.state = "attract"
        self.screenUpdate()

    # --- states ---
    def gameOverGameStep(self):
        self.timer += 1
        if self.timer >= COUNT_DOWN_DELAY * 3:
            self.state = "attract"
            self.timer = 0
            self.gameOverY = HEIGHT - 1
        self.gameOverGameDraw()

    def gameOverGameDraw(self):
        for x in range(20):
            if 0 <= self.gameOverY < HEIGHT:
                self.putPixel(x, self.gameOverY, 0, 0, 0)
        self.gameOverY -= 1

    def attractGameStep(self):
        self.timer += 1
        if self.pressed.get("space"):
            self.state = "count down"
            self.timer = 0
        self.attractDraw()

    def countDownGameStep(self):
        self.timer += 1
        if self.timer >= COUNT_DOWN_DELAY * 3:
            self.state = "playing"
            if BLOCK:
                self.currentShape = "Line"
            else:
                self.currentShape = self.shapeNames[
                    random.randrange(0, len(self.shapeNames))
                ]
            self.currentRotation = random.randrange(
                0, len(self.shapes[self.currentShape])
            )
            self.gaps = self.shapes[self.currentShape][self.currentRotation][-1]
            self.shapeX = (
                20 // 2
                - len(self.shapes[self.currentShape][self.currentRotation][0]) // 2
                - self.gaps[2] * 2
            )
            if self.shapeX % 2 != 0:
                self.shapeX -= 1
            self.shapeY = 0 - self.gaps[0] * 2
            self.size = len(self.shapes[self.currentShape][self.currentRotation])
            for k in ["2-Left", "2-Right", "2-Up", "2-Down"]:
                self.pressed[k] = False

            self.completeRows = []
            self.setShapes = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]
            self.setColors = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]

            self.screen_r = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]
            self.screen_g = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]
            self.screen_b = [[0 for _ in range(HEIGHT)] for _ in range(WIDTH)]
            self.fallingTimer = 20
            self.slidingTimer = 1
            self.move = True
        self.countDownDraw()

    def playingGameStep(self):
        self.playingDraw()

        # rotation
        if self.pressed.get("2-Up") or self.pressed.get("space"):
            temp = len(self.shapes[self.currentShape])
            prevRotation = self.currentRotation
            self.currentRotation = (
                0 if self.currentRotation + 1 >= temp else self.currentRotation + 1
            )
            self.gaps = self.shapes[self.currentShape][self.currentRotation][-1]
            current = self.shapes[self.currentShape][self.currentRotation]
            if (
                self.shapeX + self.size - self.gaps[3] >= WIDTH - 1
                or self.shapeX + self.gaps[2] * 2 < 0
            ):
                self.currentRotation = prevRotation
                self.gaps = self.shapes[self.currentShape][self.currentRotation][-1]
            else:
                for y in range(len(current)):
                    if y == len(current) - 1:
                        break
                    for x in range(len(current[y])):
                        if current[x][y] == 1:
                            if (
                                self.setShapes[self.shapeX + y * 2][self.shapeY + x * 2]
                                == 1
                            ):
                                self.currentRotation = prevRotation
                                self.gaps = self.shapes[self.currentShape][
                                    self.currentRotation
                                ][-1]
                                break
            if prevRotation != self.currentRotation:
                print("rotate")
                sys.stdout.flush()

        # left
        elif self.pressed.get("2-Left"):
            if self.shapeX - 2 + self.gaps[2] * 2 >= 0:
                tempx = 0
                tempy = 0
                current = self.shapes[self.currentShape][self.currentRotation]
                self.stop = False
                for y in range(len(current)):
                    for x in range(len(current[y])):
                        if y == len(current) - 1:
                            break
                        if (
                            self.shapeX + y * 2 - 2 > WIDTH - 1
                            or self.shapeY + x * 2 > HEIGHT - 1
                        ):
                            break
                        elif (
                            self.setShapes[self.shapeX + y * 2 - 2][self.shapeY + x * 2]
                            == 1
                            and current[x][y] == 1
                        ):
                            self.stop = True
                            break
                move = True
                if not self.stop:
                    while tempx <= self.size - self.gaps[3]:
                        while tempy <= self.size - self.gaps[1] - 1:
                            if (
                                self.shapes[self.currentShape][self.currentRotation][
                                    tempy
                                ][tempx]
                                == 1
                            ):
                                if (
                                    self.setShapes[self.shapeX + tempy][
                                        self.shapeY + tempx
                                    ]
                                    != 0
                                ):
                                    move = False
                                    break
                                else:
                                    tempy += 1
                            else:
                                tempy += 1
                        tempx += 1
                    if move:
                        self.shapeX -= 2
                self.stop = False
                print("T-move")
                sys.stdout.flush()

        # right
        elif self.pressed.get("2-Right"):
            if self.shapeX + self.size * 2 - self.gaps[3] * 2 < 22:
                tempx = 0
                tempy = 0
                current = self.shapes[self.currentShape][self.currentRotation]
                self.stop = False
                for y in range(len(current)):
                    for x in range(len(current[y])):
                        if y == len(current) - 1:
                            break
                        if (
                            self.shapeX + y * 2 + 2 > WIDTH - 1
                            or self.shapeY + x * 2 > HEIGHT - 1
                        ):
                            break
                        elif (
                            self.setShapes[self.shapeX + y * 2 + 2][self.shapeY + x * 2]
                            == 1
                            and current[x][y] == 1
                        ):
                            self.stop = True
                            break
                move = True
                if not self.stop:
                    while tempx <= self.size - self.gaps[3]:
                        while tempy <= self.size - self.gaps[1] - 1:
                            if (
                                self.shapes[self.currentShape][self.currentRotation][
                                    tempy
                                ][tempx]
                                == 1
                            ):
                                if (
                                    self.setShapes[self.shapeX + tempy][
                                        self.shapeY + tempx
                                    ]
                                    != 0
                                ):
                                    move = False
                                    break
                                else:
                                    tempy += 1
                            else:
                                tempy += 1
                        tempx += 1
                    if move:
                        self.shapeX += 2
                self.stop = False
                print("T-move")
                sys.stdout.flush()

        # down
        if self.pressed.get("2-Down"):
            if self.shapeY + 2 - self.gaps[1] * 2 + self.size <= HEIGHT - 3:
                tempx = 0
                tempy = 0
                current = self.shapes[self.currentShape][self.currentRotation]
                self.stop = False
                for y in range(len(current)):
                    for x in range(len(current[y])):
                        if y == len(current) - 1:
                            break
                        if (
                            self.shapeX + y * 2 > WIDTH - 1
                            or self.shapeY + x * 2 + 2 > HEIGHT - 1
                        ):
                            break
                        elif (
                            self.setShapes[self.shapeX + y * 2][self.shapeY + x * 2 + 2]
                            == 1
                            and current[x][y] == 1
                        ):
                            self.stop = True
                            break
                move = True
                if not self.stop:
                    while tempx <= self.size - self.gaps[3]:
                        while tempy <= self.size - self.gaps[1] - 1:
                            if (
                                self.shapes[self.currentShape][self.currentRotation][
                                    tempy
                                ][tempx]
                                == 1
                            ):
                                if (
                                    self.setShapes[self.shapeX + tempy][
                                        self.shapeY + tempx
                                    ]
                                    != 0
                                ):
                                    move = False
                                    break
                                else:
                                    tempy += 1
                            else:
                                tempy += 1
                        tempx += 1
                    if move:
                        self.shapeY += 2
            else:
                self._land_shape()
                return

        # gravity
        if self.fallingTimer != 45:
            self.fallingTimer += 5
        else:
            current = self.shapes[self.currentShape][self.currentRotation]
            if not self.stop:
                for y in range(len(current)):
                    for x in range(len(current[y])):
                        if y == len(current) - 1:
                            break
                        if (
                            self.shapeX + y * 2 > WIDTH - 1
                            or self.shapeY + x * 2 + 2 > HEIGHT - 1
                        ):
                            break
                        elif (
                            self.setShapes[self.shapeX + y * 2][self.shapeY + x * 2 + 2]
                            == 1
                            and current[x][y] == 1
                        ):
                            self.stop = True
                            break
            if (
                self.shapeY + 1 - self.gaps[1] * 2 + self.size >= HEIGHT - 3
                or self.stop
            ):
                self._land_shape()
            else:
                self.shapeY += 2
            self.fallingTimer = 20

        if not self.checked:
            self.checkForCompleteRow()
        else:
            self.checked = False
        self.playingDraw()

    def _land_shape(self):
        current = self.shapes[self.currentShape][self.currentRotation]
        for y in range(len(current)):
            for x in range(len(current[y])):
                if y == len(current) - 1:
                    break
                if (
                    self.shapeX + y * 2 + 1 > WIDTH - 1
                    or self.shapeY + x * 2 + 1 > HEIGHT - 1
                ):
                    break
                elif current[x][y] == 1:
                    self.setShapes[self.shapeX + y * 2][self.shapeY + x * 2] = 1
                    self.setColors[self.shapeX + y * 2][self.shapeY + x * 2] = (
                        self.colors[self.currentShape]
                    )
                    self.setShapes[self.shapeX + y * 2 + 1][self.shapeY + x * 2] = 1
                    self.setColors[self.shapeX + y * 2 + 1][self.shapeY + x * 2] = (
                        self.colors[self.currentShape]
                    )
                    self.setShapes[self.shapeX + y * 2][self.shapeY + x * 2 + 1] = 1
                    self.setColors[self.shapeX + y * 2][self.shapeY + x * 2 + 1] = (
                        self.colors[self.currentShape]
                    )
                    self.setShapes[self.shapeX + y * 2 + 1][self.shapeY + x * 2 + 1] = 1
                    self.setColors[self.shapeX + y * 2 + 1][self.shapeY + x * 2 + 1] = (
                        self.colors[self.currentShape]
                    )
        self.checkForCompleteRow()
        self.checked = True
        if not self.completeRows:
            print("land")
            sys.stdout.flush()
            self.pastShape = self.currentShape
            self.currentShape = (
                "Line"
                if BLOCK
                else self.shapeNames[random.randrange(0, len(self.shapeNames))]
            )
            self.currentRotation = random.randrange(
                0, len(self.shapes[self.currentShape])
            )
            self.gaps = self.shapes[self.currentShape][self.currentRotation][-1]
            # NOTE: original code sometimes used 20/2 for placement; keep game's intention but fix integer math
            self.shapeX = (
                20 // 2
                - len(self.shapes[self.currentShape][self.currentRotation][0]) // 2
                - self.gaps[2] * 2
            )
            if self.shapeX % 2 != 0:
                self.shapeX -= 1
            self.shapeY = 0 - self.gaps[0] * 2
            self.size = len(self.shapes[self.currentShape][self.currentRotation])
            self.stop = False
            current = self.shapes[self.currentShape][self.currentRotation]
            for y in range(len(current)):
                if y == len(current) - 1:
                    break
                for x in range(len(current[y])):
                    if current[x][y] == 1:
                        if (
                            self.setShapes[self.shapeX + y * 2][self.shapeY + x * 2]
                            == 1
                        ):
                            self.state = "game over"
                            print("gameover")
                            sys.stdout.flush()
                            self.timer = 0
                            break

    def checkForCompleteRow(self):
        self.completeRows = []
        for y in range(len(self.setShapes[0])):
            rowComplete = True
            for x in range(len(self.setShapes)):
                if self.setShapes[x][y] != 1:
                    rowComplete = False
                    break
            if rowComplete:
                self.completeRows.append(y)
                self.timer = 0
                self.state = "delete"
                print("clear")
                sys.stdout.flush()

    def deleteGameStep(self):
        self.timer += 1
        if self.timer >= 10:
            iterate = 1
            if len(self.completeRows) > 1:
                iterate = len(self.completeRows) // 2
            for _ in range(iterate):
                for x in range(WIDTH):
                    for y in range(self.completeRows[-1], -1, -1):
                        if y - 2 >= HEIGHT - 1 or y == 0:
                            break
                        else:
                            self.setShapes[x][y] = self.setShapes[x][y - 2]
                            self.setColors[x][y] = self.setColors[x][y - 2]
                            if self.setColors[x][y] == 0:
                                self.putPixel(x, y - 2, 0, 0, 0)
                            else:
                                c = self.setColors[x][y]
                                self.putPixel(x, y - 2, c[0], c[1], c[2])
            self.state = "playing"
            self.completeRows = []
            self.timer = 0

            self.pastShape = self.currentShape
            self.currentShape = (
                "Line"
                if BLOCK
                else self.shapeNames[random.randrange(0, len(self.shapeNames))]
            )
            self.currentRotation = random.randrange(
                0, len(self.shapes[self.currentShape])
            )
            self.gaps = self.shapes[self.currentShape][self.currentRotation][-1]
            self.shapeX = (
                20 // 2
                - len(self.shapes[self.currentShape][self.currentRotation][0]) // 2
                - self.gaps[2] * 2
            )
            if self.shapeX % 2 != 0:
                self.shapeX -= 1
            self.shapeY = 0 - self.gaps[0] * 2
            self.size = len(self.shapes[self.currentShape][self.currentRotation])
            self.stop = False
        else:
            self.deleteGameDraw()

    def deleteGameDraw(self):
        color = int(round((math.sin(self.timer) + 1.0) * 127))
        self.clearScreen(0, 0, 0)
        current = self.shapes[self.currentShape][self.currentRotation]
        for y in range(len(current)):
            for x in range(len(current[y])):
                if y == len(current) - 1:
                    self.gaps[x] = current[y][x]
                elif current[x][y] == 1:
                    if x in self.completeRows:
                        self.putPixel(
                            self.shapeX + y * 2,
                            self.shapeY + x * 2,
                            color,
                            color,
                            color,
                        )
                        self.putPixel(
                            self.shapeX + y * 2 + 1,
                            self.shapeY + x * 2,
                            color,
                            color,
                            color,
                        )
                        self.putPixel(
                            self.shapeX + y * 2,
                            self.shapeY + x * 2 + 1,
                            color,
                            color,
                            color,
                        )
                        self.putPixel(
                            self.shapeX + y * 2 + 1,
                            self.shapeY + x * 2 + 1,
                            color,
                            color,
                            color,
                        )
                    else:
                        c = self.colors[self.currentShape]
                        self.putPixel(
                            self.shapeX + y * 2, self.shapeY + x * 2, c[0], c[1], c[2]
                        )
                        self.putPixel(
                            self.shapeX + y * 2 + 1,
                            self.shapeY + x * 2,
                            c[0],
                            c[1],
                            c[2],
                        )
                        self.putPixel(
                            self.shapeX + y * 2,
                            self.shapeY + x * 2 + 1,
                            c[0],
                            c[1],
                            c[2],
                        )
                        self.putPixel(
                            self.shapeX + y * 2 + 1,
                            self.shapeY + x * 2 + 1,
                            c[0],
                            c[1],
                            c[2],
                        )
        for x in range(WIDTH):
            for y in range(HEIGHT):
                if self.setShapes[x][y] == 1:
                    if y in self.completeRows:
                        self.putPixel(x, y, color, color, color)
                    else:
                        c = self.setColors[x][y]
                        self.putPixel(x, y, c[0], c[1], c[2])
        for x in range(0, 23):
            self.putPixel(x, 22, 128, 128, 128)

    # draws
    def attractDraw(self):
        self.clearScreen(0, 0, 0)
        self.attract_r += 8
        self.attract_g += 12
        self.attract_b += 16
        if self.attract_r >= 510:
            self.attract_r -= 510
        if self.attract_g >= 510:
            self.attract_g -= 510
        if self.attract_b >= 510:
            self.attract_b -= 510
        r = self.attract_r if self.attract_r <= 255 else 510 - self.attract_r
        g = self.attract_g if self.attract_g <= 255 else 510 - self.attract_g
        b = self.attract_b if self.attract_b <= 255 else 510 - self.attract_b
        x = 20 - self.timer
        self.drawCharacter("t", x, 5, r, g, b)
        self.drawCharacter("e", x + 10, 5, r, g, b)
        self.drawCharacter("t", x + 20, 5, r, g, b)
        self.drawCharacter("r", x + 30, 5, r, g, b)
        self.drawCharacter("i", x + 40, 5, r, g, b)
        self.drawCharacter("s", x + 50, 5, r, g, b)
        if x + 57 < 0:
            self.timer = 0

    def countDownDraw(self):
        self.clearScreen(0, 0, 0)
        if self.timer < COUNT_DOWN_DELAY:
            self.drawCharacter("3", 6, 5, 255, 255, 255)
        elif self.timer < COUNT_DOWN_DELAY * 2:
            self.drawCharacter("2", 6, 5, 255, 255, 255)
        elif self.timer < COUNT_DOWN_DELAY * 3:
            self.drawCharacter("1", 6, 5, 255, 255, 255)

    def playingDraw(self):
        self.clearScreen(0, 0, 0)
        # Draw playfield walls at x=0 and x=22 so visuals match movement bounds
        for y in range(0, HEIGHT - 1):
            self.putPixel(0, y, 128, 0, 0)
            self.putPixel(22, y, 128, 0, 0)
        current = self.shapes[self.currentShape][self.currentRotation]
        for y in range(len(current)):
            for x in range(len(current[y])):
                if y == len(current) - 1:
                    self.gaps[x] = current[y][x]
                elif current[x][y] == 1:
                    c = self.colors[self.currentShape]
                    self.putPixel(
                        self.shapeX + y * 2, self.shapeY + x * 2, c[0], c[1], c[2]
                    )
                    self.putPixel(
                        self.shapeX + y * 2 + 1, self.shapeY + x * 2, c[0], c[1], c[2]
                    )
                    self.putPixel(
                        self.shapeX + y * 2, self.shapeY + x * 2 + 1, c[0], c[1], c[2]
                    )
                    self.putPixel(
                        self.shapeX + y * 2 + 1,
                        self.shapeY + x * 2 + 1,
                        c[0],
                        c[1],
                        c[2],
                    )

        for x in range(WIDTH):
            for y in range(HEIGHT):
                if self.setShapes[x][y] == 1:
                    c = self.setColors[x][y]
                    self.putPixel(x, y, c[0], c[1], c[2])

        for x in range(0, 23):
            self.putPixel(x, 22, 128, 128, 128)
