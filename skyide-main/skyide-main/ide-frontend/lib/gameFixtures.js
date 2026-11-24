import { convertPythonToBlockly } from './astConverter.js'

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

export const GAME_SHOWCASE_FIXTURES = [
	{
		id: 'tetris-lite',
		name: 'Tetris Lite',
		learningLevel: 'Advanced',
		supportLevel: 'supported-evolving',
		supportLabel: 'Runs in Python, switching still evolving',
		blurb: 'Stack and rotate falling pieces, lock clean placements, and race to the target.',
		tech: 'Frame drops, key handlers, collision checks, score locks, and simple piece state',
		controls: 'Arrow keys or WASD to move, rotate, and soft drop pieces.',
		goal: 'Practice falling-piece logic, collision checks, and score-based win states.',
	},
	{
		id: 'snake',
		name: 'Snake',
		learningLevel: 'Intermediate',
		supportLevel: 'guaranteed',
		supportLabel: 'Safe to switch Blocks <-> Python',
		blurb: 'Guide the snake, eat food, grow longer, and avoid the walls.',
		tech: 'Frame loop, queued direction changes, collision events, growth state, and scoring',
		controls: 'Arrow keys or WASD to steer the snake.',
		goal: 'Practice movement state, collision rules, growth, and scoring loops.',
	},
	{
		id: 'pong',
		name: 'Pong',
		learningLevel: 'Beginner',
		supportLevel: 'guaranteed',
		supportLabel: 'Safe to switch Blocks <-> Python',
		blurb: 'Classic paddle rally with player controls, CPU reaction, and score race.',
		tech: 'Key events, frame updates, touch checks, bounce rules, and HUD labels',
		controls: 'W/S or arrow keys to move the paddle, Space to serve.',
		goal: 'Practice key handlers, AI motion, bounce response, and scoreboard logic.',
	},
	{
		id: 'breakout',
		name: 'Breakout',
		learningLevel: 'Intermediate',
		supportLevel: 'guaranteed',
		supportLabel: 'Safe to switch Blocks <-> Python',
		blurb: 'Bounce the ball, clear bricks, and protect your last few balls.',
		tech: 'Paddle input, collision handlers, score/lives HUD, and launch timing',
		controls: 'Arrow keys to move the paddle, Space to launch the ball.',
		goal: 'Practice launch flow, collision reactions, and win/lose conditions.',
	},
	{
		id: 'shooter',
		name: 'Shooter',
		learningLevel: 'Intermediate',
		supportLevel: 'guaranteed',
		supportLabel: 'Safe to switch Blocks <-> Python',
		blurb: 'Move, fire, dodge enemies, and keep your health up while the score climbs.',
		tech: 'Key and key-up events, frame updates, collision handlers, random respawns, and win checks',
		controls: 'Arrow keys or WASD to move, Space to fire.',
		goal: 'Practice repeated input, projectile logic, enemy respawns, and health-based loss.',
	},
]

const GAME_TEMPLATE_PYTHON = {
	pong: `
# Single-player Pong for SkyIDE
# Controls:
# W / S = move player paddle
# Space = serve
#
# First to 5 wins

player_y = 8
cpu_y = 8

ball_x = 11
ball_y = 9
ball_dx = 0
ball_dy = 0

player_score = 0
cpu_score = 0
serve_dir = 1
round_live = 0

set_game_speed(12)
set_score(0)
set_lives(0)

set_hud_metric_visible("score", True)
set_hud_metric_visible("lives", True)
set_hud_metric_visible("timer", False)
set_hud_metric_visible("health", False)
set_hud_metric_label("score", "Player")
set_hud_metric_label("lives", "CPU")
set_hud_order("score,lives")
set_hud_text("Pong: first to 5 wins")
set_win_text("Player reached 5 first!")
set_game_over_text("CPU reached 5 first!")

create_sprite("player_paddle", 1, 8)
create_sprite("cpu_paddle", 21, 8)
create_sprite("ball", 11, 9)

set_sprite_size("player_paddle", 1, 4)
set_sprite_size("cpu_paddle", 1, 4)

set_sprite_color("player_paddle", "#4dd0e1")
set_sprite_color("cpu_paddle", "#ff8a65")
set_sprite_color("ball", "#ffd54f")

def reset_round():
    ball_x = 11
    ball_y = 9
    ball_dx = 0
    ball_dy = 0
    round_live = 0
    set_position("ball", ball_x, ball_y)

def launch_round():
    if round_live == 0:
        ball_dx = serve_dir
        if serve_dir == 1:
            ball_dy = 1
        else:
            ball_dy = -1
        round_live = 1

def move_up():
    player_y = player_y - 2
    if player_y < 0:
        player_y = 0
    set_position("player_paddle", 1, player_y)

def move_down():
    player_y = player_y + 2
    if player_y > 16:
        player_y = 16
    set_position("player_paddle", 1, player_y)

def move_cpu():
    if round_live == 1:
        if ball_y < cpu_y + 1:
            cpu_y = cpu_y - 1
        if ball_y > cpu_y + 2:
            cpu_y = cpu_y + 1

    if cpu_y < 0:
        cpu_y = 0
    if cpu_y > 16:
        cpu_y = 16

    set_position("cpu_paddle", 21, cpu_y)

def on_frame():
    if is_game_over() == False:
        if is_game_won() == False:
            move_cpu()

            if round_live == 1:
                ball_x = ball_x + ball_dx
                ball_y = ball_y + ball_dy

                if ball_y < 0:
                    ball_y = 0
                    ball_dy = 1

                if ball_y > GAME_BOUNDS["maxY"]:
                    ball_y = GAME_BOUNDS["maxY"]
                    ball_dy = -1

                set_position("ball", ball_x, ball_y)

                if sprites_touching("ball", "player_paddle"):
                    if ball_dx < 0:
                        ball_dx = 1
                        ball_x = 2

                        if ball_y <= player_y:
                            ball_dy = -1
                        if ball_y == player_y + 1:
                            ball_dy = 0
                        if ball_y == player_y + 2:
                            ball_dy = 0
                        if ball_y >= player_y + 3:
                            ball_dy = 1

                if sprites_touching("ball", "cpu_paddle"):
                    if ball_dx > 0:
                        ball_dx = -1
                        ball_x = 20

                        if ball_y <= cpu_y:
                            ball_dy = -1
                        if ball_y == cpu_y + 1:
                            ball_dy = 0
                        if ball_y == cpu_y + 2:
                            ball_dy = 0
                        if ball_y >= cpu_y + 3:
                            ball_dy = 1

                set_position("ball", ball_x, ball_y)

                if ball_x < 0:
                    cpu_score = cpu_score + 1
                    set_lives(cpu_score)
                    serve_dir = 1

                    if cpu_score >= 5:
                        game_over()
                    else:
                        reset_round()

                if ball_x > GAME_BOUNDS["maxX"]:
                    player_score = player_score + 1
                    set_score(player_score)
                    serve_dir = -1

                    if player_score >= 5:
                        win_game()
                    else:
                        reset_round()

reset_round()

register_key_handler("w", move_up)
register_key_handler("s", move_down)
register_key_handler("up", move_up)
register_key_handler("down", move_down)
register_key_handler("space", launch_round)

register_frame_handler(on_frame)
	`.trim(),
	breakout: `
# Breakout test for SkyIDE
# Controls:
# left / right = move paddle
# space = launch ball

paddle_x = 11
ball_x = 11
ball_y = 15
ball_dx = 0
ball_dy = 0
ball_live = 0
bricks_left = 6

set_score(0)
set_lives(3)
set_hud_metric_visible("score", True)
set_hud_metric_visible("lives", True)
set_hud_metric_visible("timer", False)
set_hud_metric_visible("health", False)
set_hud_metric_label("score", "Score")
set_hud_metric_label("lives", "Balls")
set_hud_order("score,lives")
set_hud_text("Breakout Test")
set_win_text("All bricks cleared.")
set_game_over_text("No balls left.")

create_sprite("paddle", 11, 17)
set_sprite_size("paddle", 4, 1)
set_sprite_color("paddle", "#4dd0e1")

create_sprite("ball", 11, 15)
set_sprite_color("ball", "#ffd54f")

create_sprite("brick1", 5, 3)
create_sprite("brick2", 8, 3)
create_sprite("brick3", 11, 3)
create_sprite("brick4", 14, 3)
create_sprite("brick5", 7, 5)
create_sprite("brick6", 12, 5)

set_sprite_color("brick1", "#ef5350")
set_sprite_color("brick2", "#ef5350")
set_sprite_color("brick3", "#ef5350")
set_sprite_color("brick4", "#ef5350")
set_sprite_color("brick5", "#ff8a65")
set_sprite_color("brick6", "#ff8a65")

def reset_ball():
    ball_x = paddle_x
    ball_y = 15
    ball_dx = 0
    ball_dy = 0
    ball_live = 0
    set_position("ball", ball_x, ball_y)

def launch_ball():
    if ball_live == 0:
        ball_dx = 1
        ball_dy = -1
        ball_live = 1

def move_left():
    paddle_x = paddle_x - 2
    if paddle_x < 2:
        paddle_x = 2
    set_position("paddle", paddle_x, 17)

    if ball_live == 0:
        ball_x = paddle_x
        set_position("ball", ball_x, ball_y)

def move_right():
    paddle_x = paddle_x + 2
    if paddle_x > 20:
        paddle_x = 20
    set_position("paddle", paddle_x, 17)

    if ball_live == 0:
        ball_x = paddle_x
        set_position("ball", ball_x, ball_y)

def on_ball_hits_paddle():
    if ball_live == 1:
        if ball_dy > 0:
            ball_dy = -1

            if ball_x < paddle_x:
                ball_dx = -1
            if ball_x > paddle_x:
                ball_dx = 1

def hit_brick1():
    if sprite_exists("brick1"):
        delete_sprite("brick1")
        change_score(10)
        bricks_left = bricks_left - 1
        ball_dy = 1

def hit_brick2():
    if sprite_exists("brick2"):
        delete_sprite("brick2")
        change_score(10)
        bricks_left = bricks_left - 1
        ball_dy = 1

def hit_brick3():
    if sprite_exists("brick3"):
        delete_sprite("brick3")
        change_score(10)
        bricks_left = bricks_left - 1
        ball_dy = 1

def hit_brick4():
    if sprite_exists("brick4"):
        delete_sprite("brick4")
        change_score(10)
        bricks_left = bricks_left - 1
        ball_dy = 1

def hit_brick5():
    if sprite_exists("brick5"):
        delete_sprite("brick5")
        change_score(10)
        bricks_left = bricks_left - 1
        ball_dy = 1

def hit_brick6():
    if sprite_exists("brick6"):
        delete_sprite("brick6")
        change_score(10)
        bricks_left = bricks_left - 1
        ball_dy = 1

def on_frame():
    if is_game_over() == False:
        if is_game_won() == False:
            if ball_live == 1:
                ball_x = ball_x + ball_dx
                ball_y = ball_y + ball_dy

                if ball_x <= 0:
                    ball_x = 0
                    ball_dx = 1

                if ball_x >= GAME_BOUNDS["maxX"]:
                    ball_x = GAME_BOUNDS["maxX"]
                    ball_dx = -1

                if ball_y <= 0:
                    ball_y = 0
                    ball_dy = 1

                set_position("ball", ball_x, ball_y)

                if bricks_left <= 0:
                    win_game()

                if ball_y > GAME_BOUNDS["maxY"]:
                    change_lives(-1)
                    if get_lives() <= 0:
                        game_over()
                    reset_ball()

                set_position("ball", ball_x, ball_y)

reset_ball()

register_key_handler("left", move_left)
register_key_handler("right", move_right)
register_key_handler("space", launch_ball)
register_collision_handler("ball", "paddle", on_ball_hits_paddle)
register_collision_handler("ball", "brick1", hit_brick1)
register_collision_handler("ball", "brick2", hit_brick2)
register_collision_handler("ball", "brick3", hit_brick3)
register_collision_handler("ball", "brick4", hit_brick4)
register_collision_handler("ball", "brick5", hit_brick5)
register_collision_handler("ball", "brick6", hit_brick6)

register_frame_handler(on_frame)
	`.trim(),
	snake: `
# Snake for SkyIDE
# Controls:
# Arrow keys / WASD = move
#
# Goal:
# Eat 5 food to win.

x = 6
y = 6
dx = 1
dy = 0

length = 1
score_now = 0
tick_counter = 0
move_delay = 6
tail_x = 6
tail_y = 6

s1x = 5
s1y = 6
s2x = 4
s2y = 6
s3x = 3
s3y = 6
s4x = 2
s4y = 6

if sprite_exists("head"):
    delete_sprite("head")
if sprite_exists("food"):
    delete_sprite("food")
if sprite_exists("seg1"):
    delete_sprite("seg1")
if sprite_exists("seg2"):
    delete_sprite("seg2")
if sprite_exists("seg3"):
    delete_sprite("seg3")
if sprite_exists("seg4"):
    delete_sprite("seg4")

set_score(0)
set_hud_metric_visible("score", True)
set_hud_metric_visible("lives", False)
set_hud_metric_visible("timer", False)
set_hud_metric_visible("health", False)
set_hud_metric_label("score", "Food")
set_hud_order("score")
set_hud_text("Snake: eat 5 food")
set_win_text("Snake complete.")
set_game_over_text("Snake crashed.")

create_sprite("head", 6, 6)
set_sprite_color("head", "#39c56b")

create_sprite("food", 12, 10)
set_sprite_color("food", "#ffd84d")
respawn_sprite_safe("food", "head", 4)

def go_left():
    if dx != 1:
        dx = -1
        dy = 0

def go_right():
    if dx != -1:
        dx = 1
        dy = 0

def go_up():
    if dy != 1:
        dx = 0
        dy = -1

def go_down():
    if dy != -1:
        dx = 0
        dy = 1

def collect_food():
    score_now = score_now + 1
    set_score(score_now)

    length = length + 1
    if length > 5:
        length = 5

    if length == 2:
        create_sprite("seg1", tail_x, tail_y)
        set_sprite_color("seg1", "#2fbf71")
        s1x = tail_x
        s1y = tail_y

    if length == 3:
        create_sprite("seg2", tail_x, tail_y)
        set_sprite_color("seg2", "#2fbf71")
        s2x = tail_x
        s2y = tail_y

    if length == 4:
        create_sprite("seg3", tail_x, tail_y)
        set_sprite_color("seg3", "#2fbf71")
        s3x = tail_x
        s3y = tail_y

    if length == 5:
        create_sprite("seg4", tail_x, tail_y)
        set_sprite_color("seg4", "#2fbf71")
        s4x = tail_x
        s4y = tail_y

    respawn_sprite_safe("food", "head", 4)

    if score_now >= 5:
        win_game()

def on_frame():
    if is_game_over() == False:
        if is_game_won() == False:
            tick_counter = tick_counter + 1

            if tick_counter >= move_delay:
                tick_counter = 0

                tail_x = x
                tail_y = y

                if length > 1:
                    tail_x = s1x
                    tail_y = s1y
                if length > 2:
                    tail_x = s2x
                    tail_y = s2y
                if length > 3:
                    tail_x = s3x
                    tail_y = s3y
                if length > 4:
                    tail_x = s4x
                    tail_y = s4y

                if length > 4:
                    s4x = s3x
                    s4y = s3y
                if length > 3:
                    s3x = s2x
                    s3y = s2y
                if length > 2:
                    s2x = s1x
                    s2y = s1y
                if length > 1:
                    s1x = x
                    s1y = y

                x = x + dx
                y = y + dy

                set_position("head", x, y)

                if length > 1:
                    set_position("seg1", s1x, s1y)
                if length > 2:
                    set_position("seg2", s2x, s2y)
                if length > 3:
                    set_position("seg3", s3x, s3y)
                if length > 4:
                    set_position("seg4", s4x, s4y)

                if x < 0:
                    game_over()
                if y < 0:
                    game_over()
                if x > GAME_BOUNDS["maxX"]:
                    game_over()
                if y > GAME_BOUNDS["maxY"]:
                    game_over()

                if length > 1:
                    if sprites_touching("head", "seg1"):
                        game_over()
                if length > 2:
                    if sprites_touching("head", "seg2"):
                        game_over()
                if length > 3:
                    if sprites_touching("head", "seg3"):
                        game_over()
                if length > 4:
                    if sprites_touching("head", "seg4"):
                        game_over()

register_key_handler("left", go_left)
register_key_handler("right", go_right)
register_key_handler("up", go_up)
register_key_handler("down", go_down)

register_key_handler("a", go_left)
register_key_handler("d", go_right)
register_key_handler("w", go_up)
register_key_handler("s", go_down)

register_collision_handler("head", "food", collect_food)
register_frame_handler(on_frame)
	`.trim(),
	shooter: `
# Single-Enemy Shooter Test for SkyIDE
# Controls:
# Arrow keys / WASD = move
# Space = fire
#
# Goal:
# Defeat 6 enemy waves before health reaches 0.

player_x = 11
player_y = 16

bullet_live = 0
bullet_x = 11
bullet_y = 15
space_ready = 1

enemy_x = 11
enemy_y = 4
enemy_dx = 1

kills = 0
target_kills = 6
health_now = 100

set_score(0)
set_health(100)

set_hud_metric_visible("score", True)
set_hud_metric_visible("health", True)
set_hud_metric_visible("lives", False)
set_hud_metric_visible("timer", False)
set_hud_metric_label("score", "Kills")
set_hud_metric_label("health", "Health")
set_hud_order("score,health")
set_hud_text("Shooter Test: defeat 6 waves")
set_win_text("Target reached. You win.")
set_game_over_text("Player destroyed.")

create_sprite("player", 11, 16)
set_sprite_color("player", "#4dd0e1")

create_sprite("bullet", 11, 15)
set_sprite_color("bullet", "#ffd54f")
hide_sprite("bullet")

create_sprite("enemy", 11, 4)
set_sprite_color("enemy", "#ef5350")

def reset_bullet():
    bullet_live = 0
    bullet_x = player_x
    bullet_y = player_y - 1
    set_position("bullet", bullet_x, bullet_y)
    hide_sprite("bullet")

def reset_enemy():
    enemy_x = random_int(2, 20)
    enemy_y = random_int(2, 8)
    enemy_dx = random_int(0, 1)

    if enemy_dx == 0:
        enemy_dx = -1

    set_position("enemy", enemy_x, enemy_y)

def arm_blaster():
    space_ready = 1

def fire_bullet():
    if bullet_live == 0:
        if space_ready == 1:
            bullet_live = 1
            space_ready = 0
            bullet_x = player_x
            bullet_y = player_y - 1
            set_position("bullet", bullet_x, bullet_y)
            show_sprite("bullet")

def move_left():
    player_x = player_x - 2
    if player_x < 0:
        player_x = 0
    set_position("player", player_x, player_y)

def move_right():
    player_x = player_x + 2
    if player_x > GAME_BOUNDS["maxX"]:
        player_x = GAME_BOUNDS["maxX"]
    set_position("player", player_x, player_y)

def move_up():
    player_y = player_y - 2
    if player_y < 0:
        player_y = 0
    set_position("player", player_x, player_y)

def move_down():
    player_y = player_y + 2
    if player_y > GAME_BOUNDS["maxY"]:
        player_y = GAME_BOUNDS["maxY"]
    set_position("player", player_x, player_y)

def move_enemy():
    enemy_x = enemy_x + enemy_dx

    if enemy_x <= 0:
        enemy_x = 0
        enemy_dx = 1
    if enemy_x >= GAME_BOUNDS["maxX"]:
        enemy_x = GAME_BOUNDS["maxX"]
        enemy_dx = -1

    set_position("enemy", enemy_x, enemy_y)

def move_bullet():
    if bullet_live == 1:
        bullet_y = bullet_y - 1
        set_position("bullet", bullet_x, bullet_y)

        if bullet_y <= 0:
            reset_bullet()

def bullet_hit_enemy():
    if bullet_live == 1:
        reset_bullet()
        change_score(1)
        kills = get_score()

        if kills >= target_kills:
            win_game()
        else:
            reset_enemy()

def player_hit_enemy():
    change_health(-25)
    health_now = get_health()
    player_x = 11
    player_y = 16
    set_position("player", player_x, player_y)

    if health_now <= 0:
        game_over()
    else:
        reset_enemy()

def on_frame():
    if is_game_over() == False:
        if is_game_won() == False:
            move_enemy()
            move_bullet()

reset_bullet()
reset_enemy()

register_key_handler("left", move_left)
register_key_handler("right", move_right)
register_key_handler("up", move_up)
register_key_handler("down", move_down)

register_key_handler("a", move_left)
register_key_handler("d", move_right)
register_key_handler("w", move_up)
register_key_handler("s", move_down)

register_key_handler("space", fire_bullet)
register_key_up_handler("space", arm_blaster)
register_collision_handler("bullet", "enemy", bullet_hit_enemy)
register_collision_handler("player", "enemy", player_hit_enemy)
register_frame_handler(on_frame)
	`.trim(),
	'tetris-lite': `
# Tetris Lite for SkyIDE
# Controls:
# left / right = move
# up / space = rotate
# down = soft drop
#
# Goal:
# Lock 6 pieces to win.

anchor_x = 10
anchor_y = 2
rotation = 0
piece_kind = 0

tick_counter = 0
drop_delay = 10
blocked = 0

set_score(0)

set_hud_metric_visible("score", True)
set_hud_metric_visible("lives", False)
set_hud_metric_visible("timer", False)
set_hud_metric_visible("health", False)
set_hud_metric_label("score", "Locks")
set_hud_order("score")
set_hud_text("Tetris Lite: lock 6 pieces")
set_win_text("Tetris Lite complete.")
set_game_over_text("Stack reached the top.")

create_sprite("wall_left", 5, 9)
set_sprite_size("wall_left", 1, 18)
set_sprite_color("wall_left", "#37474f")
add_to_group("wall_left", "stack")

create_sprite("wall_right", 16, 9)
set_sprite_size("wall_right", 1, 18)
set_sprite_color("wall_right", "#37474f")
add_to_group("wall_right", "stack")

create_sprite("floor", 6, 18)
set_sprite_size("floor", 11, 1)
set_sprite_color("floor", "#37474f")
add_to_group("floor", "stack")

create_sprite("seed_t", 0, 0)
set_sprite_color("seed_t", "#ab47bc")
hide_sprite("seed_t")

create_sprite("seed_i", 0, 0)
set_sprite_color("seed_i", "#29b6f6")
hide_sprite("seed_i")

create_sprite("b0", 10, 2)
create_sprite("b1", 9, 2)
create_sprite("b2", 11, 2)
create_sprite("b3", 10, 3)

def check_blocked():
    blocked = 0

    if sprite_touching_group("b0", "stack"):
        blocked = 1
    if sprite_touching_group("b1", "stack"):
        blocked = 1
    if sprite_touching_group("b2", "stack"):
        blocked = 1
    if sprite_touching_group("b3", "stack"):
        blocked = 1

def draw_piece():
    if piece_kind == 0:
        set_sprite_color("b0", "#ab47bc")
        set_sprite_color("b1", "#ab47bc")
        set_sprite_color("b2", "#ab47bc")
        set_sprite_color("b3", "#ab47bc")

        if rotation == 0:
            set_position("b0", anchor_x, anchor_y)
            set_position("b1", anchor_x - 1, anchor_y)
            set_position("b2", anchor_x + 1, anchor_y)
            set_position("b3", anchor_x, anchor_y + 1)
        else:
            set_position("b0", anchor_x, anchor_y)
            set_position("b1", anchor_x, anchor_y - 1)
            set_position("b2", anchor_x, anchor_y + 1)
            set_position("b3", anchor_x + 1, anchor_y)

    if piece_kind == 1:
        set_sprite_color("b0", "#29b6f6")
        set_sprite_color("b1", "#29b6f6")
        set_sprite_color("b2", "#29b6f6")
        set_sprite_color("b3", "#29b6f6")

        if rotation == 0:
            set_position("b0", anchor_x - 1, anchor_y)
            set_position("b1", anchor_x, anchor_y)
            set_position("b2", anchor_x + 1, anchor_y)
            set_position("b3", anchor_x + 2, anchor_y)
        else:
            set_position("b0", anchor_x, anchor_y - 1)
            set_position("b1", anchor_x, anchor_y)
            set_position("b2", anchor_x, anchor_y + 1)
            set_position("b3", anchor_x, anchor_y + 2)

def stamp_piece():
    if piece_kind == 0:
        if rotation == 0:
            spawn_sprite("seed_t", anchor_x, anchor_y, "stack")
            spawn_sprite("seed_t", anchor_x - 1, anchor_y, "stack")
            spawn_sprite("seed_t", anchor_x + 1, anchor_y, "stack")
            spawn_sprite("seed_t", anchor_x, anchor_y + 1, "stack")
        else:
            spawn_sprite("seed_t", anchor_x, anchor_y, "stack")
            spawn_sprite("seed_t", anchor_x, anchor_y - 1, "stack")
            spawn_sprite("seed_t", anchor_x, anchor_y + 1, "stack")
            spawn_sprite("seed_t", anchor_x + 1, anchor_y, "stack")

    if piece_kind == 1:
        if rotation == 0:
            spawn_sprite("seed_i", anchor_x - 1, anchor_y, "stack")
            spawn_sprite("seed_i", anchor_x, anchor_y, "stack")
            spawn_sprite("seed_i", anchor_x + 1, anchor_y, "stack")
            spawn_sprite("seed_i", anchor_x + 2, anchor_y, "stack")
        else:
            spawn_sprite("seed_i", anchor_x, anchor_y - 1, "stack")
            spawn_sprite("seed_i", anchor_x, anchor_y, "stack")
            spawn_sprite("seed_i", anchor_x, anchor_y + 1, "stack")
            spawn_sprite("seed_i", anchor_x, anchor_y + 2, "stack")

def spawn_piece():
    anchor_x = 10
    anchor_y = 2
    rotation = 0
    piece_kind = random_int(0, 1)

    draw_piece()
    check_blocked()

    if blocked == 1:
        game_over()

def move_left():
    old_x = anchor_x
    anchor_x = anchor_x - 1

    draw_piece()
    check_blocked()

    if blocked == 1:
        anchor_x = old_x
        draw_piece()

def move_right():
    old_x = anchor_x
    anchor_x = anchor_x + 1

    draw_piece()
    check_blocked()

    if blocked == 1:
        anchor_x = old_x
        draw_piece()

def rotate_piece():
    old_rot = rotation

    if rotation == 0:
        rotation = 1
    else:
        rotation = 0

    draw_piece()
    check_blocked()

    if blocked == 1:
        rotation = old_rot
        draw_piece()

def soft_drop():
    old_y = anchor_y
    anchor_y = anchor_y + 1

    draw_piece()
    check_blocked()

    if blocked == 1:
        anchor_y = old_y
        draw_piece()

        stamp_piece()
        change_score(1)

        if get_score() >= 6:
            win_game()
        else:
            spawn_piece()

def on_frame():
    if is_game_over() == False:
        if is_game_won() == False:
            tick_counter = tick_counter + 1

            if tick_counter >= drop_delay:
                tick_counter = 0

                old_y = anchor_y
                anchor_y = anchor_y + 1

                draw_piece()
                check_blocked()

                if blocked == 1:
                    anchor_y = old_y
                    draw_piece()

                    stamp_piece()
                    change_score(1)

                    if get_score() >= 6:
                        win_game()
                    else:
                        spawn_piece()

spawn_piece()

register_key_handler("left", move_left)
register_key_handler("right", move_right)
register_key_handler("up", rotate_piece)
register_key_handler("space", rotate_piece)
register_key_handler("down", soft_drop)

register_key_handler("a", move_left)
register_key_handler("d", move_right)
register_key_handler("w", rotate_piece)
register_key_handler("s", soft_drop)

register_frame_handler(on_frame)
	`.trim(),
}

const GAME_WORKSPACE_CACHE = new Map()

function buildFixtureWorkspace(id) {
	const python = GAME_TEMPLATE_PYTHON[id]
	if (!python) return null
	const workspace = convertPythonToBlockly(null, python)
	return workspace ? clone(workspace) : null
}

export function getGameWorkspaceFixture(id) {
	if (!GAME_WORKSPACE_CACHE.has(id)) {
		GAME_WORKSPACE_CACHE.set(id, buildFixtureWorkspace(id))
	}
	const workspace = GAME_WORKSPACE_CACHE.get(id)
	return workspace ? clone(workspace) : null
}

export function getGameTemplateOptions() {
	return GAME_SHOWCASE_FIXTURES.map(game => ({
		id: game.id,
		label: `${game.name} Demo · ${game.supportLabel}`,
	}))
}

export function getGameFixtureMeta(id) {
	return GAME_SHOWCASE_FIXTURES.find(game => game.id === id) || null
}
