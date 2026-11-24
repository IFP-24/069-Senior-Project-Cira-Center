// Python code generators for game blocks

import { pythonGenerator } from 'blockly/python'

pythonGenerator.INDENT = '    '

const originalInit = pythonGenerator.init
pythonGenerator.init = function initWithoutNone(workspace, ...rest) {
	originalInit?.call(this, workspace, ...rest)
	this.INDENT = '    '
	this.__handlerNameCounts = Object.create(null)

	if (!this || typeof this.definitions_?.variables !== 'string') return

	const filtered = this.definitions_.variables
		.split('\n')
		.map(line => line.trim())
		.filter(line => line && !/=\s*None\s*$/i.test(line))
		.join('\n')

	if (filtered) this.definitions_.variables = filtered
	else delete this.definitions_.variables
}

const num = (gen, block, name) =>
	gen.valueToCode(block, name, pythonGenerator.ORDER_NONE) || '0'

const str = (gen, block, name) =>
	gen.valueToCode(block, name, pythonGenerator.ORDER_NONE) || '""'

const quote = value => pythonGenerator.quote_(String(value || ''))

const KEY_TO_PY_ALIAS = {
	ArrowLeft: 'left',
	ArrowRight: 'right',
	ArrowUp: 'up',
	ArrowDown: 'down',
	' ': 'space',
}

const normalizeKeyForPython = key => KEY_TO_PY_ALIAS[key] || String(key || '').toLowerCase()

const getVarId = block => {
	const field = block.getField('VAR')
	const modelId = field?.variable_?.getId?.()
	if (modelId) return modelId

	const raw = block.getFieldValue('VAR')
	if (raw && typeof raw === 'object') return raw.id || raw.name
	return raw
}

const sanitizePythonIdentifier = value => {
	const raw = String(value || 'var')
	const safe = raw.replace(/[^A-Za-z0-9_]/g, '_')
	if (/^[A-Za-z_]/.test(safe)) return safe
	return `v_${safe}`
}

const allocateReadableName = (gen, baseName) => {
	const registry = (gen.__handlerNameCounts ||= Object.create(null))
	const current = registry[baseName] || 0
	registry[baseName] = current + 1
	if (current === 0) return baseName
	return `${baseName}_${current + 1}`
}

const makeHandlerName = (gen, block, ...parts) => {
	const base = sanitizePythonIdentifier(parts.filter(Boolean).join('_') || 'handler')
	return allocateReadableName(gen, base, block)
}

const splitTopLevelUnits = code => {
	const lines = String(code || '').replace(/\r\n?/g, '\n').split('\n')
	const units = []
	let i = 0

	while (i < lines.length) {
		const line = lines[i]
		if (!line.trim()) {
			i += 1
			continue
		}

		if (/^def\s+[A-Za-z_][A-Za-z0-9_]*\(\):\s*$/.test(line)) {
			const block = [line]
			i += 1
			while (i < lines.length) {
				const next = lines[i]
				if (!next.trim()) {
					block.push(next)
					i += 1
					continue
				}
				if (/^\s/.test(next)) {
					block.push(next)
					i += 1
					continue
				}
				break
			}
			units.push({ type: 'def', code: block.join('\n').trimEnd() })
			continue
		}

		units.push({
			type: /^register_[A-Za-z0-9_]+\(/.test(line.trim()) ? 'register' : 'statement',
			code: line.trimEnd(),
		})
		i += 1
	}

	return units
}

const joinSection = units => units.map(unit => unit.code.trimEnd()).filter(Boolean).join('\n\n')

const formatGeneratedPython = code => {
	const units = splitTopLevelUnits(code)
	const firstStructuredIndex = units.findIndex(unit => unit.type !== 'statement')
	const setupStatements =
		firstStructuredIndex === -1
			? units.filter(unit => unit.type === 'statement')
			: units.slice(0, firstStructuredIndex).filter(unit => unit.type === 'statement')
	const defs = units.filter(unit => unit.type === 'def')
	const trailingStatements =
		firstStructuredIndex === -1
			? []
			: units.slice(firstStructuredIndex).filter(unit => unit.type === 'statement')
	const registrations = units.filter(unit => unit.type === 'register')
	const sections = [
		joinSection(setupStatements),
		joinSection(defs),
		joinSection(trailingStatements),
		joinSection(registrations),
	].filter(Boolean)
	if (!sections.length) return ''
	return `${sections.join('\n\n')}\n`
}

const originalWorkspaceToCode = pythonGenerator.workspaceToCode
pythonGenerator.workspaceToCode = function workspaceToCodeWithReadableLayout(workspace, ...rest) {
	const code = originalWorkspaceToCode.call(this, workspace, ...rest)
	return formatGeneratedPython(code)
}

const getVarName = (block, gen = pythonGenerator) => {
	const field = block.getField('VAR')
	const modelName = field?.variable_?.name
	if (modelName) return sanitizePythonIdentifier(modelName)

	const varId = getVarId(block)
	const variableMap = gen?.workspace_?.getVariableMap?.()
	const variableModel = variableMap?.getVariableById?.(varId)
	if (variableModel?.name) return sanitizePythonIdentifier(variableModel.name)

	const raw = block.getFieldValue('VAR')
	if (raw && typeof raw === 'object' && raw.name) {
		return sanitizePythonIdentifier(raw.name)
	}
	return sanitizePythonIdentifier(raw || varId || 'var')
}

pythonGenerator.forBlock['game_create_sprite'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const x = num(gen, block, 'X')
	const y = num(gen, block, 'Y')
	return `create_sprite(${quote(name)}, ${x}, ${y})\n`
}

pythonGenerator.forBlock['game_set_pixel'] = function (block, gen = pythonGenerator) {
	const x = num(gen, block, 'X')
	const y = num(gen, block, 'Y')
	const color = block.getFieldValue('COLOR') || '#ffd54f'
	return `set_pixel(${x}, ${y}, ${quote(color)})\n`
}

pythonGenerator.forBlock['game_spawn_sprite'] = function (block, gen = pythonGenerator) {
	const base = block.getFieldValue('BASE') || 'bullet'
	const x = num(gen, block, 'X')
	const y = num(gen, block, 'Y')
	const group = String(block.getFieldValue('GROUP') || '').trim()
	return `spawn_sprite(${quote(base)}, ${x}, ${y}, ${quote(group)})
`
}

pythonGenerator.forBlock['game_clone_sprite'] = function (block, gen = pythonGenerator) {
	const source = block.getFieldValue('SOURCE') || 'enemy'
	const target = block.getFieldValue('TARGET') || ''
	const x = num(gen, block, 'X')
	const y = num(gen, block, 'Y')
	const group = String(block.getFieldValue('GROUP') || '').trim()
	return `clone_sprite(${quote(source)}, ${quote(target)}, ${x}, ${y}, ${quote(group)})
`
}

pythonGenerator.forBlock['game_add_to_group'] = function (block) {
	const name = block.getFieldValue('NAME') || 'enemy_1'
	const group = block.getFieldValue('GROUP') || 'enemies'
	return `add_to_group(${quote(name)}, ${quote(group)})
`
}

pythonGenerator.forBlock['game_remove_from_group'] = function (block) {
	const name = block.getFieldValue('NAME') || 'enemy_1'
	const group = block.getFieldValue('GROUP') || 'enemies'
	return `remove_from_group(${quote(name)}, ${quote(group)})
`
}

pythonGenerator.forBlock['game_delete_group'] = function (block) {
	const group = block.getFieldValue('GROUP') || 'enemies'
	return `delete_group(${quote(group)})
`
}

pythonGenerator.forBlock['game_group_count'] = function (block) {
	const group = block.getFieldValue('GROUP') || 'enemies'
	return [`group_count(${quote(group)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_touching_group'] = function (block) {
	const name = block.getFieldValue('NAME') || 'bullet_1'
	const group = block.getFieldValue('GROUP') || 'enemies'
	return [`sprite_touching_group(${quote(name)}, ${quote(group)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_for_each_in_group'] = function (block, gen = pythonGenerator) {
	const group = block.getFieldValue('GROUP') || 'enemies'
	const item = getVarName(block, gen) || 'sprite_name'
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	return `for ${item} in get_group_members(${quote(group)}):\n${suite}`
}

pythonGenerator.forBlock['game_random_choice_group'] = function (block) {
	const group = block.getFieldValue('GROUP') || 'enemies'
	return [`random_group_member(${quote(group)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_set_color'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	const color = block.getFieldValue('COLOR') || '#4dd0e1'
	return `set_sprite_color(${quote(name)}, ${quote(color)})\n`
}

pythonGenerator.forBlock['game_set_size'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const width = num(gen, block, 'WIDTH')
	const height = num(gen, block, 'HEIGHT')
	return `set_sprite_size(${quote(name)}, ${width}, ${height})\n`
}

pythonGenerator.forBlock['game_set_velocity'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const vx = num(gen, block, 'VX')
	const vy = num(gen, block, 'VY')
	return `set_velocity(${quote(name)}, ${vx}, ${vy})
`
}

pythonGenerator.forBlock['game_change_velocity_x'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const dvx = num(gen, block, 'DVX')
	return `change_velocity_x(${quote(name)}, ${dvx})
`
}

pythonGenerator.forBlock['game_change_velocity_y'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const dvy = num(gen, block, 'DVY')
	return `change_velocity_y(${quote(name)}, ${dvy})
`
}

pythonGenerator.forBlock['game_get_velocity_x'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	return [`get_velocity_x(${quote(name)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_get_velocity_y'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	return [`get_velocity_y(${quote(name)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_set_acceleration'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const ax = num(gen, block, 'AX')
	const ay = num(gen, block, 'AY')
	return `set_acceleration(${quote(name)}, ${ax}, ${ay})
`
}

pythonGenerator.forBlock['game_set_gravity'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const g = num(gen, block, 'G')
	return `set_gravity(${quote(name)}, ${g})
`
}

pythonGenerator.forBlock['game_set_friction'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const f = num(gen, block, 'F')
	return `set_friction(${quote(name)}, ${f})
`
}

pythonGenerator.forBlock['game_set_jump_power'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const power = num(gen, block, 'POWER')
	return `set_jump_power(${quote(name)}, ${power})
`
}

pythonGenerator.forBlock['game_jump'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	return `jump_sprite(${quote(name)})
`
}

pythonGenerator.forBlock['game_delete_sprite'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	return `delete_sprite(${quote(name)})\n`
}

pythonGenerator.forBlock['game_get_bounds'] = function (block, gen = pythonGenerator) {
	const prop = block.getFieldValue('PROP') || 'width'
	return [`GAME_BOUNDS[${quote(prop)}]`, gen.ORDER_MEMBER]
}

pythonGenerator.forBlock['game_get_x'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	return [`get_sprite_x(${quote(name)})`, gen.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_get_y'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	return [`get_sprite_y(${quote(name)})`, gen.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_set_xy'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const x = num(gen, block, 'X')
	const y = num(gen, block, 'Y')
	return `set_position(${quote(name)}, ${x}, ${y})\n`
}

pythonGenerator.forBlock['game_set_position'] =
	pythonGenerator.forBlock['game_set_xy']

pythonGenerator.forBlock['game_move_by'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const dx = num(gen, block, 'DX')
	const dy = num(gen, block, 'DY')
	return `move_by(${quote(name)}, ${dx}, ${dy})
`
}

pythonGenerator.forBlock['game_keep_in_bounds'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	const mode = block.getFieldValue('MODE') || 'clamp'
	return `keep_in_bounds(${quote(name)}, ${quote(mode)})\n`
}

pythonGenerator.forBlock['game_move_toward'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'enemy'
	const target = block.getFieldValue('TARGET') || 'player'
	const step = num(gen, block, 'STEP')
	const stop = num(gen, block, 'STOP')
	return `move_toward(${quote(name)}, ${quote(target)}, ${step}, ${stop})\n`
}

pythonGenerator.forBlock['game_distance_to'] = function (block) {
	const a = block.getFieldValue('A') || 'player'
	const b = block.getFieldValue('B') || 'enemy'
	return [`distance_between(${quote(a)}, ${quote(b)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_change_x'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const dx = num(gen, block, 'DX')
	return `move_by(${quote(name)}, ${dx}, 0)\n`
}

pythonGenerator.forBlock['game_change_y'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const dy = num(gen, block, 'DY')
	return `move_by(${quote(name)}, 0, ${dy})\n`
}

pythonGenerator.forBlock['game_on_tick'] = function (block, gen = pythonGenerator) {
	const fn = makeHandlerName(gen, block, 'on', 'frame')
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_frame_handler(${fn})\n`
}

pythonGenerator.forBlock['game_every_n_ticks'] = function (block, gen = pythonGenerator) {
	const n = num(gen, block, 'N')
	const fn = makeHandlerName(gen, block, 'every', n, 'ticks')
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_every_ticks(${n}, ${fn})\n`
}

pythonGenerator.forBlock['game_after_n_ticks'] = function (block, gen = pythonGenerator) {
	const n = num(gen, block, 'N')
	const fn = makeHandlerName(gen, block, 'after', n, 'ticks')
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_after_ticks(${n}, ${fn})\n`
}

pythonGenerator.forBlock['game_on_frame'] =
	pythonGenerator.forBlock['game_on_tick']

pythonGenerator.forBlock['game_on_key'] = function (block, gen = pythonGenerator) {
	const key = block.getFieldValue('KEY') || 'ArrowLeft'
	const pyKey = normalizeKeyForPython(key)
	const fn = makeHandlerName(gen, block, 'on', pyKey, 'pressed')
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_key_handler(${quote(pyKey)}, ${fn})\n`
}

pythonGenerator.forBlock['game_is_key_pressed'] = function (block) {
	const key = block.getFieldValue('KEY') || 'ArrowLeft'
	const pyKey = normalizeKeyForPython(key)
	return [`key_is_pressed(${quote(pyKey)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_touching'] = function (block) {
	const a = block.getFieldValue('A') || 'hero'
	const b = block.getFieldValue('B') || 'enemy'
	return [`sprites_touching(${quote(a)}, ${quote(b)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_sprite_exists'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	return [`sprite_exists(${quote(name)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_touching_edge'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	return [`sprite_touching_edge(${quote(name)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_random_int'] = function (block, gen = pythonGenerator) {
	const min = num(gen, block, 'MIN')
	const max = num(gen, block, 'MAX')
	return [`random_int(${min}, ${max})`, gen.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_chance'] = function (block, gen = pythonGenerator) {
	const percent = num(gen, block, 'PERCENT')
	return [`chance(${percent})`, gen.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_random_x'] = function () {
	return ['random_int(0, GAME_BOUNDS["maxX"])', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_random_y'] = function () {
	return ['random_int(0, GAME_BOUNDS["maxY"])', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_set_random_seed'] = function (block, gen = pythonGenerator) {
	const seed = gen.valueToCode(block, 'SEED', pythonGenerator.ORDER_NONE) || '0'
	return `set_random_seed(${seed})\n`
}

pythonGenerator.forBlock['game_respawn_safe'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'coin'
	const away = String(block.getFieldValue('AWAY') || '').trim()
	const dist = num(gen, block, 'DIST')
	if (away) return `respawn_sprite_safe(${quote(name)}, ${quote(away)}, ${dist})\n`
	return `respawn_sprite_safe(${quote(name)}, '', ${dist})\n`
}

pythonGenerator.forBlock['game_set_speed'] = function (block, gen = pythonGenerator) {
	const rate = num(gen, block, 'RATE')
	return `set_game_speed(${rate})\n`
}

pythonGenerator.forBlock['game_change_speed'] = function (block, gen = pythonGenerator) {
	const delta = num(gen, block, 'DELTA')
	return `change_game_speed(${delta})\n`
}

pythonGenerator.forBlock['game_get_speed'] = function () {
	return ['get_game_speed()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_set_score'] = function (block, gen = pythonGenerator) {
	const value = num(gen, block, 'VALUE')
	return `set_score(${value})\n`
}

pythonGenerator.forBlock['game_change_score'] = function (block, gen = pythonGenerator) {
	const delta = num(gen, block, 'DELTA')
	return `change_score(${delta})\n`
}

pythonGenerator.forBlock['game_get_score'] = function () {
	return ['get_score()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_set_stat'] = function (block, gen = pythonGenerator) {
	const key = block.getFieldValue('KEY') || 'stat'
	const value = gen.valueToCode(block, 'VALUE', pythonGenerator.ORDER_NONE) || '0'
	return `set_stat(${quote(key)}, ${value})\n`
}

pythonGenerator.forBlock['game_get_stat'] = function (block) {
	const key = block.getFieldValue('KEY') || 'stat'
	return [`get_stat(${quote(key)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_game_over'] = function () {
	return 'game_over()\n'
}

pythonGenerator.forBlock['game_win_game'] = function () {
	return 'win_game()\n'
}

pythonGenerator.forBlock['game_is_game_over'] = function () {
	return ['is_game_over()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_is_game_won'] = function () {
	return ['is_game_won()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['text_print'] = function (block, gen = pythonGenerator) {
	const textValue = str(gen, block, 'TEXT')
	return `print(${textValue})\n`
}

pythonGenerator.forBlock['math_number'] = function (block) {
	const code = block.getFieldValue('NUM')
	return [code, pythonGenerator.ORDER_ATOMIC]
}

pythonGenerator.forBlock['text'] = function (block, gen = pythonGenerator) {
	const code = gen.quote_(block.getFieldValue('TEXT'))
	return [code, pythonGenerator.ORDER_ATOMIC]
}

pythonGenerator.forBlock['variables_set'] = function (block, gen = pythonGenerator) {
	const varName = getVarName(block, gen)
	const value = gen.valueToCode(block, 'VALUE', pythonGenerator.ORDER_NONE) || '0'
	return `${varName} = ${value}\n`
}

pythonGenerator.forBlock['variables_get'] = function (block, gen = pythonGenerator) {
	const code = getVarName(block, gen)
	return [code, pythonGenerator.ORDER_ATOMIC]
}

console.log('Python generators for game blocks loaded')

export { pythonGenerator }

pythonGenerator.forBlock['game_set_collision_layer'] = function (block) {
	const name = block.getFieldValue('NAME') || 'player'
	const layer = block.getFieldValue('LAYER') || 'default'
	return `set_collision_layer(${quote(name)}, ${quote(layer)})\n`
}

pythonGenerator.forBlock['game_set_collision_mask'] = function (block) {
	const name = block.getFieldValue('NAME') || 'player'
	const mask = block.getFieldValue('MASK') || '*'
	return `set_collision_mask(${quote(name)}, ${quote(mask)})\n`
}

pythonGenerator.forBlock['game_set_collision_response'] = function (block) {
	const name = block.getFieldValue('NAME') || 'player'
	const response = block.getFieldValue('RESPONSE') || 'none'
	return `set_collision_response(${quote(name)}, ${quote(response)})\n`
}

pythonGenerator.forBlock['game_colliding'] = function (block) {
	const a = block.getFieldValue('A') || 'player'
	const b = block.getFieldValue('B') || 'enemy'
	return [`sprites_colliding(${quote(a)}, ${quote(b)})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_on_collide'] = function (block, gen = pythonGenerator) {
	const a = block.getFieldValue('A') || 'player'
	const b = block.getFieldValue('B') || 'enemy'
	const fn = makeHandlerName(gen, block, 'on', a, 'hits', b)
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_collision_handler(${quote(a)}, ${quote(b)}, ${fn})\n`
}

pythonGenerator.forBlock['game_on_collide_group'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'player'
	const group = block.getFieldValue('GROUP') || 'enemies'
	const fn = makeHandlerName(gen, block, 'on', name, 'hits', group)
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_group_collision_handler(${quote(name)}, ${quote(group)}, ${fn})\n`
}

pythonGenerator.forBlock['game_on_collide_stay'] = function (block, gen = pythonGenerator) {
	const a = block.getFieldValue('A') || 'player'
	const b = block.getFieldValue('B') || 'enemy'
	const fn = makeHandlerName(gen, block, 'on', a, 'stays', 'on', b)
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_collision_stay_handler(${quote(a)}, ${quote(b)}, ${fn})\n`
}

pythonGenerator.forBlock['game_on_collide_exit'] = function (block, gen = pythonGenerator) {
	const a = block.getFieldValue('A') || 'player'
	const b = block.getFieldValue('B') || 'enemy'
	const fn = makeHandlerName(gen, block, 'on', a, 'leaves', b)
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_collision_exit_handler(${quote(a)}, ${quote(b)}, ${fn})\n`
}

pythonGenerator.forBlock['game_show_sprite'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	return `show_sprite(${quote(name)})\n`
}

pythonGenerator.forBlock['game_hide_sprite'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	return `hide_sprite(${quote(name)})\n`
}

pythonGenerator.forBlock['game_set_opacity'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const opacity = num(gen, block, 'OPACITY')
	return `set_sprite_opacity(${quote(name)}, ${opacity})\n`
}

pythonGenerator.forBlock['game_set_rotation'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const degrees = num(gen, block, 'DEGREES')
	return `set_sprite_rotation(${quote(name)}, ${degrees})\n`
}

pythonGenerator.forBlock['game_set_scale'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const sx = num(gen, block, 'SCALE_X')
	const sy = num(gen, block, 'SCALE_Y')
	return `set_sprite_scale(${quote(name)}, ${sx}, ${sy})\n`
}

pythonGenerator.forBlock['game_set_z_index'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const z = num(gen, block, 'Z')
	return `set_sprite_z_index(${quote(name)}, ${z})\n`
}

pythonGenerator.forBlock['game_set_image'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	const src = block.getFieldValue('SRC') || ''
	return `set_sprite_image(${quote(name)}, ${quote(src)})\n`
}

pythonGenerator.forBlock['game_set_spritesheet'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const src = block.getFieldValue('SRC') || ''
	const cols = num(gen, block, 'COLS')
	const rows = num(gen, block, 'ROWS')
	return `set_sprite_sheet(${quote(name)}, ${quote(src)}, ${cols}, ${rows})\n`
}

pythonGenerator.forBlock['game_define_animation'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'hero'
	const state = block.getFieldValue('STATE') || 'walk'
	const start = num(gen, block, 'START')
	const end = num(gen, block, 'END')
	const fps = num(gen, block, 'FPS')
	const loop = (block.getFieldValue('LOOP') || 'TRUE') === 'TRUE' ? 'True' : 'False'
	return `define_sprite_animation(${quote(name)}, ${quote(state)}, ${start}, ${end}, ${fps}, ${loop})\n`
}

pythonGenerator.forBlock['game_play_animation'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	const state = block.getFieldValue('STATE') || 'walk'
	return `play_sprite_animation(${quote(name)}, ${quote(state)})\n`
}

pythonGenerator.forBlock['game_stop_animation'] = function (block) {
	const name = block.getFieldValue('NAME') || 'hero'
	return `stop_sprite_animation(${quote(name)})\n`
}

pythonGenerator.forBlock['game_set_hud_text'] = function (block, gen = pythonGenerator) {
	const text = str(gen, block, 'TEXT')
	return `set_hud_text(${text})\n`
}

pythonGenerator.forBlock['game_set_lives'] = function (block, gen = pythonGenerator) {
	const value = num(gen, block, 'VALUE')
	return `set_lives(${value})\n`
}

pythonGenerator.forBlock['game_change_lives'] = function (block, gen = pythonGenerator) {
	const delta = num(gen, block, 'DELTA')
	return `change_lives(${delta})\n`
}

pythonGenerator.forBlock['game_get_lives'] = function () {
	return ['get_lives()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_set_timer'] = function (block, gen = pythonGenerator) {
	const value = num(gen, block, 'VALUE')
	return `set_timer(${value})\n`
}

pythonGenerator.forBlock['game_change_timer'] = function (block, gen = pythonGenerator) {
	const delta = num(gen, block, 'DELTA')
	return `change_timer(${delta})\n`
}

pythonGenerator.forBlock['game_get_timer'] = function () {
	return ['get_timer()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_set_health'] = function (block, gen = pythonGenerator) {
	const value = num(gen, block, 'VALUE')
	return `set_health(${value})\n`
}

pythonGenerator.forBlock['game_change_health'] = function (block, gen = pythonGenerator) {
	const delta = num(gen, block, 'DELTA')
	return `change_health(${delta})\n`
}

pythonGenerator.forBlock['game_get_health'] = function () {
	return ['get_health()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_set_score_overlay_visible'] = function (block) {
	const visible = (block.getFieldValue('VISIBLE') || 'TRUE') === 'TRUE' ? 'True' : 'False'
	return `show_score_overlay(${visible})\n`
}

pythonGenerator.forBlock['game_set_status_overlay_visible'] = function (block) {
	const visible = (block.getFieldValue('VISIBLE') || 'TRUE') === 'TRUE' ? 'True' : 'False'
	return `show_status_overlay(${visible})\n`
}

pythonGenerator.forBlock['game_set_hud_metric_visible'] = function (block) {
	const metric = block.getFieldValue('METRIC') || 'score'
	const visible = (block.getFieldValue('VISIBLE') || 'TRUE') === 'TRUE' ? 'True' : 'False'
	return `set_hud_metric_visible(${quote(metric)}, ${visible})\n`
}

pythonGenerator.forBlock['game_set_hud_metric_label'] = function (block) {
	const metric = block.getFieldValue('METRIC') || 'score'
	const label = block.getFieldValue('LABEL') || 'Score'
	return `set_hud_metric_label(${quote(metric)}, ${quote(label)})\n`
}

pythonGenerator.forBlock['game_set_hud_order'] = function (block) {
	const order = block.getFieldValue('ORDER') || 'score,lives,timer,health'
	return `set_hud_order(${quote(order)})\n`
}

pythonGenerator.forBlock['game_set_hud_inline_overlay'] = function (block) {
	const visible = (block.getFieldValue('VISIBLE') || 'FALSE') === 'TRUE' ? 'True' : 'False'
	return `set_hud_inline_overlay(${visible})\n`
}

pythonGenerator.forBlock['game_set_game_over_text'] = function (block) {
	const text = block.getFieldValue('TEXT') || 'Game over'
	return `set_game_over_text(${quote(text)})\n`
}

pythonGenerator.forBlock['game_set_win_text'] = function (block) {
	const text = block.getFieldValue('TEXT') || 'You win'
	return `set_win_text(${quote(text)})\n`
}

pythonGenerator.forBlock['game_on_scene'] = function (block, gen = pythonGenerator) {
	const name = block.getFieldValue('NAME') || 'menu'
	const fn = makeHandlerName(gen, block, 'on', 'scene', name)
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_scene(${quote(name)}, ${fn})\n`
}

pythonGenerator.forBlock['game_load_scene'] = function (block) {
	const name = block.getFieldValue('NAME') || 'level1'
	return `load_scene(${quote(name)})\n`
}

pythonGenerator.forBlock['game_restart_scene'] = function () {
	return 'restart_scene()\n'
}

pythonGenerator.forBlock['game_pause'] = function () {
	return 'pause_game()\n'
}

pythonGenerator.forBlock['game_resume'] = function () {
	return 'resume_game()\n'
}

pythonGenerator.forBlock['game_is_paused'] = function () {
	return ['is_game_paused()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_get_scene'] = function () {
	return ['get_current_scene()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_on_key_up'] = function (block, gen = pythonGenerator) {
	const key = block.getFieldValue('KEY') || 'ArrowLeft'
	const pyKey = normalizeKeyForPython(key)
	const fn = makeHandlerName(gen, block, 'on', pyKey, 'released')
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_key_up_handler(${quote(pyKey)}, ${fn})\n`
}

pythonGenerator.forBlock['game_on_mouse_click'] = function (block, gen = pythonGenerator) {
	const fn = makeHandlerName(gen, block, 'on', 'mouse', 'click')
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_mouse_click_handler(${fn})\n`
}

pythonGenerator.forBlock['game_mouse_x'] = function () {
	return ['get_mouse_x()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_mouse_y'] = function () {
	return ['get_mouse_y()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_mouse_down'] = function () {
	return ['is_mouse_down()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_on_touch_start'] = function (block, gen = pythonGenerator) {
	const fn = makeHandlerName(gen, block, 'on', 'touch', 'start')
	const body = gen.statementToCode(block, 'DO')
	const suite = body && body.trim() ? body : `${gen.INDENT}pass\n`
	const def = `def ${fn}():\n${suite}`
	return `${def}\nregister_touch_start_handler(${fn})\n`
}

pythonGenerator.forBlock['game_touch_x'] = function () {
	return ['get_touch_x()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_touch_y'] = function () {
	return ['get_touch_y()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_touch_down'] = function () {
	return ['is_touch_down()', pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_gamepad_button'] = function (block, gen = pythonGenerator) {
	const btn = num(gen, block, 'BUTTON')
	return [`gamepad_button_pressed(${btn})`, pythonGenerator.ORDER_FUNCTION_CALL]
}

pythonGenerator.forBlock['game_gamepad_axis'] = function (block, gen = pythonGenerator) {
	const axis = num(gen, block, 'AXIS')
	return [`get_gamepad_axis(${axis})`, pythonGenerator.ORDER_FUNCTION_CALL]
}
