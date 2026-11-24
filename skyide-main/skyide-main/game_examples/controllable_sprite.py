# center x
x = GAME_BOUNDS["width"]
x = x * 0.5

# center y
y = GAME_BOUNDS["height"]
y = y * 0.5

# movement speed
speed = 1

def on_frame():
    global x, y

    # move left
    if key_is_pressed("ArrowLeft"):
        x = x - speed

    # move right
    if key_is_pressed("ArrowRight"):
        x = x + speed

    # move up
    if key_is_pressed("ArrowUp"):
        y = y - speed

    # move down
    if key_is_pressed("ArrowDown"):
        y = y + speed

    # clamp X
    if x < 0:
        x = 0
    if x > GAME_BOUNDS["maxX"]:
        x = GAME_BOUNDS["maxX"]

    # clamp Y
    if y < 0:
        y = 0
    if y > GAME_BOUNDS["maxY"]:
        y = GAME_BOUNDS["maxY"]

    set_position("hero", x, y)

register_frame_handler(on_frame)

create_sprite("hero", x, y)