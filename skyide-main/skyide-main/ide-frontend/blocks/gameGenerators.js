import * as Blockly from "blockly"
import { javascriptGenerator } from "blockly/javascript"

function num(gen, block, name) {
    return gen.valueToCode(block, name, gen.ORDER_NONE) || "0"
}

function q(value) {
    return JSON.stringify(String(value || ""))
}

function jsIdent(value, fallback = "item") {
    const raw = String(value || "").trim() || fallback
    const cleaned = raw.replace(/[^A-Za-z0-9_$]/g, "_")
    return /^[A-Za-z_$]/.test(cleaned) ? cleaned : `_${cleaned}`
}

function varName(gen, block, fieldName, fallback = "item") {
    const varId = block.getFieldValue(fieldName)
    if (gen?.nameDB_?.getName && varId) {
        try {
            const named = gen.nameDB_.getName(varId, Blockly.VARIABLE_CATEGORY_NAME)
            if (named) return named
        } catch { 0 }
    }
    const text = block.getField(fieldName)?.getText?.() || fallback
    return jsIdent(text, fallback)
}

export function registerGameGenerators(gen = javascriptGenerator) {
    gen.forBlock = gen.forBlock || {}
    gen.forBlock["game_create_sprite"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const x = num(gen, block, "X")
        const y = num(gen, block, "Y")
        return `Engine.createSprite(${q(name)}, ${x}, ${y})\n`
    }

    gen.forBlock["game_set_pixel"] = function (block) {
        const x = num(gen, block, "X")
        const y = num(gen, block, "Y")
        const color = block.getFieldValue("COLOR") || "#ffd54f"
        return `Engine.setPixel(${x}, ${y}, ${q(color)})\n`
    }

    gen.forBlock["game_spawn_sprite"] = function (block) {
        const base = block.getFieldValue("BASE") || "bullet"
        const x = num(gen, block, "X")
        const y = num(gen, block, "Y")
        const group = (block.getFieldValue("GROUP") || "").trim()
        return `Engine.spawnSprite(${q(base)}, ${x}, ${y}, ${q(group)})\n`
    }

    gen.forBlock["game_clone_sprite"] = function (block) {
        const source = block.getFieldValue("SOURCE") || "enemy"
        const target = block.getFieldValue("TARGET") || ""
        const x = num(gen, block, "X")
        const y = num(gen, block, "Y")
        const group = (block.getFieldValue("GROUP") || "").trim()
        return `Engine.cloneSprite(${q(source)}, ${q(target)}, ${x}, ${y}, ${q(group)})\n`
    }

    gen.forBlock["game_add_to_group"] = function (block) {
        const name = block.getFieldValue("NAME") || "enemy_1"
        const group = block.getFieldValue("GROUP") || "enemies"
        return `Engine.addToGroup(${q(name)}, ${q(group)})\n`
    }

    gen.forBlock["game_remove_from_group"] = function (block) {
        const name = block.getFieldValue("NAME") || "enemy_1"
        const group = block.getFieldValue("GROUP") || "enemies"
        return `Engine.removeFromGroup(${q(name)}, ${q(group)})\n`
    }

    gen.forBlock["game_delete_group"] = function (block) {
        const group = block.getFieldValue("GROUP") || "enemies"
        return `Engine.deleteGroup(${q(group)})\n`
    }

    gen.forBlock["game_group_count"] = function (block) {
        const group = block.getFieldValue("GROUP") || "enemies"
        return [`Engine.groupCount(${q(group)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_touching_group"] = function (block) {
        const name = block.getFieldValue("NAME") || "bullet_1"
        const group = block.getFieldValue("GROUP") || "enemies"
        return [`Engine.touchingGroup(${q(name)}, ${q(group)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_for_each_in_group"] = function (block) {
        const group = block.getFieldValue("GROUP") || "enemies"
        const item = varName(gen, block, "VAR", "sprite_name")
        const body = gen.statementToCode(block, "DO") || ""
        const members = gen.nameDB_?.getDistinctName?.("group_members", Blockly.Names.NameType.VARIABLE) || "group_members"
        const index = gen.nameDB_?.getDistinctName?.("group_index", Blockly.Names.NameType.VARIABLE) || "group_index"
        return `const ${members} = Engine.getGroupMembers(${q(group)})
for (let ${index} = 0; ${index} < ${members}.length; ${index}++) {
  let ${item} = ${members}[${index}]
${body}}
`
    }

    gen.forBlock["game_random_choice_group"] = function (block) {
        const group = block.getFieldValue("GROUP") || "enemies"
        return [`Engine.randomGroupMember(${q(group)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_set_color"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const color = block.getFieldValue("COLOR") || "#4dd0e1"
        return `Engine.setColor(${q(name)}, ${q(color)})\n`
    }

    gen.forBlock["game_set_size"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const width = num(gen, block, "WIDTH")
        const height = num(gen, block, "HEIGHT")
        return `Engine.setSize(${q(name)}, ${width}, ${height})\n`
    }

    gen.forBlock["game_delete_sprite"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        return `Engine.deleteSprite(${q(name)})\n`
    }

    gen.forBlock["game_get_bounds"] = function (block) {
        const prop = block.getFieldValue("PROP") || "width"
        return [`GAME_BOUNDS[${q(prop)}]`, gen.ORDER_MEMBER]
    }

    gen.forBlock["game_get_x"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        return [`Engine.getX(${q(name)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_get_y"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        return [`Engine.getY(${q(name)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_set_xy"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const x = num(gen, block, "X")
        const y = num(gen, block, "Y")
        return `Engine.setXY(${q(name)}, ${x}, ${y})\n`
    }

    gen.forBlock["game_set_position"] = gen.forBlock["game_set_xy"]

    gen.forBlock["game_move_by"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const dx = num(gen, block, "DX")
        const dy = num(gen, block, "DY")
        return `Engine.moveBy(${q(name)}, ${dx}, ${dy})\n`
    }

    gen.forBlock["game_keep_in_bounds"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const mode = block.getFieldValue("MODE") || "clamp"
        return `Engine.keepInBounds(${q(name)}, ${q(mode)})\n`
    }

    gen.forBlock["game_move_toward"] = function (block) {
        const name = block.getFieldValue("NAME") || "enemy"
        const target = block.getFieldValue("TARGET") || "player"
        const step = num(gen, block, "STEP")
        const stop = num(gen, block, "STOP")
        return `Engine.moveToward(${q(name)}, ${q(target)}, ${step}, ${stop})\n`
    }

    gen.forBlock["game_distance_to"] = function (block) {
        const a = block.getFieldValue("A") || "player"
        const b = block.getFieldValue("B") || "enemy"
        return [`Engine.distanceBetween(${q(a)}, ${q(b)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_change_x"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const dx = num(gen, block, "DX")
        return `Engine.moveBy(${q(name)}, ${dx}, 0)\n`
    }

    gen.forBlock["game_change_y"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const dy = num(gen, block, "DY")
        return `Engine.moveBy(${q(name)}, 0, ${dy})\n`
    }

    gen.forBlock["game_set_velocity"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const vx = num(gen, block, "VX")
        const vy = num(gen, block, "VY")
        return `Engine.setVelocity(${q(name)}, ${vx}, ${vy})\n`
    }

    gen.forBlock["game_change_velocity_x"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const dvx = num(gen, block, "DVX")
        return `Engine.changeVelocityX(${q(name)}, ${dvx})\n`
    }

    gen.forBlock["game_change_velocity_y"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const dvy = num(gen, block, "DVY")
        return `Engine.changeVelocityY(${q(name)}, ${dvy})\n`
    }

    gen.forBlock["game_get_velocity_x"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        return [`Engine.getVelocityX(${q(name)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_get_velocity_y"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        return [`Engine.getVelocityY(${q(name)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_set_acceleration"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const ax = num(gen, block, "AX")
        const ay = num(gen, block, "AY")
        return `Engine.setAcceleration(${q(name)}, ${ax}, ${ay})\n`
    }

    gen.forBlock["game_set_gravity"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const g = num(gen, block, "G")
        return `Engine.setGravity(${q(name)}, ${g})\n`
    }

    gen.forBlock["game_set_friction"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const f = num(gen, block, "F")
        return `Engine.setFriction(${q(name)}, ${f})\n`
    }

    gen.forBlock["game_set_jump_power"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        const power = num(gen, block, "POWER")
        return `Engine.setJumpPower(${q(name)}, ${power})\n`
    }

    gen.forBlock["game_jump"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        return `Engine.jump(${q(name)})\n`
    }

    gen.forBlock["game_on_tick"] = function (block) {
        const inner = gen.statementToCode(block, "DO") || ""
        return `Engine.onTick(function() {\n${inner}})\n`
    }

    gen.forBlock["game_every_n_ticks"] = function (block) {
        const n = num(gen, block, "N")
        const body = gen.statementToCode(block, "DO") || ""
        return `Engine.everyNTicks(${n}, function() {\n${body}})\n`
    }

    gen.forBlock["game_after_n_ticks"] = function (block) {
        const n = num(gen, block, "N")
        const body = gen.statementToCode(block, "DO") || ""
        return `Engine.afterNTicks(${n}, function() {\n${body}})\n`
    }

    gen.forBlock["game_on_frame"] = gen.forBlock["game_on_tick"]

    gen.forBlock["game_on_key"] = function (block) {
        const key = block.getFieldValue("KEY") || "ArrowLeft"
        const body = gen.statementToCode(block, "DO") || ""
        return `Engine.onKey(${q(key)}, function() {\n${body}})\n`
    }

    gen.forBlock["game_is_key_pressed"] = function (block) {
        const key = block.getFieldValue("KEY") || "ArrowLeft"
        return [`Engine.isDown(${q(key)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_touching"] = function (block) {
        const a = block.getFieldValue("A") || "hero"
        const b = block.getFieldValue("B") || "enemy"
        return [`Engine.touching(${q(a)}, ${q(b)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_sprite_exists"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        return [`Engine.spriteExists(${q(name)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_touching_edge"] = function (block) {
        const name = block.getFieldValue("NAME") || "hero"
        return [`Engine.touchingEdge(${q(name)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_random_int"] = function (block) {
        const min = num(gen, block, "MIN")
        const max = num(gen, block, "MAX")
        return [`Engine.randomInt(${min}, ${max})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_chance"] = function (block) {
        const percent = num(gen, block, "PERCENT")
        return [`Engine.chance(${percent})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_random_x"] = function () {
        return ["Engine.randomX()", gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_random_y"] = function () {
        return ["Engine.randomY()", gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_set_random_seed"] = function (block) {
        const seed = gen.valueToCode(block, "SEED", gen.ORDER_NONE) || "0"
        return `Engine.setRandomSeed(${seed})\n`
    }

    gen.forBlock["game_respawn_safe"] = function (block) {
        const name = block.getFieldValue("NAME") || "coin"
        const away = String(block.getFieldValue("AWAY") || "").trim()
        const dist = num(gen, block, "DIST")
        const awayFrom = away ? `[${q(away)}]` : "[]"
        return `Engine.respawnSprite(${q(name)}, { awayFrom: ${awayFrom}, minDistance: ${dist}, avoidOccupied: true })\n`
    }

    gen.forBlock["game_set_speed"] = function (block) {
        const rate = num(gen, block, "RATE")
        return `Engine.setTickRate(${rate})\n`
    }

    gen.forBlock["game_change_speed"] = function (block) {
        const delta = num(gen, block, "DELTA")
        return `Engine.changeTickRate(${delta})\n`
    }

    gen.forBlock["game_get_speed"] = function () {
        return ["Engine.getTickRate()", gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_set_score"] = function (block) {
        const value = num(gen, block, "VALUE")
        return `Engine.setScore(${value})\n`
    }

    gen.forBlock["game_change_score"] = function (block) {
        const delta = num(gen, block, "DELTA")
        return `Engine.addScore(${delta})\n`
    }

    gen.forBlock["game_get_score"] = function () {
        return ["Engine.getScore()", gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_set_stat"] = function (block) {
        const key = block.getFieldValue("KEY") || "stat"
        const value = gen.valueToCode(block, "VALUE", gen.ORDER_NONE) || "0"
        return `Engine.setStat(${q(key)}, ${value})\n`
    }

    gen.forBlock["game_get_stat"] = function (block) {
        const key = block.getFieldValue("KEY") || "stat"
        return [`Engine.getStat(${q(key)})`, gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_game_over"] = function () {
        return "Engine.gameOver()\n"
    }

    gen.forBlock["game_win_game"] = function () {
        return "Engine.winGame()\n"
    }

    gen.forBlock["game_is_game_over"] = function () {
        return ["Engine.isGameOver()", gen.ORDER_FUNCTION_CALL]
    }

    gen.forBlock["game_is_game_won"] = function () {
        return ["Engine.isWon()", gen.ORDER_FUNCTION_CALL]
    }
}

registerGameGenerators()

const __genExt = javascriptGenerator

__genExt.forBlock["game_set_collision_layer"] = function (block) {
    const name = block.getFieldValue("NAME") || "player"
    const layer = block.getFieldValue("LAYER") || "default"
    return `Engine.setCollisionLayer(${q(name)}, ${q(layer)})\n`
}

__genExt.forBlock["game_set_collision_mask"] = function (block) {
    const name = block.getFieldValue("NAME") || "player"
    const mask = block.getFieldValue("MASK") || "*"
    return `Engine.setCollisionMask(${q(name)}, ${q(mask)})\n`
}

__genExt.forBlock["game_set_collision_response"] = function (block) {
    const name = block.getFieldValue("NAME") || "player"
    const response = block.getFieldValue("RESPONSE") || "none"
    return `Engine.setCollisionResponse(${q(name)}, ${q(response)})\n`
}

__genExt.forBlock["game_colliding"] = function (block) {
    const a = block.getFieldValue("A") || "player"
    const b = block.getFieldValue("B") || "enemy"
    return [`Engine.colliding(${q(a)}, ${q(b)})`, __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_on_collide"] = function (block) {
    const a = block.getFieldValue("A") || "player"
    const b = block.getFieldValue("B") || "enemy"
    const body = __genExt.statementToCode(block, "DO") || ""
    return `Engine.onCollide(${q(a)}, ${q(b)}, function() {\n${body}})\n`
}

__genExt.forBlock["game_on_collide_group"] = function (block) {
    const name = block.getFieldValue("NAME") || "player"
    const group = block.getFieldValue("GROUP") || "enemies"
    const body = __genExt.statementToCode(block, "DO") || ""
    return `Engine.onCollideGroup(${q(name)}, ${q(group)}, function() {\n${body}})\n`
}

__genExt.forBlock["game_on_collide_stay"] = function (block) {
    const a = block.getFieldValue("A") || "player"
    const b = block.getFieldValue("B") || "enemy"
    const body = __genExt.statementToCode(block, "DO") || ""
    return `Engine.onCollideStay(${q(a)}, ${q(b)}, function() {\n${body}})\n`
}

__genExt.forBlock["game_on_collide_exit"] = function (block) {
    const a = block.getFieldValue("A") || "player"
    const b = block.getFieldValue("B") || "enemy"
    const body = __genExt.statementToCode(block, "DO") || ""
    return `Engine.onCollideExit(${q(a)}, ${q(b)}, function() {\n${body}})\n`
}

__genExt.forBlock["game_show_sprite"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    return `Engine.showSprite(${q(name)})\n`
}

__genExt.forBlock["game_hide_sprite"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    return `Engine.hideSprite(${q(name)})\n`
}

__genExt.forBlock["game_set_opacity"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    const opacity = num(__genExt, block, "OPACITY")
    return `Engine.setOpacity(${q(name)}, ${opacity})\n`
}

__genExt.forBlock["game_set_rotation"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    const degrees = num(__genExt, block, "DEGREES")
    return `Engine.setRotation(${q(name)}, ${degrees})\n`
}

__genExt.forBlock["game_set_scale"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    const sx = num(__genExt, block, "SCALE_X")
    const sy = num(__genExt, block, "SCALE_Y")
    return `Engine.setScale(${q(name)}, ${sx}, ${sy})\n`
}

__genExt.forBlock["game_set_z_index"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    const z = num(__genExt, block, "Z")
    return `Engine.setZIndex(${q(name)}, ${z})\n`
}

__genExt.forBlock["game_set_image"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    const src = block.getFieldValue("SRC") || ""
    return `Engine.setImage(${q(name)}, ${q(src)})\n`
}

__genExt.forBlock["game_set_spritesheet"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    const src = block.getFieldValue("SRC") || ""
    const cols = num(__genExt, block, "COLS")
    const rows = num(__genExt, block, "ROWS")
    return `Engine.setSpriteSheet(${q(name)}, ${q(src)}, ${cols}, ${rows})\n`
}

__genExt.forBlock["game_define_animation"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    const state = block.getFieldValue("STATE") || "walk"
    const start = num(__genExt, block, "START")
    const end = num(__genExt, block, "END")
    const fps = num(__genExt, block, "FPS")
    const loop = (block.getFieldValue("LOOP") || "TRUE") === "TRUE"
    return `Engine.defineAnimation(${q(name)}, ${q(state)}, ${start}, ${end}, ${fps}, ${loop})\n`
}

__genExt.forBlock["game_play_animation"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    const state = block.getFieldValue("STATE") || "walk"
    return `Engine.playAnimation(${q(name)}, ${q(state)})\n`
}

__genExt.forBlock["game_stop_animation"] = function (block) {
    const name = block.getFieldValue("NAME") || "hero"
    return `Engine.stopAnimation(${q(name)})\n`
}

__genExt.forBlock["game_set_hud_text"] = function (block) {
    const text = __genExt.valueToCode(block, "TEXT", __genExt.ORDER_NONE) || q("")
    return `Engine.setHudText(String(${text}))\n`
}

__genExt.forBlock["game_set_lives"] = function (block) {
    const value = num(__genExt, block, "VALUE")
    return `Engine.setLives(${value})\n`
}

__genExt.forBlock["game_change_lives"] = function (block) {
    const delta = num(__genExt, block, "DELTA")
    return `Engine.addLives(${delta})\n`
}

__genExt.forBlock["game_get_lives"] = function () {
    return ["Engine.getLives()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_set_timer"] = function (block) {
    const value = num(__genExt, block, "VALUE")
    return `Engine.setTimer(${value})\n`
}

__genExt.forBlock["game_change_timer"] = function (block) {
    const delta = num(__genExt, block, "DELTA")
    return `Engine.addTimer(${delta})\n`
}

__genExt.forBlock["game_get_timer"] = function () {
    return ["Engine.getTimer()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_set_health"] = function (block) {
    const value = num(__genExt, block, "VALUE")
    return `Engine.setHealth(${value})\n`
}

__genExt.forBlock["game_change_health"] = function (block) {
    const delta = num(__genExt, block, "DELTA")
    return `Engine.addHealth(${delta})\n`
}

__genExt.forBlock["game_get_health"] = function () {
    return ["Engine.getHealth()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_set_score_overlay_visible"] = function (block) {
    const visible = (block.getFieldValue("VISIBLE") || "TRUE") === "TRUE"
    return `Engine.setScoreOverlayVisible(${visible})\n`
}

__genExt.forBlock["game_set_status_overlay_visible"] = function (block) {
    const visible = (block.getFieldValue("VISIBLE") || "TRUE") === "TRUE"
    return `Engine.setStatusOverlayVisible(${visible})\n`
}

__genExt.forBlock["game_set_hud_metric_visible"] = function (block) {
    const metric = block.getFieldValue("METRIC") || "score"
    const visible = (block.getFieldValue("VISIBLE") || "TRUE") === "TRUE"
    return `Engine.setHudMetricVisible(${q(metric)}, ${visible})\n`
}

__genExt.forBlock["game_set_hud_metric_label"] = function (block) {
    const metric = block.getFieldValue("METRIC") || "score"
    const label = block.getFieldValue("LABEL") || "Score"
    return `Engine.setHudMetricLabel(${q(metric)}, ${q(label)})\n`
}

__genExt.forBlock["game_set_hud_order"] = function (block) {
    const order = block.getFieldValue("ORDER") || "score,lives,timer,health"
    return `Engine.setHudOrder(${q(order)})\n`
}

__genExt.forBlock["game_set_hud_inline_overlay"] = function (block) {
    const visible = (block.getFieldValue("VISIBLE") || "FALSE") === "TRUE"
    return `Engine.setHudInlineOverlay(${visible})\n`
}

__genExt.forBlock["game_set_game_over_text"] = function (block) {
    const text = block.getFieldValue("TEXT") || "Game over"
    return `Engine.setGameOverText(${q(text)})\n`
}

__genExt.forBlock["game_set_win_text"] = function (block) {
    const text = block.getFieldValue("TEXT") || "You win"
    return `Engine.setWinText(${q(text)})\n`
}

__genExt.forBlock["game_on_scene"] = function (block) {
    const name = block.getFieldValue("NAME") || "menu"
    const body = __genExt.statementToCode(block, "DO") || ""
    return `Engine.registerScene(${q(name)}, function() {\n${body}})\n`
}

__genExt.forBlock["game_load_scene"] = function (block) {
    const name = block.getFieldValue("NAME") || "level1"
    return `Engine.loadScene(${q(name)})\n`
}

__genExt.forBlock["game_restart_scene"] = function () {
    return "Engine.restartScene()\n"
}

__genExt.forBlock["game_pause"] = function () {
    return "Engine.pause()\n"
}

__genExt.forBlock["game_resume"] = function () {
    return "Engine.resume()\n"
}

__genExt.forBlock["game_is_paused"] = function () {
    return ["Engine.isPaused()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_get_scene"] = function () {
    return ["Engine.getScene()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_on_key_up"] = function (block) {
    const key = block.getFieldValue("KEY") || "ArrowLeft"
    const body = __genExt.statementToCode(block, "DO") || ""
    return `Engine.onKeyUp(${q(key)}, function() {\n${body}})\n`
}

__genExt.forBlock["game_on_mouse_click"] = function (block) {
    const body = __genExt.statementToCode(block, "DO") || ""
    return `Engine.onMouseClick(function() {\n${body}})\n`
}

__genExt.forBlock["game_mouse_x"] = function () {
    return ["Engine.getMouseX()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_mouse_y"] = function () {
    return ["Engine.getMouseY()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_mouse_down"] = function () {
    return ["Engine.isMouseDown()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_on_touch_start"] = function (block) {
    const body = __genExt.statementToCode(block, "DO") || ""
    return `Engine.onTouchStart(function() {\n${body}})\n`
}

__genExt.forBlock["game_touch_x"] = function () {
    return ["Engine.getTouchX()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_touch_y"] = function () {
    return ["Engine.getTouchY()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_touch_down"] = function () {
    return ["Engine.isTouchDown()", __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_gamepad_button"] = function (block) {
    const button = num(__genExt, block, "BUTTON")
    return [`Engine.isGamepadButtonDown(${button})`, __genExt.ORDER_FUNCTION_CALL]
}

__genExt.forBlock["game_gamepad_axis"] = function (block) {
    const axis = num(__genExt, block, "AXIS")
    return [`Engine.getGamepadAxis(${axis})`, __genExt.ORDER_FUNCTION_CALL]
}