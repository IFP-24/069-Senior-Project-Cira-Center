x = GAME_BOUNDS["width"]
x = x * 0.5

y = GAME_BOUNDS["height"]
y = y * 0.5

dx = 1
dy = 1

def on_frame():
    global x, y, dx, dy

    # move
    x = x + dx
    y = y + dy

    # clamp X
    if x < 0:
        dx = dx * -1
        x = 0
    if x > GAME_BOUNDS["maxX"]:
        dx = dx * -1
        x = GAME_BOUNDS["maxX"]

    # clamp Y
    if y < 0:
        dy = dy * -1
        y = 0
    if y > GAME_BOUNDS["maxY"]:
        dy = dy * -1
        y = GAME_BOUNDS["maxY"]

    set_position("hero", x, y)

register_frame_handler(on_frame)
create_sprite("hero", x, y)
