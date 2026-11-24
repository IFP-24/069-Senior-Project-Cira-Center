import * as Blockly from 'blockly'
import { sanitizeAstJson } from './sanitizeAstJson.js'
const rid = () => `id_${Math.random().toString(36).slice(2, 11)}`

/* ----------------- variable registry ----------------- */

function collectVars(py) {
	const names = new Set()
	py.split('\n').forEach(line => {
		const s = line.trim()
		if (!s) return
		if (/^[A-Za-z_]\w*\s*=/.test(s)) {
			const m = s.match(/^([A-Za-z_]\w*)\s*=/)
			if (m) names.add(m[1])
		}
	})
	return Array.from(names)
}

function makeVarMap(list) {
	const map = new Map()
	list.forEach(name => map.set(name, { id: `var_${name}`, name }))
	return map
}

const varField = v => ({ id: v.id, name: v.name })

/* ----------------- value helpers (numbers / vars / bounds) ----------------- */

const shadowVarGet = v => ({
	shadow: {
		type: 'variables_get',
		id: rid(),
		fields: { VAR: varField(v) }
	}
})

const shadowNum = n => ({
	shadow: {
		type: 'math_number',
		id: rid(),
		fields: { NUM: String(n) }
	}
})

const isNum = t => /^-?\d+(\.\d+)?$/.test(String(t))

const matchBoundsToken = raw => {
	const m = String(raw || '').match(
		/^GAME_BOUNDS\[\s*["'](width|height|maxX|maxY|spriteSize)["']\s*\]$/i
	)
	if (!m) return null
	const key = m[1]
	if (
		key === 'width' ||
		key === 'height' ||
		key === 'maxX' ||
		key === 'maxY' ||
		key === 'spriteSize'
	) {
		return key
	}
	return null
}

// Any simple value allowed on the right-hand side:
//   - identifiers (x, dx)
//   - numbers (10, -3.5)
//   - GAME_BOUNDS["..."]
const VALUE_TOKEN_RE =
	'([A-Za-z_]\\w*|-?\\d+(?:\\.\\d+)?|GAME_BOUNDS\\[\\s*["\'](?:width|height|maxX|maxY|spriteSize)["\']\\s*\\])'

function valFromToken(token, varMap) {
	if (isNum(token)) return shadowNum(token)

	const boundsKey = matchBoundsToken(token)
	if (boundsKey) {
		return {
			block: {
				type: 'game_get_bounds',
				id: rid(),
				fields: { PROP: boundsKey }
			}
		}
	}

	const s = String(token)
	const existing = varMap.get(s)
	const v = existing || { id: `var_${s}`, name: s }
	if (!existing) varMap.set(s, v)
	return shadowVarGet(v)
}

/* ----------------- small block builders ----------------- */

function mkArithmetic(op, left, right) {
	return {
		block: {
			type: 'math_arithmetic',
			id: rid(),
			fields: { OP: op },
			inputs: { A: left, B: right }
		}
	}
}

function mkSetVar(v, valueInput) {
	return {
		type: 'variables_set',
		id: rid(),
		fields: { VAR: varField(v) },
		inputs: { VALUE: valueInput }
	}
}

function cloneBlockRoot(block) {
	return block ? JSON.parse(JSON.stringify(block)) : null
}

function rootFromBody(body = []) {
	if (Array.isArray(body)) return linkSequence(cloneBlocks(body))
	return cloneBlockRoot(body)
}

function mkProcedureDefinition(name, bodyBlocks = []) {
	return {
		type: 'procedures_defnoreturn',
		id: rid(),
		fields: { NAME: String(name || '') },
		inputs: { STACK: { block: rootFromBody(bodyBlocks) } },
	}
}

function mkProcedureCall(name) {
	return {
		type: 'procedures_callnoreturn',
		id: rid(),
		fields: { NAME: String(name || '') },
		extraState: { name: String(name || ''), params: [] },
	}
}

function isImplicitFrameHandlerName(fnName) {
	return /^on_frame(?:_[A-Za-z0-9_]+)?$/.test(String(fnName || ''))
}

function collectProcedureNames(lines = []) {
	const names = new Set()
	for (const line of lines) {
		const trimmed = String(line || '').trim()
		const match = trimmed.match(/^def\s+([A-Za-z_]\w*)\(\)\s*:/)
		if (match) names.add(match[1])
	}
	return names
}

function getOrCreateVar(varName, varMap) {
	const existing = varMap.get(varName)
	const v = existing || { id: `var_${varName}`, name: varName }
	if (!existing) varMap.set(varName, v)
	return v
}

function linkSequence(blocks) {
	if (!blocks || !blocks.length) return null
	for (let i = 0; i < blocks.length - 1; i++) {
		blocks[i].next = { block: blocks[i + 1] }
	}
	return blocks[0]
}

function cloneBlocks(blocks) {
	return JSON.parse(JSON.stringify(blocks || []))
}

function walkBlockTree(block, visit) {
	if (!block || typeof block !== 'object') return
	visit(block)

	if (block.inputs && typeof block.inputs === 'object') {
		for (const input of Object.values(block.inputs)) {
			if (input?.block) walkBlockTree(input.block, visit)
			if (input?.shadow) walkBlockTree(input.shadow, visit)
		}
	}

	if (block.next?.block) {
		walkBlockTree(block.next.block, visit)
	}
}

function collectAstProcedureBodies(astBlocks = []) {
	const procedureBodies = new Map()

	for (const root of astBlocks || []) {
		walkBlockTree(root, block => {
			if (block?.type !== 'procedures_defnoreturn' && block?.type !== 'procedures_defreturn') return
			const name = String(block?.fields?.NAME || '').trim()
			const stackRoot = block?.inputs?.STACK?.block
			if (!name || !stackRoot) return
			procedureBodies.set(name, cloneBlockRoot(stackRoot))
		})
	}

	return procedureBodies
}

function preferredBodyRoot(fnName, suiteBlocks, astProcedureBodies = new Map()) {
	if (astProcedureBodies?.has(fnName)) {
		return cloneBlockRoot(astProcedureBodies.get(fnName))
	}
	return rootFromBody(suiteBlocks)
}

function isCustomGameRootBlock(block) {
	const type = String(block?.type || '')
	return type.startsWith('game_') || type.startsWith('procedures_')
}

function isStructuredStandardRootBlock(block) {
	const type = String(block?.type || '')
	return ['variables_set', 'controls_if', 'controls_for', 'controls_whileUntil'].includes(type)
}

function hasAstBackedTopLevelStatements(astBlocks = []) {
	return (astBlocks || []).some(block => {
		const type = String(block?.type || '')
		return type && !type.startsWith('procedures_')
	})
}

function isAstCustomEventRootBlock(block) {
	const type = String(block?.type || '')
	return [
		'game_on_tick',
		'game_on_key',
		'game_on_key_up',
		'game_on_mouse_click',
		'game_on_touch_start',
		'game_on_scene',
		'game_every_n_ticks',
		'game_after_n_ticks',
		'game_on_collide',
		'game_on_collide_stay',
		'game_on_collide_exit',
		'game_on_collide_group',
	].includes(type)
}

function hasAstBackedCustomRegistrations(astBlocks = []) {
	return (astBlocks || []).some(isAstCustomEventRootBlock)
}

function normalizeBlockSignature(block) {
	if (!block || typeof block !== 'object') return null

	const normalized = {
		type: block.type || '',
		fields: block.fields || null,
		extraState: block.extraState || null,
	}

	if (block.inputs && typeof block.inputs === 'object') {
		const inputEntries = Object.entries(block.inputs)
			.map(([key, input]) => [
				key,
				{
					block: normalizeBlockSignature(input?.block),
					shadow: normalizeBlockSignature(input?.shadow),
				},
			])
			.filter(([, value]) => value.block || value.shadow)

		if (inputEntries.length) {
			normalized.inputs = Object.fromEntries(inputEntries)
		}
	}

	if (block.next?.block) {
		normalized.next = normalizeBlockSignature(block.next.block)
	}

	return normalized
}

function rootBlockSignature(block) {
	return JSON.stringify(normalizeBlockSignature(block))
}

function positionRootBlocks(blocks, startX, startY, stepY = 80) {
	return (blocks || []).map((block, idx) => ({
		...block,
		x: Number.isFinite(block?.x) ? block.x : startX,
		y: Number.isFinite(block?.y) ? block.y : startY + idx * stepY,
	}))
}

function mergePatternAndAstRoots(patternBlocks, astBlocks) {
	const patternCustomSigs = new Set(
		(patternBlocks || [])
			.filter(isCustomGameRootBlock)
			.map(rootBlockSignature)
	)
	const astStructuredSigs = new Set(
		(astBlocks || [])
			.filter(isStructuredStandardRootBlock)
			.map(rootBlockSignature)
	)

	const filteredPatternBlocks = (patternBlocks || []).filter(block => {
		if (!isStructuredStandardRootBlock(block)) return true
		return !astStructuredSigs.has(rootBlockSignature(block))
	})

	const filteredAstBlocks = (astBlocks || []).filter(block => {
		if (!isCustomGameRootBlock(block)) return true
		return !patternCustomSigs.has(rootBlockSignature(block))
	})

	const positionedPatternBlocks = positionRootBlocks(filteredPatternBlocks, 40, 40)
	const positionedAstBlocks = positionRootBlocks(
		filteredAstBlocks,
		positionedPatternBlocks.length ? 460 : 40,
		40,
		90
	)

	return [...positionedPatternBlocks, ...positionedAstBlocks]
}

function pythonKeyToBlocklyKey(rawKey) {
	const raw = String(rawKey || '')
	if (raw === ' ') return ' '
	const key = raw.trim().toLowerCase()
	const map = {
		left: 'ArrowLeft',
		arrowleft: 'ArrowLeft',
		right: 'ArrowRight',
		arrowright: 'ArrowRight',
		up: 'ArrowUp',
		arrowup: 'ArrowUp',
		down: 'ArrowDown',
		arrowdown: 'ArrowDown',
		space: ' ',
		spacebar: ' ',
		' ': ' ',
		w: 'w',
		a: 'a',
		s: 's',
		d: 'd',
	}
	return map[key] || raw.trim()
}

const AST_NATIVE_SIMPLE_CALLS = new Set([
	'add_to_group',
	'change_game_speed',
	'change_health',
	'change_lives',
	'change_score',
	'change_timer',
	'change_velocity_x',
	'change_velocity_y',
	'clone_sprite',
	'create_sprite',
	'define_sprite_animation',
	'delete_group',
	'delete_sprite',
	'game_over',
	'hide_sprite',
	'jump_sprite',
	'keep_in_bounds',
	'load_scene',
	'move_by',
	'move_toward',
	'pause_game',
	'play_sprite_animation',
	'remove_from_group',
	'respawn_sprite_safe',
	'resume_game',
	'restart_scene',
	'set_acceleration',
	'set_collision_layer',
	'set_collision_mask',
	'set_collision_response',
	'set_friction',
	'set_game_over_text',
	'set_game_speed',
	'set_gravity',
	'set_health',
	'set_hud_inline_overlay',
	'set_hud_metric_label',
	'set_hud_metric_visible',
	'set_hud_order',
	'set_hud_text',
	'set_jump_power',
	'set_lives',
	'set_pixel',
	'set_position',
	'set_random_seed',
	'set_score',
	'set_sprite_color',
	'set_sprite_image',
	'set_sprite_opacity',
	'set_sprite_rotation',
	'set_sprite_scale',
	'set_sprite_sheet',
	'set_sprite_size',
	'set_sprite_z_index',
	'set_stat',
	'set_timer',
	'set_velocity',
	'set_win_text',
	'setPixel',
	'show_score_overlay',
	'show_sprite',
	'show_status_overlay',
	'spawn_sprite',
	'stop_sprite_animation',
	'win_game',
])

function isAstNativeSimpleTopLevelLine(trimmed, procedureNames = new Set()) {
	const line = String(trimmed || '').trim()
	if (!line || line.startsWith('#')) return false

	if (/^[A-Za-z_]\w*\s*=/.test(line)) return true
	if (/^[A-Za-z_]\w*\s*[\+\-\*\/%]=/.test(line)) return true
	if (/^[A-Za-z_]\w*\s*\[.*\]\s*=/.test(line)) return true
	if (/^[A-Za-z_]\w*\s*\[.*\]\s*[\+\-\*\/%]=/.test(line)) return true

	const attributeCall = line.match(/^([A-Za-z_]\w*)\.(append|pop)\s*\(/)
	if (attributeCall) return true

	const callMatch = line.match(/^([A-Za-z_]\w*)\s*\(/)
	if (!callMatch) return false

	const fnName = callMatch[1]
	if (AST_NATIVE_SIMPLE_CALLS.has(fnName)) return true
	if (procedureNames.has(fnName)) return true

	return false
}

function stripWrappingParens(text) {
	let out = String(text || '').trim()
	while (out.startsWith('(') && out.endsWith(')')) {
		out = out.slice(1, -1).trim()
	}
	return out
}

function splitCallArgs(argsText) {
	const parts = []
	let current = ''
	let depthParen = 0
	let depthBracket = 0
	let depthBrace = 0
	let quote = null
	let escaped = false

	for (let i = 0; i < argsText.length; i++) {
		const ch = argsText[i]

		if (quote) {
			current += ch
			if (escaped) {
				escaped = false
				continue
			}
			if (ch === '\\') {
				escaped = true
				continue
			}
			if (ch === quote) quote = null
			continue
		}

		if (ch === '"' || ch === "'") {
			quote = ch
			current += ch
			continue
		}

		if (ch === '(') depthParen++
		else if (ch === ')') depthParen = Math.max(0, depthParen - 1)
		else if (ch === '[') depthBracket++
		else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1)
		else if (ch === '{') depthBrace++
		else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1)

		if (
			ch === ',' &&
			depthParen === 0 &&
			depthBracket === 0 &&
			depthBrace === 0
		) {
			parts.push(current.trim())
			current = ''
			continue
		}

		current += ch
	}

	if (current.trim()) parts.push(current.trim())
	return parts
}

function parseStringLiteral(text) {
	const raw = String(text || '').trim()
	if (!raw) return null
	const m = raw.match(/^(["'])([\s\S]*)\1$/)
	if (!m) return null
	return m[2].replace(/\\(["'\\])/g, '$1')
}

function tokenizeMathExpression(expression) {
	const tokens = []
	const text = String(expression || '')
	let i = 0

	while (i < text.length) {
		const ch = text[i]
		if (/\s/.test(ch)) {
			i++
			continue
		}

		if ('()+-*/'.includes(ch)) {
			tokens.push({ type: ch })
			i++
			continue
		}

		if (ch === '[' || ch === ']' || ch === ',' || ch === '{' || ch === '}') return null

		if (/\d/.test(ch) || (ch === '.' && /\d/.test(text[i + 1] || ''))) {
			let j = i
			let hasDot = false
			while (j < text.length) {
				const c = text[j]
				if (c === '.') {
					if (hasDot) break
					hasDot = true
					j++
					continue
				}
				if (!/\d/.test(c)) break
				j++
			}
			tokens.push({ type: 'value', value: text.slice(i, j) })
			i = j
			continue
		}

		if (/[A-Za-z_]/.test(ch)) {
			if (text.startsWith('GAME_BOUNDS[', i)) {
				let j = i + 'GAME_BOUNDS['.length
				let quote = null
				let escaped = false
				for (; j < text.length; j++) {
					const c = text[j]
					if (quote) {
						if (escaped) {
							escaped = false
							continue
						}
						if (c === '\\') {
							escaped = true
							continue
						}
						if (c === quote) quote = null
						continue
					}
					if (c === '"' || c === "'") {
						quote = c
						continue
					}
					if (c === ']') break
				}
				if (j >= text.length || text[j] !== ']') return null
				tokens.push({ type: 'value', value: text.slice(i, j + 1) })
				i = j + 1
				continue
			}
			let j = i + 1
			while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j++
			tokens.push({ type: 'value', value: text.slice(i, j) })
			i = j
			continue
		}

		return null
	}

	return tokens
}

function parseValueExpression(expression, varMap) {
	const text = String(expression || '').trim()
	if (!text) return null

	if (isNum(text) || /^[A-Za-z_]\w*$/.test(text) || matchBoundsToken(text)) {
		return valFromToken(text, varMap)
	}

	const tokens = tokenizeMathExpression(text)
	if (!tokens || !tokens.length) return null

	let index = 0
	const peek = () => tokens[index]
	const take = () => tokens[index++]

	const parsePrimary = () => {
		const tok = peek()
		if (!tok) return null

		if (tok.type === '+') {
			take()
			return parsePrimary()
		}

		if (tok.type === '-') {
			take()
			const rhs = parsePrimary()
			if (!rhs) return null
			return mkArithmetic('MINUS', shadowNum(0), rhs)
		}

		if (tok.type === '(') {
			take()
			const inner = parseExpr()
			if (!inner) return null
			if (!peek() || peek().type !== ')') return null
			take()
			return inner
		}

		if (tok.type === 'value') {
			take()
			if (!isNum(tok.value) && !/^[A-Za-z_]\w*$/.test(tok.value) && !matchBoundsToken(tok.value)) {
				return null
			}
			return valFromToken(tok.value, varMap)
		}

		return null
	}

	const parseTerm = () => {
		let left = parsePrimary()
		if (!left) return null
		while (peek() && (peek().type === '*' || peek().type === '/')) {
			const op = take().type
			const right = parsePrimary()
			if (!right) return null
			left = mkArithmetic(op === '*' ? 'MULTIPLY' : 'DIVIDE', left, right)
		}
		return left
	}

	const parseExpr = () => {
		let left = parseTerm()
		if (!left) return null
		while (peek() && (peek().type === '+' || peek().type === '-')) {
			const op = take().type
			const right = parseTerm()
			if (!right) return null
			left = mkArithmetic(op === '+' ? 'ADD' : 'MINUS', left, right)
		}
		return left
	}

	const out = parseExpr()
	if (!out) return null
	if (index !== tokens.length) return null
	return out
}

function isZeroLiteral(text) {
	const token = stripWrappingParens(String(text || '').trim())
	return /^[-+]?0(?:\.0+)?$/.test(token)
}

function tokenizeKeyCondition(expression) {
	const tokens = []
	const text = String(expression || '')
	let i = 0

	while (i < text.length) {
		if (/\s/.test(text[i])) {
			i++
			continue
		}

		if (text[i] === '(') {
			tokens.push({ type: 'LPAREN' })
			i++
			continue
		}

		if (text[i] === ')') {
			tokens.push({ type: 'RPAREN' })
			i++
			continue
		}

		const andMatch = text.slice(i).match(/^and\b/i)
		if (andMatch) {
			tokens.push({ type: 'AND' })
			i += andMatch[0].length
			continue
		}

		const orMatch = text.slice(i).match(/^or\b/i)
		if (orMatch) {
			tokens.push({ type: 'OR' })
			i += orMatch[0].length
			continue
		}

		const keyMatch = text
			.slice(i)
			.match(/^key_is_pressed\(\s*["']([^"']+)["']\s*\)/)
		if (keyMatch) {
			tokens.push({ type: 'KEY', key: pythonKeyToBlocklyKey(keyMatch[1]) })
			i += keyMatch[0].length
			continue
		}

		return null
	}

	return tokens
}

function parseKeyPressedCondition(conditionText) {
	const tokens = tokenizeKeyCondition(conditionText)
	if (!tokens || !tokens.length) return null

	let index = 0
	const peek = () => tokens[index]
	const take = expected => {
		const tok = tokens[index]
		if (!tok) return null
		if (expected && tok.type !== expected) return null
		index++
		return tok
	}

	const parsePrimary = () => {
		if (take('LPAREN')) {
			const node = parseOr()
			if (!node || !take('RPAREN')) return null
			return node
		}
		const key = take('KEY')
		if (!key) return null
		return { type: 'key', key: key.key }
	}

	const parseAnd = () => {
		let left = parsePrimary()
		if (!left) return null
		while (peek() && peek().type === 'AND') {
			take('AND')
			const right = parsePrimary()
			if (!right) return null
			left = { type: 'op', op: 'AND', left, right }
		}
		return left
	}

	const parseOr = () => {
		let left = parseAnd()
		if (!left) return null
		while (peek() && peek().type === 'OR') {
			take('OR')
			const right = parseAnd()
			if (!right) return null
			left = { type: 'op', op: 'OR', left, right }
		}
		return left
	}

	const ast = parseOr()
	if (!ast) return null
	if (index !== tokens.length) return null
	return ast
}

function buildKeyPressedConditionBlock(ast) {
	if (!ast) return null
	if (ast.type === 'key') {
		return {
			type: 'game_is_key_pressed',
			id: rid(),
			fields: { KEY: pythonKeyToBlocklyKey(ast.key) }
		}
	}

	if (ast.type === 'op') {
		const left = buildKeyPressedConditionBlock(ast.left)
		const right = buildKeyPressedConditionBlock(ast.right)
		if (!left || !right) return null
		return {
			type: 'logic_operation',
			id: rid(),
			fields: { OP: ast.op === 'AND' ? 'AND' : 'OR' },
			inputs: {
				A: { block: left },
				B: { block: right }
			}
		}
	}

	return null
}

function buildNegatedConditionBlock(block) {
	if (!block) return null
	return {
		type: 'logic_negate',
		id: rid(),
		inputs: {
			BOOL: block.block ? block : { block },
		},
	}
}

function parseBooleanConditionBlock(conditionText, varMap) {
	const cond = String(conditionText || '').trim()
	if (!cond) return null

	{
		const keyAst = parseKeyPressedCondition(cond)
		if (keyAst) {
			return buildKeyPressedConditionBlock(keyAst)
		}
	}

	{
		const m = cond.match(/^sprite_exists\(\s*["']([^"']+)["']\s*\)$/)
		if (m) return { type: 'game_sprite_exists', id: rid(), fields: { NAME: m[1] } }
	}

	{
		const m = cond.match(/^sprite_touching_edge\(\s*["']([^"']+)["']\s*\)$/)
		if (m) return { type: 'game_touching_edge', id: rid(), fields: { NAME: m[1] } }
	}

	{
		const m = cond.match(/^sprites_touching\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) return { type: 'game_touching', id: rid(), fields: { A: m[1], B: m[2] } }
	}

	{
		const m = cond.match(/^sprites_colliding\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) return { type: 'game_colliding', id: rid(), fields: { A: m[1], B: m[2] } }
	}

	{
		const m = cond.match(/^sprite_touching_group\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) return { type: 'game_touching_group', id: rid(), fields: { NAME: m[1], GROUP: m[2] } }
	}

	{
		const m = cond.match(/^chance\(\s*(.+)\s*\)$/)
		if (m) {
			const percent = parseValueExpression(m[1], varMap)
			if (percent) return { type: 'game_chance', id: rid(), inputs: { PERCENT: percent } }
		}
	}

	if (/^is_game_over\(\s*\)$/.test(cond)) return { type: 'game_is_game_over', id: rid() }
	if (/^is_game_won\(\s*\)$/.test(cond)) return { type: 'game_is_game_won', id: rid() }
	if (/^is_game_paused\(\s*\)$/.test(cond)) return { type: 'game_is_paused', id: rid() }
	if (/^is_mouse_down\(\s*\)$/.test(cond)) return { type: 'game_mouse_down', id: rid() }
	if (/^is_touch_down\(\s*\)$/.test(cond)) return { type: 'game_touch_down', id: rid() }

	{
		const m = cond.match(/^gamepad_button_pressed\(\s*(.+)\s*\)$/)
		if (m) {
			const button = parseValueExpression(m[1], varMap)
			if (button) {
				return {
					type: 'game_gamepad_button',
					id: rid(),
					inputs: { BUTTON: button }
				}
			}
		}
	}

	return null
}

function parseConditionOperand(token, varMap) {
	const text = stripWrappingParens(String(token || '').trim())
	if (!text) return null

	if (isNum(text)) {
		const numericValue = parseValueExpression(text, varMap)
		if (numericValue) return numericValue
	}

	const bool = parseBooleanLiteral(text)
	if (bool !== null) return shadowBool(bool)

	const simpleValue = parseValueExpression(text, varMap)
	if (simpleValue) return simpleValue

	{
		const noArgFns = [
			{ fn: 'get_game_speed', blockType: 'game_get_speed' },
			{ fn: 'get_score', blockType: 'game_get_score' },
			{ fn: 'get_lives', blockType: 'game_get_lives' },
			{ fn: 'get_timer', blockType: 'game_get_timer' },
			{ fn: 'get_health', blockType: 'game_get_health' },
			{ fn: 'get_current_scene', blockType: 'game_get_scene' },
			{ fn: 'get_mouse_x', blockType: 'game_mouse_x' },
			{ fn: 'get_mouse_y', blockType: 'game_mouse_y' },
			{ fn: 'get_touch_x', blockType: 'game_touch_x' },
			{ fn: 'get_touch_y', blockType: 'game_touch_y' },
			{ fn: 'is_game_over', blockType: 'game_is_game_over' },
			{ fn: 'is_game_won', blockType: 'game_is_game_won' },
			{ fn: 'is_game_paused', blockType: 'game_is_paused' },
			{ fn: 'is_mouse_down', blockType: 'game_mouse_down' },
			{ fn: 'is_touch_down', blockType: 'game_touch_down' },
		]

		for (const spec of noArgFns) {
			if (new RegExp(`^${spec.fn}\\(\\s*\\)$`).test(text)) {
				return {
					block: {
						type: spec.blockType,
						id: rid(),
					},
				}
			}
		}
	}

	const conditionBlock = parseBooleanConditionBlock(text, varMap)
	if (conditionBlock) return { block: conditionBlock }

	return null
}

function parseConditionLine(conditionText, varMap) {
	const cond = String(conditionText || '').trim()
	if (!cond) return null

	{
		const m = cond.match(/^not\s+(.+)$/)
		if (m) {
			const inner = parseConditionLine(m[1], varMap) || parseBooleanConditionBlock(m[1], varMap)
			if (inner) return buildNegatedConditionBlock(inner)
		}
	}

	{
		const m = cond.match(/^(.+?)\s*(<=|>=|==|!=|<|>)\s*(.+)$/)
		if (m) {
			const op = m[2]
			const lhsBoolBlock = parseBooleanConditionBlock(m[1], varMap)
			const rhsBoolBlock = parseBooleanConditionBlock(m[3], varMap)
			const lhsBool = parseBooleanLiteral(m[1])
			const rhsBool = parseBooleanLiteral(m[3])

			if ((op === '==' || op === '!=') && lhsBoolBlock && rhsBool !== null) {
				const shouldNegate = (op === '==' && rhsBool === false) || (op === '!=' && rhsBool === true)
				return shouldNegate ? buildNegatedConditionBlock(lhsBoolBlock) : lhsBoolBlock
			}

			if ((op === '==' || op === '!=') && rhsBoolBlock && lhsBool !== null) {
				const shouldNegate = (op === '==' && lhsBool === false) || (op === '!=' && lhsBool === true)
				return shouldNegate ? buildNegatedConditionBlock(rhsBoolBlock) : rhsBoolBlock
			}

			const lhs = parseConditionOperand(m[1], varMap)
			const rhs = parseConditionOperand(m[3], varMap)
			if (!lhs || !rhs) return null
			return {
				type: 'logic_compare',
				id: rid(),
				fields: { OP: COMPARE_OP_MAP[m[2]] || 'EQ' },
				inputs: {
					A: lhs,
					B: rhs
				}
			}
		}
	}

	{
		const conditionBlock = parseBooleanConditionBlock(cond, varMap)
		if (conditionBlock) return conditionBlock
	}

	return null
}

function nextMeaningfulLineIndex(lines, startIndex) {
	let i = startIndex
	while (i < lines.length) {
		const trimmed = String(lines[i] || '').trim()
		if (!trimmed || trimmed.startsWith('#')) {
			i++
			continue
		}
		return i
	}
	return i
}

function parseIfChain(lines, startIndex, indentLevel, varMap, procedureNames = new Set()) {
	const firstTrimmed = String(lines[startIndex] || '').trim()
	const firstMatch = firstTrimmed.match(/^if\s+(.+)\s*:\s*$/)
	if (!firstMatch) return null

	const firstCond = parseConditionLine(firstMatch[1], varMap)
	if (!firstCond) return null

	const conditions = [firstCond]
	const bodies = []
	let elseBody = null
	let clauseLineIndex = startIndex

	while (true) {
		const bodyStart = clauseLineIndex + 1
		const childIndent = inferChildIndent(lines, bodyStart, indentLevel)
		const suite = parseSuite(lines, bodyStart, childIndent, varMap, procedureNames)
		bodies.push(suite.blocks)
		const cursor = suite.nextIndex

		const nextIdx = nextMeaningfulLineIndex(lines, cursor)
		if (nextIdx >= lines.length) {
			clauseLineIndex = cursor
			break
		}

		const nextRaw = lines[nextIdx]
		const nextIndent = nextRaw.match(/^(\s*)/)[1].length
		if (nextIndent !== indentLevel) {
			clauseLineIndex = cursor
			break
		}

		const nextTrimmed = nextRaw.trim()
		const elifMatch = nextTrimmed.match(/^elif\s+(.+)\s*:\s*$/)
		if (elifMatch) {
			const cond = parseConditionLine(elifMatch[1], varMap)
			if (!cond) {
				clauseLineIndex = cursor
				break
			}
			conditions.push(cond)
			clauseLineIndex = nextIdx
			continue
		}

		if (/^else\s*:\s*$/.test(nextTrimmed)) {
			const elseIndent = inferChildIndent(lines, nextIdx + 1, indentLevel)
			const elseSuite = parseSuite(lines, nextIdx + 1, elseIndent, varMap, procedureNames)
			elseBody = elseSuite.blocks
			clauseLineIndex = elseSuite.nextIndex
			break
		}

		clauseLineIndex = cursor
		break
	}

	const inputs = {
		IF0: { block: conditions[0] },
		DO0: { block: linkSequence(bodies[0] || []) }
	}

	for (let i = 1; i < conditions.length; i++) {
		inputs[`IF${i}`] = { block: conditions[i] }
		inputs[`DO${i}`] = { block: linkSequence(bodies[i] || []) }
	}

	if (elseBody) {
		inputs.ELSE = { block: linkSequence(elseBody) }
	}

	const ifBlock = {
		type: 'controls_if',
		id: rid(),
		inputs
	}

	if (conditions.length > 1 || elseBody) {
		ifBlock.extraState = {
			elseIfCount: Math.max(0, conditions.length - 1),
			hasElse: Boolean(elseBody)
		}
	}

	return { block: ifBlock, nextIndex: clauseLineIndex }
}

/* ----------------- single-line mapping (no indentation) ----------------- */

function mapSimpleLine(trimmed, varMap, procedureNames = new Set()) {
	// create_sprite("name", X, Y)
	{
		const m = trimmed.match(/^create_sprite\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 3) {
				const name = parseStringLiteral(args[0])
				const x = parseValueExpression(args[1], varMap)
				const y = parseValueExpression(args[2], varMap)
				if (name !== null && x && y) {
					return {
						type: 'game_create_sprite',
						id: rid(),
						fields: { NAME: name },
						inputs: { X: x, Y: y }
					}
				}
			}
		}
	}


	// spawn_sprite("base", X, Y, "group")
	{
		const m = trimmed.match(/^spawn_sprite\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 4) {
				const base = parseStringLiteral(args[0])
				const x = parseValueExpression(args[1], varMap)
				const y = parseValueExpression(args[2], varMap)
				const group = parseStringLiteral(args[3])
				if (base !== null && x && y && group !== null) {
					return {
						type: 'game_spawn_sprite',
						id: rid(),
						fields: { BASE: base, GROUP: group },
						inputs: { X: x, Y: y }
					}
				}
			}
		}
	}

	// clone_sprite("source", "target", X, Y, "group")
	{
		const m = trimmed.match(/^clone_sprite\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 5) {
				const source = parseStringLiteral(args[0])
				const target = parseStringLiteral(args[1])
				const x = parseValueExpression(args[2], varMap)
				const y = parseValueExpression(args[3], varMap)
				const group = parseStringLiteral(args[4])
				if (source !== null && target !== null && x && y && group !== null) {
					return {
						type: 'game_clone_sprite',
						id: rid(),
						fields: { SOURCE: source, TARGET: target, GROUP: group },
						inputs: { X: x, Y: y }
					}
				}
			}
		}
	}

	// set_position("name", X, Y)
	{
		const m = trimmed.match(/^set_position\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 3) {
				const name = parseStringLiteral(args[0])
				const x = parseValueExpression(args[1], varMap)
				const y = parseValueExpression(args[2], varMap)
				if (name !== null && x && y) {
					return {
						type: 'game_set_position',
						id: rid(),
						fields: { NAME: name },
						inputs: { X: x, Y: y }
					}
				}
			}
		}
	}

	// move_by("name", DX, DY)
	{
		const m = trimmed.match(/^move_by\(\s*([\s\S]*)\s*\)\s*$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 3) {
				const name = parseStringLiteral(args[0])
				const dx = parseValueExpression(args[1], varMap)
				const dy = parseValueExpression(args[2], varMap)
				if (name !== null && dx && dy) {
					if (isZeroLiteral(args[2])) {
						return {
							type: 'game_change_x',
							id: rid(),
							fields: { NAME: name },
							inputs: { DX: dx }
						}
					}
					if (isZeroLiteral(args[1])) {
						return {
							type: 'game_change_y',
							id: rid(),
							fields: { NAME: name },
							inputs: { DY: dy }
						}
					}
					return {
						type: 'game_move_by',
						id: rid(),
						fields: { NAME: name },
						inputs: { DX: dx, DY: dy }
					}
				}
			}
		}
	}

	// set_pixel(X, Y, "#hex") / setPixel(X, Y, "#hex")
	{
		const m = trimmed.match(/^(?:set_pixel|setPixel)\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 3) {
				const x = parseValueExpression(args[0], varMap)
				const y = parseValueExpression(args[1], varMap)
				const color = parseStringLiteral(args[2])
				if (x && y && color !== null) {
					return {
						type: 'game_set_pixel',
						id: rid(),
						fields: { COLOR: color },
						inputs: { X: x, Y: y }
					}
				}
			}
		}
	}

	// set_sprite_color("name", "#hex")
	{
		const m = trimmed.match(/^set_sprite_color\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_set_color',
				id: rid(),
				fields: { NAME: m[1], COLOR: m[2] }
			}
		}
	}

	// set_sprite_size("name", WIDTH, HEIGHT)
	{
		const m = trimmed.match(/^set_sprite_size\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 3) {
				const name = parseStringLiteral(args[0])
				const width = parseValueExpression(args[1], varMap)
				const height = parseValueExpression(args[2], varMap)
				if (name !== null && width && height) {
					return {
						type: 'game_set_size',
						id: rid(),
						fields: { NAME: name },
						inputs: { WIDTH: width, HEIGHT: height }
					}
				}
			}
		}
	}

	// delete_sprite("name")
	{
		const m = trimmed.match(/^delete_sprite\(\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_delete_sprite',
				id: rid(),
				fields: { NAME: m[1] }
			}
		}
	}


	// add_to_group("name", "group")
	{
		const m = trimmed.match(/^add_to_group\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_add_to_group',
				id: rid(),
				fields: { NAME: m[1], GROUP: m[2] }
			}
		}
	}

	// remove_from_group("name", "group")
	{
		const m = trimmed.match(/^remove_from_group\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_remove_from_group',
				id: rid(),
				fields: { NAME: m[1], GROUP: m[2] }
			}
		}
	}

	// delete_group("group")
	{
		const m = trimmed.match(/^delete_group\(\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_delete_group',
				id: rid(),
				fields: { GROUP: m[1] }
			}
		}
	}

	// set_collision_layer("name", "layer")
	{
		const m = trimmed.match(/^set_collision_layer\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_set_collision_layer',
				id: rid(),
				fields: { NAME: m[1], LAYER: m[2] }
			}
		}
	}

	// set_collision_mask("name", "mask")
	{
		const m = trimmed.match(/^set_collision_mask\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_set_collision_mask',
				id: rid(),
				fields: { NAME: m[1], MASK: m[2] }
			}
		}
	}

	// set_collision_response("name", "bounce|slide|none")
	{
		const m = trimmed.match(/^set_collision_response\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_set_collision_response',
				id: rid(),
				fields: { NAME: m[1], RESPONSE: String(m[2] || 'none').toLowerCase() }
			}
		}
	}

	// show_sprite("name") / hide_sprite("name")
	{
		const show = trimmed.match(/^show_sprite\(\s*["']([^"']+)["']\s*\)$/)
		if (show) return { type: 'game_show_sprite', id: rid(), fields: { NAME: show[1] } }

		const hide = trimmed.match(/^hide_sprite\(\s*["']([^"']+)["']\s*\)$/)
		if (hide) return { type: 'game_hide_sprite', id: rid(), fields: { NAME: hide[1] } }
	}

	// set_sprite_opacity("name", OPACITY)
	{
		const m = trimmed.match(/^set_sprite_opacity\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const name = parseStringLiteral(args[0])
				const opacity = parseValueExpression(args[1], varMap)
				if (name !== null && opacity) {
					return {
						type: 'game_set_opacity',
						id: rid(),
						fields: { NAME: name },
						inputs: { OPACITY: opacity }
					}
				}
			}
		}
	}

	// set_sprite_rotation("name", DEGREES)
	{
		const m = trimmed.match(/^set_sprite_rotation\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const name = parseStringLiteral(args[0])
				const degrees = parseValueExpression(args[1], varMap)
				if (name !== null && degrees) {
					return {
						type: 'game_set_rotation',
						id: rid(),
						fields: { NAME: name },
						inputs: { DEGREES: degrees },
					}
				}
			}
		}
	}

	// set_sprite_scale("name", SCALE_X, SCALE_Y)
	{
		const m = trimmed.match(/^set_sprite_scale\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 3) {
				const name = parseStringLiteral(args[0])
				const sx = parseValueExpression(args[1], varMap)
				const sy = parseValueExpression(args[2], varMap)
				if (name !== null && sx && sy) {
					return {
						type: 'game_set_scale',
						id: rid(),
						fields: { NAME: name },
						inputs: { SCALE_X: sx, SCALE_Y: sy },
					}
				}
			}
		}
	}

	// set_sprite_z_index("name", Z)
	{
		const m = trimmed.match(/^set_sprite_z_index\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const name = parseStringLiteral(args[0])
				const z = parseValueExpression(args[1], varMap)
				if (name !== null && z) {
					return {
						type: 'game_set_z_index',
						id: rid(),
						fields: { NAME: name },
						inputs: { Z: z },
					}
				}
			}
		}
	}

	// set_sprite_image("name", "src")
	{
		const m = trimmed.match(/^set_sprite_image\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_set_image',
				id: rid(),
				fields: { NAME: m[1], SRC: m[2] },
			}
		}
	}

	// set_sprite_sheet("name", "src", COLS, ROWS)
	{
		const m = trimmed.match(/^set_sprite_sheet\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 4) {
				const name = parseStringLiteral(args[0])
				const src = parseStringLiteral(args[1])
				const cols = parseValueExpression(args[2], varMap)
				const rows = parseValueExpression(args[3], varMap)
				if (name !== null && src !== null && cols && rows) {
					return {
						type: 'game_set_spritesheet',
						id: rid(),
						fields: { NAME: name, SRC: src },
						inputs: { COLS: cols, ROWS: rows },
					}
				}
			}
		}
	}

	// define_sprite_animation("name", "state", START, END, FPS, LOOP)
	{
		const m = trimmed.match(/^define_sprite_animation\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 6) {
				const name = parseStringLiteral(args[0])
				const state = parseStringLiteral(args[1])
				const start = parseValueExpression(args[2], varMap)
				const end = parseValueExpression(args[3], varMap)
				const fps = parseValueExpression(args[4], varMap)
				const loop = parseBooleanLiteral(args[5])
				if (name !== null && state !== null && start && end && fps && loop !== null) {
					return {
						type: 'game_define_animation',
						id: rid(),
						fields: {
							NAME: name,
							STATE: state,
							LOOP: loop ? 'TRUE' : 'FALSE',
						},
						inputs: { START: start, END: end, FPS: fps },
					}
				}
			}
		}
	}

	// play_sprite_animation("name", "state")
	{
		const m = trimmed.match(/^play_sprite_animation\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_play_animation',
				id: rid(),
				fields: { NAME: m[1], STATE: m[2] },
			}
		}
	}

	// stop_sprite_animation("name")
	{
		const m = trimmed.match(/^stop_sprite_animation\(\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_stop_animation',
				id: rid(),
				fields: { NAME: m[1] },
			}
		}
	}

	// set_velocity("name", VX, VY)
	{
		const m = trimmed.match(/^set_velocity\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 3) {
				const name = parseStringLiteral(args[0])
				const vx = parseValueExpression(args[1], varMap)
				const vy = parseValueExpression(args[2], varMap)
				if (name !== null && vx && vy) {
					return {
						type: 'game_set_velocity',
						id: rid(),
						fields: { NAME: name },
						inputs: { VX: vx, VY: vy },
					}
				}
			}
		}
	}

	// change_velocity_x("name", DVX)
	{
		const m = trimmed.match(/^change_velocity_x\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const name = parseStringLiteral(args[0])
				const dvx = parseValueExpression(args[1], varMap)
				if (name !== null && dvx) {
					return {
						type: 'game_change_velocity_x',
						id: rid(),
						fields: { NAME: name },
						inputs: { DVX: dvx },
					}
				}
			}
		}
	}

	// change_velocity_y("name", DVY)
	{
		const m = trimmed.match(/^change_velocity_y\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const name = parseStringLiteral(args[0])
				const dvy = parseValueExpression(args[1], varMap)
				if (name !== null && dvy) {
					return {
						type: 'game_change_velocity_y',
						id: rid(),
						fields: { NAME: name },
						inputs: { DVY: dvy },
					}
				}
			}
		}
	}

	// set_acceleration("name", AX, AY)
	{
		const m = trimmed.match(/^set_acceleration\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 3) {
				const name = parseStringLiteral(args[0])
				const ax = parseValueExpression(args[1], varMap)
				const ay = parseValueExpression(args[2], varMap)
				if (name !== null && ax && ay) {
					return {
						type: 'game_set_acceleration',
						id: rid(),
						fields: { NAME: name },
						inputs: { AX: ax, AY: ay },
					}
				}
			}
		}
	}

	// set_gravity("name", G)
	{
		const m = trimmed.match(/^set_gravity\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const name = parseStringLiteral(args[0])
				const g = parseValueExpression(args[1], varMap)
				if (name !== null && g) {
					return {
						type: 'game_set_gravity',
						id: rid(),
						fields: { NAME: name },
						inputs: { G: g },
					}
				}
			}
		}
	}

	// set_friction("name", F)
	{
		const m = trimmed.match(/^set_friction\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const name = parseStringLiteral(args[0])
				const f = parseValueExpression(args[1], varMap)
				if (name !== null && f) {
					return {
						type: 'game_set_friction',
						id: rid(),
						fields: { NAME: name },
						inputs: { F: f },
					}
				}
			}
		}
	}

	// set_jump_power("name", POWER)
	{
		const m = trimmed.match(/^set_jump_power\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const name = parseStringLiteral(args[0])
				const power = parseValueExpression(args[1], varMap)
				if (name !== null && power) {
					return {
						type: 'game_set_jump_power',
						id: rid(),
						fields: { NAME: name },
						inputs: { POWER: power },
					}
				}
			}
		}
	}

	// jump_sprite("name")
	{
		const m = trimmed.match(/^jump_sprite\(\s*["']([^"']+)["']\s*\)$/)
		if (m) {
			return {
				type: 'game_jump',
				id: rid(),
				fields: { NAME: m[1] },
			}
		}
	}

	// set_random_seed(SEED)
	{
		const re = new RegExp(`^set_random_seed\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const m = trimmed.match(re)
		if (m) {
			return {
				type: 'game_set_random_seed',
				id: rid(),
				inputs: { SEED: valFromToken(m[1], varMap) },
			}
		}
	}

	// respawn_sprite_safe("name"[, "away"[, DIST]])
	{
		const m = trimmed.match(/^respawn_sprite_safe\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length >= 1 && args.length <= 3) {
				const name = parseStringLiteral(args[0])
				const away = args.length >= 2 ? parseStringLiteral(args[1]) : ''
				const dist = args.length >= 3 ? parseValueExpression(args[2], varMap) : shadowNum(0)
				if (name !== null && away !== null && dist) {
					return {
						type: 'game_respawn_safe',
						id: rid(),
						fields: { NAME: name, AWAY: away || '' },
						inputs: { DIST: dist },
					}
				}
			}
		}
	}

	// keep_in_bounds("name", "mode")
	{
		const m = trimmed.match(/^keep_in_bounds\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)\s*$/)
		if (m) {
			const mode = String(m[2] || 'clamp').trim().toLowerCase()
			if (['clamp', 'wrap', 'bounce'].includes(mode)) return { type: 'game_keep_in_bounds', id: rid(), fields: { NAME: m[1], MODE: mode } }
		}
	}

	// move_toward("name", "target", STEP, STOP)
	{
		const m = trimmed.match(/^move_toward\(\s*([\s\S]*)\s*\)\s*$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 4) {
				const name = parseStringLiteral(args[0])
				const target = parseStringLiteral(args[1])
				const step = parseValueExpression(args[2], varMap)
				const stop = parseValueExpression(args[3], varMap)
				if (name !== null && target !== null && step && stop) {
					return { type: 'game_move_toward', id: rid(), fields: { NAME: name, TARGET: target }, inputs: { STEP: step, STOP: stop } }
				}
			}
		}
	}

	// set_stat("key", VALUE)
	{
		const m = trimmed.match(/^set_stat\(\s*([\s\S]*)\s*\)\s*$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const key = parseStringLiteral(args[0])
				const value = parseFlexibleValueInput(args[1], varMap)
				if (key !== null && value) return { type: 'game_set_stat', id: rid(), fields: { KEY: key }, inputs: { VALUE: value } }
			}
		}
	}
	// set_game_speed(VALUE)
	{
		const re = new RegExp(`^set_game_speed\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const m = trimmed.match(re)
		if (m) {
			return {
				type: 'game_set_speed',
				id: rid(),
				inputs: { RATE: valFromToken(m[1], varMap) },
			}
		}
	}

	// change_game_speed(VALUE)
	{
		const re = new RegExp(`^change_game_speed\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const m = trimmed.match(re)
		if (m) {
			return {
				type: 'game_change_speed',
				id: rid(),
				inputs: { DELTA: valFromToken(m[1], varMap) },
			}
		}
	}

	// set_score(VALUE)
	{
		const re = new RegExp(`^set_score\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const m = trimmed.match(re)
		if (m) {
			return {
				type: 'game_set_score',
				id: rid(),
				inputs: { VALUE: valFromToken(m[1], varMap) },
			}
		}
	}

	// change_score(VALUE)
	{
		const re = new RegExp(`^change_score\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const m = trimmed.match(re)
		if (m) {
			return {
				type: 'game_change_score',
				id: rid(),
				inputs: { DELTA: valFromToken(m[1], varMap) },
			}
		}
	}

	// set_hud_text(VALUE)
	{
		const m = trimmed.match(/^set_hud_text\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 1) {
				const text = parseFlexibleValueInput(args[0], varMap)
				if (text) {
					return {
						type: 'game_set_hud_text',
						id: rid(),
						inputs: { TEXT: text },
					}
				}
			}
		}
	}

	// set_lives(VALUE) / change_lives(VALUE)
	{
		const setRe = new RegExp(`^set_lives\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const setMatch = trimmed.match(setRe)
		if (setMatch) {
			return {
				type: 'game_set_lives',
				id: rid(),
				inputs: { VALUE: valFromToken(setMatch[1], varMap) },
			}
		}

		const changeRe = new RegExp(`^change_lives\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const changeMatch = trimmed.match(changeRe)
		if (changeMatch) {
			return {
				type: 'game_change_lives',
				id: rid(),
				inputs: { DELTA: valFromToken(changeMatch[1], varMap) },
			}
		}
	}

	// set_timer(VALUE) / change_timer(VALUE)
	{
		const setRe = new RegExp(`^set_timer\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const setMatch = trimmed.match(setRe)
		if (setMatch) {
			return {
				type: 'game_set_timer',
				id: rid(),
				inputs: { VALUE: valFromToken(setMatch[1], varMap) },
			}
		}

		const changeRe = new RegExp(`^change_timer\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const changeMatch = trimmed.match(changeRe)
		if (changeMatch) {
			return {
				type: 'game_change_timer',
				id: rid(),
				inputs: { DELTA: valFromToken(changeMatch[1], varMap) },
			}
		}
	}

	// set_health(VALUE) / change_health(VALUE)
	{
		const setRe = new RegExp(`^set_health\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const setMatch = trimmed.match(setRe)
		if (setMatch) {
			return {
				type: 'game_set_health',
				id: rid(),
				inputs: { VALUE: valFromToken(setMatch[1], varMap) },
			}
		}

		const changeRe = new RegExp(`^change_health\\(\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`)
		const changeMatch = trimmed.match(changeRe)
		if (changeMatch) {
			return {
				type: 'game_change_health',
				id: rid(),
				inputs: { DELTA: valFromToken(changeMatch[1], varMap) },
			}
		}
	}

	// show_score_overlay(BOOL) / show_status_overlay(BOOL)
	{
		const scoreMatch = trimmed.match(/^show_score_overlay\(\s*([^)]+)\s*\)\s*$/)
		if (scoreMatch) {
			const visible = parseBooleanLiteral(scoreMatch[1])
			if (visible !== null) {
				return {
					type: 'game_set_score_overlay_visible',
					id: rid(),
					fields: { VISIBLE: visible ? 'TRUE' : 'FALSE' },
				}
			}
		}

		const statusMatch = trimmed.match(/^show_status_overlay\(\s*([^)]+)\s*\)\s*$/)
		if (statusMatch) {
			const visible = parseBooleanLiteral(statusMatch[1])
			if (visible !== null) {
				return {
					type: 'game_set_status_overlay_visible',
					id: rid(),
					fields: { VISIBLE: visible ? 'TRUE' : 'FALSE' },
				}
			}
		}
	}

	// set_hud_metric_visible("metric", BOOL)
	{
		const m = trimmed.match(/^set_hud_metric_visible\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const metric = parseStringLiteral(args[0])
				const visible = parseBooleanLiteral(args[1])
				if (metric !== null && visible !== null) {
					const key = String(metric || '').trim().toLowerCase()
					if (['score', 'lives', 'timer', 'health'].includes(key)) {
						return {
							type: 'game_set_hud_metric_visible',
							id: rid(),
							fields: { METRIC: key, VISIBLE: visible ? 'TRUE' : 'FALSE' },
						}
					}
				}
			}
		}
	}

	// set_hud_metric_label("metric", "Label")
	{
		const m = trimmed.match(/^set_hud_metric_label\(\s*([\s\S]*)\s*\)$/)
		if (m) {
			const args = splitCallArgs(m[1])
			if (args.length === 2) {
				const metric = parseStringLiteral(args[0])
				const label = parseStringLiteral(args[1])
				if (metric !== null && label !== null) {
					const key = String(metric || '').trim().toLowerCase()
					if (['score', 'lives', 'timer', 'health'].includes(key)) {
						return {
							type: 'game_set_hud_metric_label',
							id: rid(),
							fields: { METRIC: key, LABEL: label },
						}
					}
				}
			}
		}
	}

	// set_hud_order("score,lives,timer,health")
	{
		const m = trimmed.match(/^set_hud_order\(\s*["']([\s\S]*)["']\s*\)\s*$/)
		if (m) {
			return {
				type: 'game_set_hud_order',
				id: rid(),
				fields: { ORDER: m[1] },
			}
		}
	}

	// set_hud_inline_overlay(BOOL)
	{
		const m = trimmed.match(/^set_hud_inline_overlay\(\s*([^)]+)\s*\)\s*$/)
		if (m) {
			const visible = parseBooleanLiteral(m[1])
			if (visible !== null) {
				return {
					type: 'game_set_hud_inline_overlay',
					id: rid(),
					fields: { VISIBLE: visible ? 'TRUE' : 'FALSE' },
				}
			}
		}
	}

	// set_game_over_text("...") / set_win_text("...")
	{
		const over = trimmed.match(/^set_game_over_text\(\s*["']([\s\S]*)["']\s*\)\s*$/)
		if (over) {
			return {
				type: 'game_set_game_over_text',
				id: rid(),
				fields: { TEXT: over[1] },
			}
		}

		const win = trimmed.match(/^set_win_text\(\s*["']([\s\S]*)["']\s*\)\s*$/)
		if (win) {
			return {
				type: 'game_set_win_text',
				id: rid(),
				fields: { TEXT: win[1] },
			}
		}
	}

	// load_scene("name"), restart_scene(), pause_game(), resume_game()
	{
		const load = trimmed.match(/^load_scene\(\s*["']([^"']+)["']\s*\)\s*$/)
		if (load) {
			return {
				type: 'game_load_scene',
				id: rid(),
				fields: { NAME: load[1] },
			}
		}
	}
	if (/^restart_scene\(\s*\)\s*$/.test(trimmed)) return { type: 'game_restart_scene', id: rid() }
	if (/^pause_game\(\s*\)\s*$/.test(trimmed)) return { type: 'game_pause', id: rid() }
	if (/^resume_game\(\s*\)\s*$/.test(trimmed)) return { type: 'game_resume', id: rid() }

	// game_over() / win_game()
	if (/^game_over\(\s*\)\s*$/.test(trimmed)) return { type: 'game_game_over', id: rid() }
	if (/^win_game\(\s*\)\s*$/.test(trimmed)) return { type: 'game_win_game', id: rid() }

	// parameterless user-defined helper calls: draw_piece()
	{
		const m = trimmed.match(/^([A-Za-z_]\w*)\(\s*\)\s*$/)
		if (m && procedureNames.has(m[1])) {
			return mkProcedureCall(m[1])
		}
	}

	const assignment = parseAssignmentLine(trimmed, varMap)
	if (assignment) return assignment

	return null
}

function parseBooleanLiteral(text) {
	const token = stripWrappingParens(String(text || '').trim())
	if (!token) return null
	if (/^(true|True|TRUE|1)$/.test(token)) return true
	if (/^(false|False|FALSE|0)$/.test(token)) return false
	return null
}

const shadowBool = value => ({
	shadow: {
		type: 'logic_boolean',
		id: rid(),
		fields: { BOOL: value ? 'TRUE' : 'FALSE' },
	},
})

const shadowText = value => ({
	shadow: {
		type: 'text',
		id: rid(),
		fields: { TEXT: String(value || '') },
	},
})

function parseFlexibleValueInput(token, varMap) {
	const numericOrVar = parseValueExpression(token, varMap)
	if (numericOrVar) return numericOrVar

	const str = parseStringLiteral(token)
	if (str !== null) return shadowText(str)

	const bool = parseBooleanLiteral(token)
	if (bool !== null) return shadowBool(bool)

	return null
}

function parseAssignmentLine(trimmed, varMap) {
	// x = get_sprite_x("name"), get_sprite_y("name"), get_velocity_x("name"), get_velocity_y("name")
	{
		const bySpriteFn = [
			{ fn: 'get_sprite_x', blockType: 'game_get_x' },
			{ fn: 'get_sprite_y', blockType: 'game_get_y' },
			{ fn: 'get_velocity_x', blockType: 'game_get_velocity_x' },
			{ fn: 'get_velocity_y', blockType: 'game_get_velocity_y' },
		]

		for (const spec of bySpriteFn) {
			const m = trimmed.match(
				new RegExp(`^([A-Za-z_]\\w*)\\s*=\\s*${spec.fn}\\(\\s*["']([^"']+)["']\\s*\\)\\s*$`)
			)
			if (m) {
				const v = getOrCreateVar(m[1], varMap)
				return mkSetVar(v, {
					block: {
						type: spec.blockType,
						id: rid(),
						fields: { NAME: m[2] },
					},
				})
			}
		}
	}

	// x = sprite_exists("name"), sprite_touching_edge("name")
	{
		const boolSpriteFns = [
			{ fn: 'sprite_exists', blockType: 'game_sprite_exists' },
			{ fn: 'sprite_touching_edge', blockType: 'game_touching_edge' },
		]

		for (const spec of boolSpriteFns) {
			const m = trimmed.match(
				new RegExp(`^([A-Za-z_]\\w*)\\s*=\\s*${spec.fn}\\(\\s*["']([^"']+)["']\\s*\\)\\s*$`)
			)
			if (m) {
				const v = getOrCreateVar(m[1], varMap)
				return mkSetVar(v, {
					block: {
						type: spec.blockType,
						id: rid(),
						fields: { NAME: m[2] },
					},
				})
			}
		}
	}

	// x = sprites_touching("a","b"), sprites_colliding("a","b")
	{
		const boolPairFns = [
			{ fn: 'sprites_touching', blockType: 'game_touching' },
			{ fn: 'sprites_colliding', blockType: 'game_colliding' },
		]
		for (const spec of boolPairFns) {
			const m = trimmed.match(
				new RegExp(
					`^([A-Za-z_]\\w*)\\s*=\\s*${spec.fn}\\(\\s*["']([^"']+)["']\\s*,\\s*["']([^"']+)["']\\s*\\)\\s*$`
				)
			)
			if (m) {
				const v = getOrCreateVar(m[1], varMap)
				return mkSetVar(v, {
					block: {
						type: spec.blockType,
						id: rid(),
						fields: { A: m[2], B: m[3] },
					},
				})
			}
		}
	}

	// x = sprite_touching_group("name", "group")
	{
		const m = trimmed.match(
			/^([A-Za-z_]\w*)\s*=\s*sprite_touching_group\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)\s*$/
		)
		if (m) {
			const v = getOrCreateVar(m[1], varMap)
			return mkSetVar(v, {
				block: {
					type: 'game_touching_group',
					id: rid(),
					fields: { NAME: m[2], GROUP: m[3] },
				},
			})
		}
	}
	// x = distance_between("a", "b")
	{
		const m = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*distance_between\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)\s*$/)
		if (m) {
			const v = getOrCreateVar(m[1], varMap)
			return mkSetVar(v, { block: { type: 'game_distance_to', id: rid(), fields: { A: m[2], B: m[3] } } })
		}
	}

	// x = random_group_member("group")
	{
		const m = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*random_group_member\(\s*["']([^"']+)["']\s*\)\s*$/)
		if (m) {
			const v = getOrCreateVar(m[1], varMap)
			return mkSetVar(v, { block: { type: 'game_random_choice_group', id: rid(), fields: { GROUP: m[2] } } })
		}
	}

	// x = chance(PERCENT)
	{
		const m = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*chance\(\s*(.+)\s*\)\s*$/)
		if (m) {
			const percent = parseValueExpression(m[2], varMap)
			if (percent) {
				const v = getOrCreateVar(m[1], varMap)
				return mkSetVar(v, { block: { type: 'game_chance', id: rid(), inputs: { PERCENT: percent } } })
			}
		}
	}

	// x = get_stat("key")
	{
		const m = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*get_stat\(\s*["']([^"']+)["']\s*\)\s*$/)
		if (m) {
			const v = getOrCreateVar(m[1], varMap)
			return mkSetVar(v, { block: { type: 'game_get_stat', id: rid(), fields: { KEY: m[2] } } })
		}
	}

	// x = get_*() and x = is_*()
	{
		const noArgFns = [
			{ fn: 'get_game_speed', blockType: 'game_get_speed' },
			{ fn: 'get_score', blockType: 'game_get_score' },
			{ fn: 'get_lives', blockType: 'game_get_lives' },
			{ fn: 'get_timer', blockType: 'game_get_timer' },
			{ fn: 'get_health', blockType: 'game_get_health' },
			{ fn: 'get_current_scene', blockType: 'game_get_scene' },
			{ fn: 'get_mouse_x', blockType: 'game_mouse_x' },
			{ fn: 'get_mouse_y', blockType: 'game_mouse_y' },
			{ fn: 'get_touch_x', blockType: 'game_touch_x' },
			{ fn: 'get_touch_y', blockType: 'game_touch_y' },
			{ fn: 'is_game_over', blockType: 'game_is_game_over' },
			{ fn: 'is_game_won', blockType: 'game_is_game_won' },
			{ fn: 'is_game_paused', blockType: 'game_is_paused' },
			{ fn: 'is_mouse_down', blockType: 'game_mouse_down' },
			{ fn: 'is_touch_down', blockType: 'game_touch_down' },
		]
		for (const spec of noArgFns) {
			const m = trimmed.match(new RegExp(`^([A-Za-z_]\\w*)\\s*=\\s*${spec.fn}\\(\\s*\\)\\s*$`))
			if (m) {
				const v = getOrCreateVar(m[1], varMap)
				return mkSetVar(v, { block: { type: spec.blockType, id: rid() } })
			}
		}
	}

	// x = get_gamepad_axis(AXIS)
	{
		const m = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*get_gamepad_axis\(\s*(.+)\s*\)\s*$/)
		if (m) {
			const axis = parseValueExpression(m[2], varMap)
			if (axis) {
				const v = getOrCreateVar(m[1], varMap)
				return mkSetVar(v, {
					block: {
						type: 'game_gamepad_axis',
						id: rid(),
						inputs: { AXIS: axis },
					},
				})
			}
		}
	}

	// x = gamepad_button_pressed(BUTTON)
	{
		const m = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*gamepad_button_pressed\(\s*(.+)\s*\)\s*$/)
		if (m) {
			const button = parseValueExpression(m[2], varMap)
			if (button) {
				const v = getOrCreateVar(m[1], varMap)
				return mkSetVar(v, {
					block: {
						type: 'game_gamepad_button',
						id: rid(),
						inputs: { BUTTON: button },
					},
				})
			}
		}
	}

	// x = key_is_pressed("left")
	{
		const m = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*key_is_pressed\(\s*["']([^"']+)["']\s*\)\s*$/)
		if (m) {
			const v = getOrCreateVar(m[1], varMap)
			return mkSetVar(v, {
				block: {
					type: 'game_is_key_pressed',
					id: rid(),
					fields: { KEY: pythonKeyToBlocklyKey(m[2]) },
				},
			})
		}
	}

	// random assignment: x = random_int(MIN, MAX)
	{
		const re = new RegExp(
			`^([A-Za-z_]\\w*)\\s*=\\s*(?:random_int|randint|random_between)\\(\\s*${VALUE_TOKEN_RE}\\s*,\\s*${VALUE_TOKEN_RE}\\s*\\)\\s*$`
		)
		const m = trimmed.match(re)
		if (m) {
			const v = getOrCreateVar(m[1], varMap)
			return mkSetVar(v, {
				block: {
					type: 'game_random_int',
					id: rid(),
					inputs: {
						MIN: valFromToken(m[2], varMap),
						MAX: valFromToken(m[3], varMap),
					},
				},
			})
		}
	}

	// random assignment: x = random_x(), x = random_y()
	{
		const rx = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*random_x\(\s*\)\s*$/)
		if (rx) {
			const v = getOrCreateVar(rx[1], varMap)
			return mkSetVar(v, { block: { type: 'game_random_x', id: rid() } })
		}
		const ry = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*random_y\(\s*\)\s*$/)
		if (ry) {
			const v = getOrCreateVar(ry[1], varMap)
			return mkSetVar(v, { block: { type: 'game_random_y', id: rid() } })
		}
	}

	// compound assignment: x += VALUE, x -= VALUE, x *= VALUE, x /= VALUE
	{
		const m = trimmed.match(/^([A-Za-z_]\w*)\s*([+\-*/])=\s*(.+)$/)
		if (m) {
			const v = getOrCreateVar(m[1], varMap)
			const rhs = parseValueExpression(m[3], varMap)
			if (rhs) {
				const opMap = {
					'+': 'ADD',
					'-': 'MINUS',
					'*': 'MULTIPLY',
					'/': 'DIVIDE',
				}
				return mkSetVar(v, mkArithmetic(opMap[m[2]] || 'ADD', shadowVarGet(v), rhs))
			}
		}
	}

	// basic assignment: x = VALUE
	{
		const re = new RegExp(`^([A-Za-z_]\\w*)\\s*=\\s*${VALUE_TOKEN_RE}\\s*$`)
		const m = trimmed.match(re)
		if (m) {
			const v = getOrCreateVar(m[1], varMap)
			return mkSetVar(v, valFromToken(m[2], varMap))
		}
	}

	// arithmetic: x = x + VALUE | x = x - VALUE
	{
		const re = new RegExp(
			`^([A-Za-z_]\\w*)\\s*=\\s*([A-Za-z_]\\w*)\\s*([+\\-])\\s*${VALUE_TOKEN_RE}\\s*$`
		)
		const m = trimmed.match(re)
		if (m) {
			const targetName = m[1]
			const leftName = m[2]
			const opChar = m[3]

			const v = getOrCreateVar(targetName, varMap)
			const op = opChar === '+' ? 'ADD' : 'MINUS'
			const leftVal = valFromToken(leftName, varMap)
			const rightVal = valFromToken(m[4], varMap)

			return mkSetVar(v, mkArithmetic(op, leftVal, rightVal))
		}
	}

	// multiply: dx = dx * -1
	{
		const re = /^([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*\*\s*(-?\d+(?:\.\d+)?)\s*$/
		const m = trimmed.match(re)
		if (m) {
			const targetName = m[1]
			const leftName = m[2]
			const num = m[3]

			const v = getOrCreateVar(targetName, varMap)
			const leftVal = valFromToken(leftName, varMap)
			const rightVal = shadowNum(num)

			return mkSetVar(v, mkArithmetic('MULTIPLY', leftVal, rightVal))
		}
	}

	return null
}

function inferChildIndent(lines, startIndex, parentIndent) {
	for (let j = startIndex; j < lines.length; j++) {
		const raw = lines[j]
		if (!raw.trim()) continue
		const ind = raw.match(/^(\s*)/)[1].length

		if (ind <= parentIndent) return parentIndent + 4
		return ind
	}
	return parentIndent + 4
}

function skipSuite(lines, startIndex, indentLevel) {
	let i = startIndex
	while (i < lines.length) {
		const raw = lines[i]
		if (!raw.trim()) {
			i++
			continue
		}

		const currentIndent = raw.match(/^(\s*)/)[1].length
		if (currentIndent < indentLevel) break
		i++
	}
	return i
}

/* ----------------- suite / if / def parsing ----------------- */

const COMPARE_OP_MAP = {
	'<': 'LT',
	'>': 'GT',
	'==': 'EQ',
	'!=': 'NEQ',
	'<=': 'LTE',
	'>=': 'GTE',
}

const AST_COMPARE_OP_MAP = {
	Lt: 'LT',
	Gt: 'GT',
	Eq: 'EQ',
	NotEq: 'NEQ',
	LtE: 'LTE',
	GtE: 'GTE',
	'<': 'LT',
	'>': 'GT',
	'==': 'EQ',
	'!=': 'NEQ',
	'<=': 'LTE',
	'>=': 'GTE',
}

const AST_ARITHMETIC_OP_MAP = {
	Add: 'ADD',
	Sub: 'MINUS',
	Mult: 'MULTIPLY',
	Div: 'DIVIDE',
	Mod: 'MODULO',
	Pow: 'POWER',
	ADD: 'ADD',
	MINUS: 'MINUS',
	MULTIPLY: 'MULTIPLY',
	DIVIDE: 'DIVIDE',
	MODULO: 'MODULO',
	POWER: 'POWER',
	'+': 'ADD',
	'-': 'MINUS',
	'*': 'MULTIPLY',
	'/': 'DIVIDE',
	'%': 'MODULO',
	'**': 'POWER',
}

const AST_UNARY_BOOL_OP_MAP = {
	Not: 'NOT',
	not: 'NOT',
}

function buildWorkspaceVarMap(variables = []) {
	const map = new Map()
	for (const variable of variables || []) {
		if (!variable?.name) continue
		map.set(variable.name, {
			id: variable.id || `var_${variable.name}`,
			name: variable.name,
		})
	}
	return map
}

function collectWorkspaceVars(varMap) {
	return Array.from(varMap.values()).map(variable => ({
		name: variable.name,
		id: variable.id,
		type: '',
	}))
}

function getFieldValue(block, names = []) {
	const fields = block?.fields || {}
	for (const name of names) {
		if (fields[name] !== undefined) return fields[name]
	}

	const lowerToKey = new Map(
		Object.keys(fields).map(key => [String(key).toLowerCase(), key])
	)
	for (const name of names) {
		const match = lowerToKey.get(String(name).toLowerCase())
		if (match) return fields[match]
	}
	return undefined
}

function getInputEntry(block, names = []) {
	const inputs = block?.inputs || {}
	for (const name of names) {
		if (inputs[name]) return inputs[name]
	}

	const lowerToKey = new Map(
		Object.keys(inputs).map(key => [String(key).toLowerCase(), key])
	)
	for (const name of names) {
		const match = lowerToKey.get(String(name).toLowerCase())
		if (match) return inputs[match]
	}
	return null
}

function getInputBlock(block, names = []) {
	const entry = getInputEntry(block, names)
	return entry?.block || entry?.shadow || null
}

function getOrderedInputEntries(block, prefixes = ['ARG', 'VALUE', 'ITEM', 'ELT', 'PARAM']) {
	const inputs = Object.entries(block?.inputs || {})
		.filter(([key]) => prefixes.some(prefix => key.startsWith(prefix)))
		.sort((a, b) => {
			const aNum = Number((a[0].match(/(\d+)$/) || [])[1] || 0)
			const bNum = Number((b[0].match(/(\d+)$/) || [])[1] || 0)
			return aNum - bNum || a[0].localeCompare(b[0])
		})

	return inputs.map(([, entry]) => entry)
}

function extractAstName(block) {
	if (!block || typeof block !== 'object') return ''
	if (block.type === 'variables_get') return String(block?.fields?.VAR?.name || '')
	if (block.type === 'ast_Name' || block.type === 'ast_arg') {
		const raw = getFieldValue(block, ['ID', 'NAME', 'VAR'])
		if (raw && typeof raw === 'object') return String(raw.name || '')
		return String(raw || '')
	}
	const fieldVar = getFieldValue(block, ['VAR'])
	if (fieldVar && typeof fieldVar === 'object') return String(fieldVar.name || '')
	if (typeof fieldVar === 'string') return fieldVar
	return ''
}

function extractAstAttribute(block) {
	if (!block || typeof block !== 'object' || block.type !== 'ast_Attribute') return null
	const attr = String(getFieldValue(block, ['ATTR', 'NAME', 'ID']) || '')
	const baseBlock = getInputBlock(block, ['VALUE', 'OBJECT', 'OBJ'])
	const baseName = extractAstName(baseBlock)
	if (!attr) return null
	return { attr, baseName, baseBlock }
}

function extractAstStringLiteral(block) {
	if (!block || typeof block !== 'object') return ''
	if (block.type === 'text') return String(getFieldValue(block, ['TEXT']) || '')
	if (block.type === 'ast_Str') {
		return String(getFieldValue(block, ['TEXT', 'VALUE', 'S']) || '')
	}
	if (block.type === 'ast_Constant') {
		const value = getFieldValue(block, ['TEXT', 'VALUE', 'S'])
		if (typeof value === 'string') return value
	}
	return ''
}

function normalizeAstValueInput(block, varMap) {
	const normalized = normalizeAstBlock(block, varMap)
	if (!normalized) return null

	if (['variables_get', 'math_number', 'logic_boolean', 'text'].includes(normalized.type)) {
		return { shadow: normalized }
	}

	return { block: normalized }
}

function normalizeAstCallExpression(block, varMap) {
	const callableBlock = getInputBlock(block, ['FUNC', 'FUNCTION', 'CALLABLE', 'NAME'])
	const fnName = extractAstName(callableBlock) || String(getFieldValue(block, ['FUNC', 'FUNCTION', 'NAME']) || '')
	const attributeCall = extractAstAttribute(callableBlock)
	const rawArgs = getOrderedInputEntries(block).map(entry => entry?.block || entry?.shadow).filter(Boolean)
	const argInputs = rawArgs.map(arg => normalizeAstValueInput(arg, varMap))
	if (!fnName && !attributeCall) return null

	const getterMap = {
		get_game_speed: 'game_get_speed',
		get_score: 'game_get_score',
		get_lives: 'game_get_lives',
		get_timer: 'game_get_timer',
		get_health: 'game_get_health',
		get_current_scene: 'game_get_scene',
		get_mouse_x: 'game_mouse_x',
		get_mouse_y: 'game_mouse_y',
		get_touch_x: 'game_touch_x',
		get_touch_y: 'game_touch_y',
		is_game_over: 'game_is_game_over',
		is_game_won: 'game_is_game_won',
		is_game_paused: 'game_is_paused',
		is_mouse_down: 'game_mouse_down',
		is_touch_down: 'game_touch_down',
		random_x: 'game_random_x',
		random_y: 'game_random_y',
	}

	if (getterMap[fnName] && rawArgs.length === 0) {
		return { type: getterMap[fnName], id: rid() }
	}

	if (fnName === 'key_is_pressed' && rawArgs.length === 1) {
		const key = pythonKeyToBlocklyKey(extractAstStringLiteral(rawArgs[0]))
		return { type: 'game_is_key_pressed', id: rid(), fields: { KEY: key } }
	}

	if (fnName === 'sprite_exists' && rawArgs.length === 1) {
		const name = extractAstStringLiteral(rawArgs[0])
		if (name) return { type: 'game_sprite_exists', id: rid(), fields: { NAME: name } }
	}

	if (fnName === 'sprite_touching_edge' && rawArgs.length === 1) {
		const name = extractAstStringLiteral(rawArgs[0])
		if (name) return { type: 'game_touching_edge', id: rid(), fields: { NAME: name } }
	}

	if (fnName === 'sprites_touching' && rawArgs.length === 2) {
		const a = extractAstStringLiteral(rawArgs[0])
		const b = extractAstStringLiteral(rawArgs[1])
		if (a && b) return { type: 'game_touching', id: rid(), fields: { A: a, B: b } }
	}

	if (fnName === 'sprite_touching_group' && rawArgs.length === 2) {
		const name = extractAstStringLiteral(rawArgs[0])
		const group = extractAstStringLiteral(rawArgs[1])
		if (name && group) return { type: 'game_touching_group', id: rid(), fields: { NAME: name, GROUP: group } }
	}

	if (fnName === 'sprites_colliding' && rawArgs.length === 2) {
		const a = extractAstStringLiteral(rawArgs[0])
		const b = extractAstStringLiteral(rawArgs[1])
		if (a && b) return { type: 'game_colliding', id: rid(), fields: { A: a, B: b } }
	}

	if (fnName === 'distance_between' && rawArgs.length === 2) {
		const a = extractAstStringLiteral(rawArgs[0])
		const b = extractAstStringLiteral(rawArgs[1])
		if (a && b) return { type: 'game_distance_to', id: rid(), fields: { A: a, B: b } }
	}

	if ((fnName === 'get_sprite_x' || fnName === 'get_sprite_y') && rawArgs.length === 1) {
		const name = extractAstStringLiteral(rawArgs[0])
		if (name) {
			return {
				type: fnName === 'get_sprite_x' ? 'game_get_x' : 'game_get_y',
				id: rid(),
				fields: { NAME: name },
			}
		}
	}

	if (fnName === 'random_group_member' && rawArgs.length === 1) {
		const group = extractAstStringLiteral(rawArgs[0])
		if (group) return { type: 'game_random_choice_group', id: rid(), fields: { GROUP: group } }
	}

	if (fnName === 'get_stat' && rawArgs.length === 1) {
		const key = extractAstStringLiteral(rawArgs[0])
		if (key !== null) return { type: 'game_get_stat', id: rid(), fields: { KEY: key } }
	}

	if ((fnName === 'get_velocity_x' || fnName === 'get_velocity_y') && rawArgs.length === 1) {
		const name = extractAstStringLiteral(rawArgs[0])
		if (name) {
			return {
				type: fnName === 'get_velocity_x' ? 'game_get_velocity_x' : 'game_get_velocity_y',
				id: rid(),
				fields: { NAME: name },
			}
		}
	}

	if ((fnName === 'random_int' || fnName === 'randint' || fnName === 'random_between') && argInputs[0] && argInputs[1]) {
		return {
			type: 'game_random_int',
			id: rid(),
			inputs: {
				MIN: argInputs[0],
				MAX: argInputs[1],
			},
		}
	}

	if (fnName === 'len' && argInputs[0]) {
		return {
			type: 'lists_length',
			id: rid(),
			inputs: {
				VALUE: argInputs[0],
			},
		}
	}

	if (fnName === 'chance' && argInputs[0]) {
		return { type: 'game_chance', id: rid(), inputs: { PERCENT: argInputs[0] } }
	}

	if (fnName === 'get_gamepad_axis' && argInputs[0]) {
		return { type: 'game_gamepad_axis', id: rid(), inputs: { AXIS: argInputs[0] } }
	}

	if (fnName === 'gamepad_button_pressed' && argInputs[0]) {
		return { type: 'game_gamepad_button', id: rid(), inputs: { BUTTON: argInputs[0] } }
	}

	if (attributeCall?.attr === 'pop' && attributeCall.baseName) {
		const listInput = buildListVariableInput(attributeCall.baseName, varMap)
		if (rawArgs.length === 0) {
			return buildListGetIndexBlock(listInput, null, 'GET_REMOVE', 'LAST')
		}

		if (rawArgs.length === 1 && argInputs[0]) {
			return buildListGetIndexBlock(listInput, argInputs[0], 'GET_REMOVE', 'FROM_START')
		}
	}

	return null
}

function normalizeAstCallStatement(block, varMap) {
	const callableBlock = getInputBlock(block, ['FUNC', 'FUNCTION', 'CALLABLE', 'NAME'])
	const fnName = extractAstName(callableBlock) || String(getFieldValue(block, ['FUNC', 'FUNCTION', 'NAME']) || '')
	const attributeCall = extractAstAttribute(callableBlock)
	const rawArgs = getOrderedInputEntries(block).map(entry => entry?.block || entry?.shadow).filter(Boolean)
	const argInputs = rawArgs.map(arg => normalizeAstValueInput(arg, varMap))
	if (!fnName && !attributeCall) return null

	const oneValue = key => argInputs[0] ? { type: key, id: rid(), inputs: { VALUE: argInputs[0] } } : null
	const oneDelta = key => argInputs[0] ? { type: key, id: rid(), inputs: { DELTA: argInputs[0] } } : null

	switch (fnName) {
		case 'game_over':
			return { type: 'game_game_over', id: rid() }
		case 'win_game':
			return { type: 'game_win_game', id: rid() }
		case 'set_game_speed':
			return argInputs[0] ? { type: 'game_set_speed', id: rid(), inputs: { RATE: argInputs[0] } } : null
		case 'change_game_speed':
			return oneDelta('game_change_speed')
		case 'set_score':
			return oneValue('game_set_score')
		case 'change_score':
			return oneDelta('game_change_score')
		case 'set_health':
			return oneValue('game_set_health')
		case 'change_health':
			return oneDelta('game_change_health')
		case 'set_lives':
			return oneValue('game_set_lives')
		case 'change_lives':
			return oneDelta('game_change_lives')
		case 'set_timer':
			return oneValue('game_set_timer')
		case 'change_timer':
			return oneDelta('game_change_timer')
		case 'set_hud_text':
			return argInputs[0] ? { type: 'game_set_hud_text', id: rid(), inputs: { TEXT: argInputs[0] } } : null
		case 'show_score_overlay': {
			const visible = getFieldValue(rawArgs[0], ['BOOL', 'VALUE'])
			return visible !== undefined
				? { type: 'game_set_score_overlay_visible', id: rid(), fields: { VISIBLE: String(visible).toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE' } }
				: null
		}
		case 'show_status_overlay': {
			const visible = getFieldValue(rawArgs[0], ['BOOL', 'VALUE'])
			return visible !== undefined
				? { type: 'game_set_status_overlay_visible', id: rid(), fields: { VISIBLE: String(visible).toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE' } }
				: null
		}
		case 'set_hud_metric_visible': {
			const metric = String(extractAstStringLiteral(rawArgs[0]) || '').trim().toLowerCase()
			const visible = getFieldValue(rawArgs[1], ['BOOL', 'VALUE'])
			if (['score', 'lives', 'timer', 'health'].includes(metric) && visible !== undefined) {
				return {
					type: 'game_set_hud_metric_visible',
					id: rid(),
					fields: { METRIC: metric, VISIBLE: String(visible).toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE' },
				}
			}
			return null
		}
		case 'set_hud_metric_label': {
			const metric = String(extractAstStringLiteral(rawArgs[0]) || '').trim().toLowerCase()
			const label = extractAstStringLiteral(rawArgs[1])
			if (['score', 'lives', 'timer', 'health'].includes(metric) && label !== null) {
				return {
					type: 'game_set_hud_metric_label',
					id: rid(),
					fields: { METRIC: metric, LABEL: label },
				}
			}
			return null
		}
		case 'set_hud_order': {
			const order = extractAstStringLiteral(rawArgs[0])
			return order !== null ? { type: 'game_set_hud_order', id: rid(), fields: { ORDER: order } } : null
		}
		case 'set_hud_inline_overlay': {
			const visible = getFieldValue(rawArgs[0], ['BOOL', 'VALUE'])
			return visible !== undefined
				? { type: 'game_set_hud_inline_overlay', id: rid(), fields: { VISIBLE: String(visible).toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE' } }
				: null
		}
		case 'set_game_over_text': {
			const text = extractAstStringLiteral(rawArgs[0])
			return text !== null ? { type: 'game_set_game_over_text', id: rid(), fields: { TEXT: text } } : null
		}
		case 'set_win_text': {
			const text = extractAstStringLiteral(rawArgs[0])
			return text !== null ? { type: 'game_set_win_text', id: rid(), fields: { TEXT: text } } : null
		}
		case 'load_scene': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name ? { type: 'game_load_scene', id: rid(), fields: { NAME: name } } : null
		}
		case 'restart_scene':
			return { type: 'game_restart_scene', id: rid() }
		case 'pause_game':
			return { type: 'game_pause', id: rid() }
		case 'resume_game':
			return { type: 'game_resume', id: rid() }
		case 'set_stat': {
			const key = extractAstStringLiteral(rawArgs[0])
			if (key !== null && argInputs[1]) {
				return { type: 'game_set_stat', id: rid(), fields: { KEY: key }, inputs: { VALUE: argInputs[1] } }
			}
			return null
		}
		case 'show_sprite': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name ? { type: 'game_show_sprite', id: rid(), fields: { NAME: name } } : null
		}
		case 'hide_sprite': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name ? { type: 'game_hide_sprite', id: rid(), fields: { NAME: name } } : null
		}
		case 'delete_sprite': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name ? { type: 'game_delete_sprite', id: rid(), fields: { NAME: name } } : null
		}
		case 'delete_group': {
			const group = extractAstStringLiteral(rawArgs[0])
			return group ? { type: 'game_delete_group', id: rid(), fields: { GROUP: group } } : null
		}
			case 'create_sprite': {
				const name = extractAstStringLiteral(rawArgs[0])
				if (!name || !argInputs[1] || !argInputs[2]) return null
				return { type: 'game_create_sprite', id: rid(), fields: { NAME: name }, inputs: { X: argInputs[1], Y: argInputs[2] } }
			}
			case 'set_pixel':
			case 'setPixel': {
				const color = extractAstStringLiteral(rawArgs[2])
				return argInputs[0] && argInputs[1] && color
					? { type: 'game_set_pixel', id: rid(), fields: { COLOR: color }, inputs: { X: argInputs[0], Y: argInputs[1] } }
					: null
			}
			case 'spawn_sprite': {
			const base = extractAstStringLiteral(rawArgs[0])
			const group = extractAstStringLiteral(rawArgs[3]) || ''
			return base && argInputs[1] && argInputs[2]
				? { type: 'game_spawn_sprite', id: rid(), fields: { BASE: base, GROUP: group }, inputs: { X: argInputs[1], Y: argInputs[2] } }
				: null
		}
		case 'clone_sprite': {
			const source = extractAstStringLiteral(rawArgs[0])
			const target = extractAstStringLiteral(rawArgs[1])
			const group = extractAstStringLiteral(rawArgs[4]) || ''
			return source && target && argInputs[2] && argInputs[3]
				? { type: 'game_clone_sprite', id: rid(), fields: { SOURCE: source, TARGET: target, GROUP: group }, inputs: { X: argInputs[2], Y: argInputs[3] } }
				: null
		}
		case 'add_to_group': {
			const name = extractAstStringLiteral(rawArgs[0])
			const group = extractAstStringLiteral(rawArgs[1])
			return name && group ? { type: 'game_add_to_group', id: rid(), fields: { NAME: name, GROUP: group } } : null
		}
		case 'remove_from_group': {
			const name = extractAstStringLiteral(rawArgs[0])
			const group = extractAstStringLiteral(rawArgs[1])
			return name && group ? { type: 'game_remove_from_group', id: rid(), fields: { NAME: name, GROUP: group } } : null
		}
		case 'set_collision_layer': {
			const name = extractAstStringLiteral(rawArgs[0])
			const layer = extractAstStringLiteral(rawArgs[1])
			return name && layer ? { type: 'game_set_collision_layer', id: rid(), fields: { NAME: name, LAYER: layer } } : null
		}
		case 'set_collision_mask': {
			const name = extractAstStringLiteral(rawArgs[0])
			const mask = extractAstStringLiteral(rawArgs[1])
			return name && mask ? { type: 'game_set_collision_mask', id: rid(), fields: { NAME: name, MASK: mask } } : null
		}
		case 'set_collision_response': {
			const name = extractAstStringLiteral(rawArgs[0])
			const response = String(extractAstStringLiteral(rawArgs[1]) || '').toLowerCase()
			return name && ['none', 'bounce', 'slide'].includes(response)
				? { type: 'game_set_collision_response', id: rid(), fields: { NAME: name, RESPONSE: response } }
				: null
		}
		case 'set_sprite_opacity': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1]
				? { type: 'game_set_opacity', id: rid(), fields: { NAME: name }, inputs: { OPACITY: argInputs[1] } }
				: null
		}
		case 'set_sprite_color': {
			const name = extractAstStringLiteral(rawArgs[0])
			const color = extractAstStringLiteral(rawArgs[1])
			return name && color ? { type: 'game_set_color', id: rid(), fields: { NAME: name, COLOR: color } } : null
		}
		case 'set_sprite_size': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1] && argInputs[2]
				? { type: 'game_set_size', id: rid(), fields: { NAME: name }, inputs: { WIDTH: argInputs[1], HEIGHT: argInputs[2] } }
				: null
		}
		case 'set_sprite_rotation': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1]
				? { type: 'game_set_rotation', id: rid(), fields: { NAME: name }, inputs: { DEGREES: argInputs[1] } }
				: null
		}
		case 'set_sprite_scale': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1] && argInputs[2]
				? { type: 'game_set_scale', id: rid(), fields: { NAME: name }, inputs: { SCALE_X: argInputs[1], SCALE_Y: argInputs[2] } }
				: null
		}
		case 'set_sprite_z_index': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1]
				? { type: 'game_set_z_index', id: rid(), fields: { NAME: name }, inputs: { Z: argInputs[1] } }
				: null
		}
		case 'set_sprite_image': {
			const name = extractAstStringLiteral(rawArgs[0])
			const src = extractAstStringLiteral(rawArgs[1])
			return name && src ? { type: 'game_set_image', id: rid(), fields: { NAME: name, SRC: src } } : null
		}
		case 'set_sprite_sheet': {
			const name = extractAstStringLiteral(rawArgs[0])
			const src = extractAstStringLiteral(rawArgs[1])
			return name && src && argInputs[2] && argInputs[3]
				? { type: 'game_set_spritesheet', id: rid(), fields: { NAME: name, SRC: src }, inputs: { COLS: argInputs[2], ROWS: argInputs[3] } }
				: null
		}
		case 'define_sprite_animation': {
			const name = extractAstStringLiteral(rawArgs[0])
			const state = extractAstStringLiteral(rawArgs[1])
			const loop = getFieldValue(rawArgs[5], ['BOOL', 'VALUE'])
			return name && state && argInputs[2] && argInputs[3] && argInputs[4] && loop !== undefined
				? {
					type: 'game_define_animation',
					id: rid(),
					fields: { NAME: name, STATE: state, LOOP: String(loop).toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE' },
					inputs: { START: argInputs[2], END: argInputs[3], FPS: argInputs[4] },
				}
				: null
		}
		case 'play_sprite_animation': {
			const name = extractAstStringLiteral(rawArgs[0])
			const state = extractAstStringLiteral(rawArgs[1])
			return name && state ? { type: 'game_play_animation', id: rid(), fields: { NAME: name, STATE: state } } : null
		}
		case 'stop_sprite_animation': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name ? { type: 'game_stop_animation', id: rid(), fields: { NAME: name } } : null
		}
		case 'move_by': {
			const name = extractAstStringLiteral(rawArgs[0])
			if (!name || !argInputs[1] || !argInputs[2]) return null
			return { type: 'game_move_by', id: rid(), fields: { NAME: name }, inputs: { DX: argInputs[1], DY: argInputs[2] } }
		}
		case 'set_position': {
			const name = extractAstStringLiteral(rawArgs[0])
			if (!name || !argInputs[1] || !argInputs[2]) return null
			return { type: 'game_set_xy', id: rid(), fields: { NAME: name }, inputs: { X: argInputs[1], Y: argInputs[2] } }
		}
		case 'set_velocity': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1] && argInputs[2]
				? { type: 'game_set_velocity', id: rid(), fields: { NAME: name }, inputs: { VX: argInputs[1], VY: argInputs[2] } }
				: null
		}
		case 'change_velocity_x': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1]
				? { type: 'game_change_velocity_x', id: rid(), fields: { NAME: name }, inputs: { DVX: argInputs[1] } }
				: null
		}
		case 'change_velocity_y': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1]
				? { type: 'game_change_velocity_y', id: rid(), fields: { NAME: name }, inputs: { DVY: argInputs[1] } }
				: null
		}
		case 'set_acceleration': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1] && argInputs[2]
				? { type: 'game_set_acceleration', id: rid(), fields: { NAME: name }, inputs: { AX: argInputs[1], AY: argInputs[2] } }
				: null
		}
		case 'set_gravity': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1]
				? { type: 'game_set_gravity', id: rid(), fields: { NAME: name }, inputs: { G: argInputs[1] } }
				: null
		}
		case 'set_friction': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1]
				? { type: 'game_set_friction', id: rid(), fields: { NAME: name }, inputs: { F: argInputs[1] } }
				: null
		}
		case 'set_jump_power': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name && argInputs[1]
				? { type: 'game_set_jump_power', id: rid(), fields: { NAME: name }, inputs: { POWER: argInputs[1] } }
				: null
		}
		case 'jump_sprite': {
			const name = extractAstStringLiteral(rawArgs[0])
			return name ? { type: 'game_jump', id: rid(), fields: { NAME: name } } : null
		}
		case 'set_random_seed':
			return argInputs[0] ? { type: 'game_set_random_seed', id: rid(), inputs: { SEED: argInputs[0] } } : null
		case 'respawn_sprite_safe': {
			const name = extractAstStringLiteral(rawArgs[0])
			const away = extractAstStringLiteral(rawArgs[1]) || ''
			const dist = argInputs[2] || shadowNum(0)
			return name ? { type: 'game_respawn_safe', id: rid(), fields: { NAME: name, AWAY: away }, inputs: { DIST: dist } } : null
		}
		case 'keep_in_bounds': {
			const name = extractAstStringLiteral(rawArgs[0])
			const mode = String(extractAstStringLiteral(rawArgs[1]) || '').trim().toLowerCase()
			return name && ['clamp', 'wrap', 'bounce'].includes(mode)
				? { type: 'game_keep_in_bounds', id: rid(), fields: { NAME: name, MODE: mode } }
				: null
		}
		case 'move_toward': {
			const name = extractAstStringLiteral(rawArgs[0])
			const target = extractAstStringLiteral(rawArgs[1])
			return name && target && argInputs[2] && argInputs[3]
				? { type: 'game_move_toward', id: rid(), fields: { NAME: name, TARGET: target }, inputs: { STEP: argInputs[2], STOP: argInputs[3] } }
				: null
		}
		default:
			if (attributeCall?.baseName && attributeCall.attr === 'append' && argInputs[0]) {
				return {
					type: 'lists_setIndex',
					id: rid(),
					fields: { MODE: 'INSERT', WHERE: 'LAST' },
					inputs: {
						LIST: buildListVariableInput(attributeCall.baseName, varMap),
						TO: argInputs[0],
					},
				}
			}

			if (attributeCall?.baseName && attributeCall.attr === 'pop') {
				if (rawArgs.length === 0) {
					return buildListGetIndexBlock(buildListVariableInput(attributeCall.baseName, varMap), null, 'REMOVE', 'LAST')
				}

				if (rawArgs.length === 1 && argInputs[0]) {
					return buildListGetIndexBlock(buildListVariableInput(attributeCall.baseName, varMap), argInputs[0], 'REMOVE', 'FROM_START')
				}
			}

			if (rawArgs.length === 0) return mkProcedureCall(fnName)
			return null
	}
}

function recurseNormalizedBlock(block, varMap) {
	const clone = { ...block }

	if (clone.inputs && typeof clone.inputs === 'object') {
		const nextInputs = {}
		for (const [key, input] of Object.entries(clone.inputs)) {
			if (!input) {
				nextInputs[key] = input
				continue
			}
			const nextInput = { ...input }
			if (input.block) nextInput.block = normalizeAstBlock(input.block, varMap)
			if (input.shadow) nextInput.shadow = normalizeAstBlock(input.shadow, varMap)
			nextInputs[key] = nextInput
		}
		clone.inputs = nextInputs
	}

	if (clone.next?.block) {
		clone.next = { block: normalizeAstBlock(clone.next.block, varMap) }
	}

	return clone
}

function buildChainedLogicOperation(values, op) {
	if (!Array.isArray(values) || values.length < 2) return null

	let current = {
		type: 'logic_operation',
		id: rid(),
		fields: { OP: op },
		inputs: { A: values[0], B: values[1] },
	}

	for (let i = 2; i < values.length; i++) {
		current = {
			type: 'logic_operation',
			id: rid(),
			fields: { OP: op },
			inputs: {
				A: { block: current },
				B: values[i],
			},
		}
	}

	return current
}

function getOrderedFieldValues(block, prefixes = ['OP', 'OPS']) {
	const fields = Object.entries(block?.fields || {})
		.filter(([key]) => prefixes.some(prefix => key.startsWith(prefix)))
		.sort((a, b) => {
			const aNum = Number((a[0].match(/(\d+)$/) || [])[1] || 0)
			const bNum = Number((b[0].match(/(\d+)$/) || [])[1] || 0)
			return aNum - bNum || a[0].localeCompare(b[0])
		})

	return fields.map(([, value]) => value)
}

function offsetIndexForBlockly(indexInput) {
	if (!indexInput) return null
	return {
		block: {
			type: 'math_arithmetic',
			id: rid(),
			fields: { OP: 'ADD' },
			inputs: {
				A: indexInput,
				B: shadowNum(1),
			},
		},
	}
}

function buildListVariableInput(name, varMap) {
	if (!name) return null
	return {
		shadow: {
			type: 'variables_get',
			id: rid(),
			fields: { VAR: varField(getOrCreateVar(name, varMap)) },
		},
	}
}

function buildListGetIndexBlock(listInput, indexInput, mode = 'GET', where = 'FROM_START') {
	if (!listInput) return null
	const block = {
		type: 'lists_getIndex',
		id: rid(),
		fields: { MODE: mode, WHERE: where },
		inputs: {
			VALUE: listInput,
		},
	}

	if (where === 'FROM_START' && indexInput) {
		block.inputs.AT = offsetIndexForBlockly(indexInput)
	}

	return block
}

function normalizeAstBlock(block, varMap) {
	if (!block || typeof block !== 'object') return null
	const type = String(block.type || '')

	if (!type.startsWith('ast_')) {
		return recurseNormalizedBlock(block, varMap)
	}

	if (type === 'ast_Name') {
		const name = extractAstName(block)
		if (!name) return null
		const variable = getOrCreateVar(name, varMap)
		return {
			type: 'variables_get',
			id: rid(),
			fields: { VAR: varField(variable) },
		}
	}

	if (type === 'ast_Num') {
		const num = getFieldValue(block, ['NUM', 'N', 'VALUE'])
		return {
			type: 'math_number',
			id: rid(),
			fields: { NUM: String(num ?? 0) },
		}
	}

	if (type === 'ast_Str') {
		const text = extractAstStringLiteral(block)
		return {
			type: 'text',
			id: rid(),
			fields: { TEXT: text },
		}
	}

	if (type === 'ast_List') {
		const values = getOrderedInputEntries(block, ['ELT', 'ITEM', 'VALUE'])
			.map(entry => entry?.block || entry?.shadow)
			.filter(Boolean)
			.map(value => normalizeAstValueInput(value, varMap))
			.filter(Boolean)

		return {
			type: 'lists_create_with',
			id: rid(),
			extraState: { itemCount: values.length },
			inputs: Object.fromEntries(
				values.map((value, index) => [`ADD${index}`, value])
			),
		}
	}

	if (type === 'ast_NameConstant' || type === 'ast_Constant') {
		const boolValue = getFieldValue(block, ['BOOL'])
		if (boolValue !== undefined) {
			return {
				type: 'logic_boolean',
				id: rid(),
				fields: { BOOL: String(boolValue).toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE' },
			}
		}

		const numericValue = getFieldValue(block, ['NUM', 'N'])
		if (numericValue !== undefined) {
			return {
				type: 'math_number',
				id: rid(),
				fields: { NUM: String(numericValue) },
			}
		}

		const textValue = extractAstStringLiteral(block)
		if (textValue) {
			return {
				type: 'text',
				id: rid(),
				fields: { TEXT: textValue },
			}
		}

		const rawValue = getFieldValue(block, ['VALUE'])
		if (rawValue === true || rawValue === false || rawValue === 'True' || rawValue === 'False') {
			return {
				type: 'logic_boolean',
				id: rid(),
				fields: { BOOL: String(rawValue).toLowerCase() === 'false' ? 'FALSE' : 'TRUE' },
			}
		}
		if (rawValue !== undefined && rawValue !== null && /^-?\d+(\.\d+)?$/.test(String(rawValue))) {
			return {
				type: 'math_number',
				id: rid(),
				fields: { NUM: String(rawValue) },
			}
		}
	}

	if (type === 'ast_BinOp') {
		const left = normalizeAstValueInput(getInputBlock(block, ['LEFT', 'A']), varMap)
		const right = normalizeAstValueInput(getInputBlock(block, ['RIGHT', 'B']), varMap)
		const opRaw = getFieldValue(block, ['OP', 'OPERATOR'])
		const op = AST_ARITHMETIC_OP_MAP[String(opRaw || '')] || 'ADD'
		if (left && right) {
			return {
				type: 'math_arithmetic',
				id: rid(),
				fields: { OP: op },
				inputs: { A: left, B: right },
			}
		}
	}

	if (type === 'ast_UnaryOp') {
		const operand = normalizeAstValueInput(getInputBlock(block, ['OPERAND', 'VALUE', 'ARG']), varMap)
		const rawOp = String(getFieldValue(block, ['OP', 'OPERATOR']) || '')

		if (AST_UNARY_BOOL_OP_MAP[rawOp] === 'NOT' && operand) {
			return {
				type: 'logic_negate',
				id: rid(),
				inputs: { BOOL: operand },
			}
		}

		if ((rawOp === 'USub' || rawOp === 'Sub' || rawOp === '-') && operand) {
			if (operand.shadow?.type === 'math_number') {
				const num = Number(operand.shadow.fields?.NUM ?? 0)
				return {
					type: 'math_number',
					id: rid(),
					fields: { NUM: String(-num) },
				}
			}

			return {
				type: 'math_arithmetic',
				id: rid(),
				fields: { OP: 'MINUS' },
				inputs: {
					A: shadowNum(0),
					B: operand,
				},
			}
		}
	}

	if (type === 'ast_Compare') {
		const leftBlock = getInputBlock(block, ['LEFT', 'A'])
		const comparatorBlocks = getOrderedInputEntries(block, ['COMPARATOR', 'COMPARATORS'])
			.map(entry => entry?.block || entry?.shadow)
			.filter(Boolean)
		const fallbackRight = getInputBlock(block, ['RIGHT', 'B'])
		const rawOps = getOrderedFieldValues(block, ['OPS', 'OP'])
		const fallbackOp = getFieldValue(block, ['OPERATOR'])

		const operands = [leftBlock, ...(comparatorBlocks.length ? comparatorBlocks : fallbackRight ? [fallbackRight] : [])]
			.map(value => normalizeAstValueInput(value, varMap))
			.filter(Boolean)
		const ops = (rawOps.length ? rawOps : fallbackOp !== undefined ? [fallbackOp] : [])
			.map(op => AST_COMPARE_OP_MAP[String(op || '')] || 'EQ')

		if (operands.length >= 2 && ops.length >= 1) {
			const compares = []
			for (let i = 0; i < Math.min(ops.length, operands.length - 1); i++) {
				compares.push({
					block: {
						type: 'logic_compare',
						id: rid(),
						fields: { OP: ops[i] },
						inputs: { A: operands[i], B: operands[i + 1] },
					},
				})
			}

			if (compares.length === 1) return compares[0].block
			return buildChainedLogicOperation(compares, 'AND')
		}
	}

	if (type === 'ast_BoolOp') {
		const values = getOrderedInputEntries(block, ['VALUE']).map(entry => entry?.block || entry?.shadow).filter(Boolean)
		const normalizedValues = (values.length
			? values
			: [getInputBlock(block, ['A', 'LEFT']), getInputBlock(block, ['B', 'RIGHT'])].filter(Boolean)
		).map(value => normalizeAstValueInput(value, varMap)).filter(Boolean)
		const rawOp = String(getFieldValue(block, ['OP', 'OPERATOR']) || 'AND').toUpperCase()
		const op = rawOp === 'OR' ? 'OR' : 'AND'
		if (normalizedValues.length >= 2) {
			return buildChainedLogicOperation(normalizedValues, op)
		}
	}

	if (type === 'ast_IfExp') {
		const ifInput = normalizeAstValueInput(getInputBlock(block, ['TEST', 'COND', 'IF']), varMap)
		const thenInput = normalizeAstValueInput(getInputBlock(block, ['BODY', 'THEN']), varMap)
		const elseInput = normalizeAstValueInput(getInputBlock(block, ['ORELSE', 'ELSE']), varMap)
		if (ifInput && thenInput && elseInput) {
			return {
				type: 'logic_ternary',
				id: rid(),
				inputs: {
					IF: ifInput,
					THEN: thenInput,
					ELSE: elseInput,
				},
			}
		}
	}

	if (type === 'ast_Subscript') {
		const listInput = normalizeAstValueInput(getInputBlock(block, ['VALUE', 'LIST']), varMap)
		const indexBlock = getInputBlock(block, ['SLICE', 'INDEX', 'AT'])
		const indexInput = normalizeAstValueInput(indexBlock, varMap)
		if (listInput && indexInput) {
			return {
				type: 'lists_getIndex',
				id: rid(),
				fields: { MODE: 'GET', WHERE: 'FROM_START' },
				inputs: {
					VALUE: listInput,
					AT: offsetIndexForBlockly(indexInput),
				},
			}
		}
	}

	if (type === 'ast_Call') {
		return normalizeAstCallExpression(block, varMap) || recurseNormalizedBlock(block, varMap)
	}

	if (type === 'ast_Expr') {
		const valueBlock = getInputBlock(block, ['VALUE', 'BODY', 'EXPR'])
		if (!valueBlock) return null
		return normalizeAstCallStatement(valueBlock, varMap) || normalizeAstBlock(valueBlock, varMap)
	}

	if (type === 'ast_Assign') {
		const target = getInputBlock(block, ['TARGET', 'TARGETS', 'LEFT'])
		const value = getInputBlock(block, ['VALUE', 'RIGHT'])
		const targetName = extractAstName(target)
		const valueInput = normalizeAstValueInput(value, varMap)
		if (targetName && valueInput) {
			const variable = getOrCreateVar(targetName, varMap)
			return {
				type: 'variables_set',
				id: rid(),
				fields: { VAR: varField(variable) },
				inputs: { VALUE: valueInput },
			}
		}

		if (target?.type === 'ast_Subscript' && valueInput) {
			const listInput = normalizeAstValueInput(getInputBlock(target, ['VALUE', 'LIST']), varMap)
			const indexInput = normalizeAstValueInput(getInputBlock(target, ['SLICE', 'INDEX', 'AT']), varMap)
			if (listInput && indexInput) {
				return {
					type: 'lists_setIndex',
					id: rid(),
					fields: { MODE: 'SET', WHERE: 'FROM_START' },
					inputs: {
						LIST: listInput,
						AT: offsetIndexForBlockly(indexInput),
						TO: valueInput,
					},
				}
			}
		}
	}

	if (type === 'ast_AugAssign') {
		const target = getInputBlock(block, ['TARGET', 'LEFT'])
		const value = getInputBlock(block, ['VALUE', 'RIGHT'])
		const targetName = extractAstName(target)
		const valueInput = normalizeAstValueInput(value, varMap)
		const opRaw = getFieldValue(block, ['OP', 'OPERATOR'])
		const op = AST_ARITHMETIC_OP_MAP[String(opRaw || '')]
		if (targetName && valueInput && op) {
			const variable = getOrCreateVar(targetName, varMap)
			return {
				type: 'variables_set',
				id: rid(),
				fields: { VAR: varField(variable) },
				inputs: {
					VALUE: {
						block: {
							type: 'math_arithmetic',
							id: rid(),
							fields: { OP: op },
							inputs: {
								A: {
									block: {
										type: 'variables_get',
										id: rid(),
										fields: { VAR: varField(variable) },
									},
								},
								B: valueInput,
							},
						},
					},
				},
			}
		}

		if (target?.type === 'ast_Subscript' && valueInput && op) {
			const listInput = normalizeAstValueInput(getInputBlock(target, ['VALUE', 'LIST']), varMap)
			const indexInput = normalizeAstValueInput(getInputBlock(target, ['SLICE', 'INDEX', 'AT']), varMap)
			const currentValueBlock = buildListGetIndexBlock(listInput, indexInput, 'GET', 'FROM_START')
			if (listInput && indexInput && currentValueBlock) {
				return {
					type: 'lists_setIndex',
					id: rid(),
					fields: { MODE: 'SET', WHERE: 'FROM_START' },
					inputs: {
						LIST: listInput,
						AT: offsetIndexForBlockly(indexInput),
						TO: {
							block: {
								type: 'math_arithmetic',
								id: rid(),
								fields: { OP: op },
								inputs: {
									A: { block: currentValueBlock },
									B: valueInput,
								},
							},
						},
					},
				}
			}
		}
	}

	if (type === 'ast_If') {
		const test = normalizeAstValueInput(getInputBlock(block, ['TEST', 'COND', 'IF0']), varMap)
		const body = normalizeAstBlock(getInputBlock(block, ['BODY', 'DO']), varMap)
		const orelse = normalizeAstBlock(getInputBlock(block, ['ORELSE', 'ELSE']), varMap)
		if (test && body) {
			const inputs = {
				IF0: test,
				DO0: { block: body },
			}
			if (orelse) inputs.ELSE = { block: orelse }
			return {
				type: 'controls_if',
				id: rid(),
				inputs,
			}
		}
	}

	if (type === 'ast_While') {
		const test = normalizeAstValueInput(getInputBlock(block, ['TEST', 'COND', 'BOOL']), varMap)
		const body = normalizeAstBlock(getInputBlock(block, ['BODY', 'DO']), varMap)
		if (test && body) {
			return {
				type: 'controls_whileUntil',
				id: rid(),
				fields: { MODE: 'WHILE' },
				inputs: {
					BOOL: test,
					DO: { block: body },
				},
			}
		}
	}

	if (type === 'ast_For') {
		const targetName = extractAstName(getInputBlock(block, ['TARGET', 'VAR']))
		const iterBlock = getInputBlock(block, ['ITER', 'IN'])
		const body = normalizeAstBlock(getInputBlock(block, ['BODY', 'DO']), varMap)

		if (targetName && iterBlock?.type === 'ast_Call' && body) {
			const fnName = extractAstName(getInputBlock(iterBlock, ['FUNC', 'FUNCTION', 'CALLABLE', 'NAME'])) || String(getFieldValue(iterBlock, ['FUNC', 'FUNCTION', 'NAME']) || '')
			const rawArgs = getOrderedInputEntries(iterBlock).map(entry => entry?.block || entry?.shadow).filter(Boolean)
			const variable = getOrCreateVar(targetName, varMap)

			if (fnName === 'range') {
				const from = rawArgs.length >= 2 ? normalizeAstValueInput(rawArgs[0], varMap) : shadowNum(0)
				const toSource = rawArgs.length >= 2 ? rawArgs[1] : rawArgs[0]
				const to = normalizeAstValueInput(toSource, varMap)
				const by = rawArgs.length >= 3 ? normalizeAstValueInput(rawArgs[2], varMap) : shadowNum(1)
				if (from && to && by) {
					return {
						type: 'controls_for',
						id: rid(),
						fields: { VAR: varField(variable) },
						inputs: {
							FROM: from,
							TO: rawArgs.length === 1
								? {
									block: {
										type: 'math_arithmetic',
										id: rid(),
										fields: { OP: 'MINUS' },
										inputs: {
											A: to,
											B: shadowNum(1),
										},
									},
								}
								: to,
							BY: by,
							DO: { block: body },
						},
					}
				}
			}

			if (fnName === 'get_group_members' && rawArgs.length === 1) {
				const group = extractAstStringLiteral(rawArgs[0])
				if (group) {
					return {
						type: 'game_for_each_in_group',
						id: rid(),
						fields: { GROUP: group, VAR: varField(variable) },
						inputs: { DO: { block: body } },
					}
				}
			}
		}
	}

	return recurseNormalizedBlock(block, varMap)
}

function normalizeAstWorkspace(workspaceJson, seedVarNames = []) {
	if (!workspaceJson || typeof workspaceJson !== 'object') return workspaceJson

	const cloned = JSON.parse(JSON.stringify(workspaceJson))
	const varMap = buildWorkspaceVarMap(cloned.variables || [])
	for (const name of seedVarNames || []) {
		if (!name) continue
		getOrCreateVar(name, varMap)
	}

	if (cloned.blocks && Array.isArray(cloned.blocks.blocks)) {
		cloned.blocks.blocks = cloned.blocks.blocks
			.map(block => normalizeAstBlock(block, varMap))
			.filter(Boolean)
	}

	cloned.variables = collectWorkspaceVars(varMap)
	return cloned
}

function bodyRootFromAstProcedureArg(argBlock, astProcedureBodies = new Map()) {
	const fnName = extractAstName(argBlock)
	if (!fnName) return null
	return cloneBlockRoot(astProcedureBodies.get(fnName)) || null
}

function normalizeAstCustomRegistrationRoot(block, astProcedureBodies = new Map(), varMap) {
	if (!block || typeof block !== 'object') return block

	const valueBlock =
		String(block.type || '') === 'ast_Expr'
			? getInputBlock(block, ['VALUE', 'BODY', 'EXPR'])
			: String(block.type || '') === 'ast_Call'
				? block
				: null

	if (!valueBlock || String(valueBlock.type || '') !== 'ast_Call') return block

	const callableBlock = getInputBlock(valueBlock, ['FUNC', 'FUNCTION', 'CALLABLE', 'NAME'])
	const fnName =
		extractAstName(callableBlock) ||
		String(getFieldValue(valueBlock, ['FUNC', 'FUNCTION', 'NAME']) || '')
	const rawArgs = getOrderedInputEntries(valueBlock)
		.map(entry => entry?.block || entry?.shadow)
		.filter(Boolean)

	switch (fnName) {
		case 'register_frame_handler': {
			const body = bodyRootFromAstProcedureArg(rawArgs[0], astProcedureBodies)
			return body ? { type: 'game_on_tick', id: rid(), inputs: { DO: { block: body } } } : block
		}
		case 'register_key_handler': {
			const key = pythonKeyToBlocklyKey(extractAstStringLiteral(rawArgs[0]))
			const body = bodyRootFromAstProcedureArg(rawArgs[1], astProcedureBodies)
			return key && body
				? { type: 'game_on_key', id: rid(), fields: { KEY: key }, inputs: { DO: { block: body } } }
				: block
		}
		case 'register_key_up_handler': {
			const key = pythonKeyToBlocklyKey(extractAstStringLiteral(rawArgs[0]))
			const body = bodyRootFromAstProcedureArg(rawArgs[1], astProcedureBodies)
			return key && body
				? { type: 'game_on_key_up', id: rid(), fields: { KEY: key }, inputs: { DO: { block: body } } }
				: block
		}
		case 'register_mouse_click_handler': {
			const body = bodyRootFromAstProcedureArg(rawArgs[0], astProcedureBodies)
			return body ? { type: 'game_on_mouse_click', id: rid(), inputs: { DO: { block: body } } } : block
		}
		case 'register_touch_start_handler': {
			const body = bodyRootFromAstProcedureArg(rawArgs[0], astProcedureBodies)
			return body ? { type: 'game_on_touch_start', id: rid(), inputs: { DO: { block: body } } } : block
		}
		case 'register_scene': {
			const name = extractAstStringLiteral(rawArgs[0])
			const body = bodyRootFromAstProcedureArg(rawArgs[1], astProcedureBodies)
			return name && body
				? { type: 'game_on_scene', id: rid(), fields: { NAME: name }, inputs: { DO: { block: body } } }
				: block
		}
		case 'register_every_ticks': {
			const n = normalizeAstValueInput(rawArgs[0], varMap)
			const body = bodyRootFromAstProcedureArg(rawArgs[1], astProcedureBodies)
			return n && body
				? { type: 'game_every_n_ticks', id: rid(), inputs: { N: n, DO: { block: body } } }
				: block
		}
		case 'register_after_ticks': {
			const n = normalizeAstValueInput(rawArgs[0], varMap)
			const body = bodyRootFromAstProcedureArg(rawArgs[1], astProcedureBodies)
			return n && body
				? { type: 'game_after_n_ticks', id: rid(), inputs: { N: n, DO: { block: body } } }
				: block
		}
		case 'register_collision_handler': {
			const a = extractAstStringLiteral(rawArgs[0])
			const b = extractAstStringLiteral(rawArgs[1])
			const body = bodyRootFromAstProcedureArg(rawArgs[2], astProcedureBodies)
			return a && b && body
				? { type: 'game_on_collide', id: rid(), fields: { A: a, B: b }, inputs: { DO: { block: body } } }
				: block
		}
		case 'register_collision_stay_handler': {
			const a = extractAstStringLiteral(rawArgs[0])
			const b = extractAstStringLiteral(rawArgs[1])
			const body = bodyRootFromAstProcedureArg(rawArgs[2], astProcedureBodies)
			return a && b && body
				? { type: 'game_on_collide_stay', id: rid(), fields: { A: a, B: b }, inputs: { DO: { block: body } } }
				: block
		}
		case 'register_collision_exit_handler': {
			const a = extractAstStringLiteral(rawArgs[0])
			const b = extractAstStringLiteral(rawArgs[1])
			const body = bodyRootFromAstProcedureArg(rawArgs[2], astProcedureBodies)
			return a && b && body
				? { type: 'game_on_collide_exit', id: rid(), fields: { A: a, B: b }, inputs: { DO: { block: body } } }
				: block
		}
		case 'register_group_collision_handler': {
			const name = extractAstStringLiteral(rawArgs[0])
			const group = extractAstStringLiteral(rawArgs[1])
			const body = bodyRootFromAstProcedureArg(rawArgs[2], astProcedureBodies)
			return name && group && body
				? {
					type: 'game_on_collide_group',
					id: rid(),
					fields: { NAME: name, GROUP: group },
					inputs: { DO: { block: body } },
				}
				: block
		}
		default:
			return block
	}
}

function normalizeAstCustomRegistrations(astBlocks = [], astProcedureBodies = new Map(), variables = []) {
	const varMap = buildWorkspaceVarMap(variables)
	return (astBlocks || []).map(block =>
		normalizeAstCustomRegistrationRoot(block, astProcedureBodies, varMap)
	)
}

function parseSuite(lines, startIndex, indentLevel, varMap, procedureNames = new Set()) {
	const blocks = []
	let i = startIndex

	while (i < lines.length) {
		const raw = lines[i]
		if (!raw.trim()) {
			i++
			continue
		}

		const currentIndent = raw.match(/^(\s*)/)[1].length
		if (currentIndent < indentLevel) break
		if (currentIndent > indentLevel) {
			i++
			continue
		}

		const trimmed = raw.trim()
		if (!trimmed || trimmed.startsWith('#') || trimmed === 'pass') {
			i++
			continue
		}

		{
			const chain = parseIfChain(lines, i, indentLevel, varMap, procedureNames)
			if (chain) {
				blocks.push(chain.block)
				i = chain.nextIndex
				continue
			}
		}

		// while <condition>:
		{
			const m = trimmed.match(/^while\s+(.+)\s*:\s*$/)
			if (m) {
				let mode = 'WHILE'
				let condText = m[1]
				const notMatch = condText.match(/^not\s+(.+)$/)
				if (notMatch) {
					mode = 'UNTIL'
					condText = notMatch[1]
				}

				const cond = parseConditionLine(condText, varMap)
				if (cond) {
					const bodyStart = i + 1
					const childIndent = inferChildIndent(lines, bodyStart, indentLevel)
					const suite = parseSuite(lines, bodyStart, childIndent, varMap, procedureNames)
					blocks.push({
						type: 'controls_whileUntil',
						id: rid(),
						fields: { MODE: mode },
						inputs: {
							BOOL: { block: cond },
							DO: { block: linkSequence(suite.blocks) },
						},
					})
					i = suite.nextIndex
					continue
				}
			}
		}

		// for var in get_group_members("group"):
		{
			const m = trimmed.match(/^for\s+([A-Za-z_]\w*)\s+in\s+get_group_members\(\s*["']([^"']+)["']\s*\)\s*:\s*$/)
			if (m) {
				const loopVar = getOrCreateVar(m[1], varMap)
				const bodyStart = i + 1
				const childIndent = inferChildIndent(lines, bodyStart, indentLevel)
				const suite = parseSuite(lines, bodyStart, childIndent, varMap, procedureNames)
				blocks.push({
					type: 'game_for_each_in_group',
					id: rid(),
					fields: { GROUP: m[2], VAR: varField(loopVar) },
					inputs: { DO: { block: linkSequence(suite.blocks) } },
				})
				i = suite.nextIndex
				continue
			}
		}
		// for var in range(...)
		{
			const m = trimmed.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\(\s*([\s\S]*)\s*\)\s*:\s*$/)
			if (m) {
				const loopVar = getOrCreateVar(m[1], varMap)
				const args = splitCallArgs(m[2])
				const bodyStart = i + 1
				const childIndent = inferChildIndent(lines, bodyStart, indentLevel)
				const suite = parseSuite(lines, bodyStart, childIndent, varMap, procedureNames)

				if (args.length === 1) {
					const times = parseValueExpression(args[0], varMap)
					if (times) {
						blocks.push({
							type: 'controls_for',
							id: rid(),
							fields: { VAR: varField(loopVar) },
							inputs: {
								FROM: shadowNum(0),
								TO: mkArithmetic(
									'MINUS',
									JSON.parse(JSON.stringify(times)),
									shadowNum(1)
								),
								BY: shadowNum(1),
								DO: { block: linkSequence(suite.blocks) },
							},
						})
						i = suite.nextIndex
						continue
					}
				}

				if (args.length === 2 || args.length === 3) {
					const from = parseValueExpression(args[0], varMap)
					const to = parseValueExpression(args[1], varMap)
					const by = args.length === 3 ? parseValueExpression(args[2], varMap) : shadowNum(1)
					if (from && to && by) {
						blocks.push({
							type: 'controls_for',
							id: rid(),
							fields: { VAR: varField(loopVar) },
							inputs: {
								FROM: from,
								TO: to,
								BY: by,
								DO: { block: linkSequence(suite.blocks) },
							},
						})
						i = suite.nextIndex
						continue
					}
				}
			}
		}

		// break / continue
		if (trimmed === 'break') {
			blocks.push({
				type: 'controls_flow_statements',
				id: rid(),
				fields: { FLOW: 'BREAK' },
			})
			i++
			continue
		}

		if (trimmed === 'continue') {
			blocks.push({
				type: 'controls_flow_statements',
				id: rid(),
				fields: { FLOW: 'CONTINUE' },
			})
			i++
			continue
		}

		const b = mapSimpleLine(trimmed, varMap, procedureNames)
		if (b) blocks.push(b)
		i++
	}

	return { blocks, nextIndex: i }
}

/* ----------------- Python → blocks (pattern-based) ----------------- */

function extractPythonPatterns(pythonCode, astProcedureBodies = new Map(), options = {}) {
	if (!pythonCode || !pythonCode.trim()) return null

	const varNames = collectVars(pythonCode)
	const varMap = makeVarMap(varNames)
	const rawLines = pythonCode.split('\n').map(line => line.replace(/\t/g, '    '))
	const procedureNames = collectProcedureNames(rawLines)
	const astBackedTopLevelStatements = Boolean(options?.astBackedTopLevelStatements)
	const astBackedCustomRegistrations = Boolean(options?.astBackedCustomRegistrations)

	const topBlocks = []
	const functionSuites = new Map()
	const emittedFrameFns = new Set()
	let i = 0

	while (i < rawLines.length) {
		const line = rawLines[i]
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) {
			i++
			continue
		}

		const indent = line.match(/^(\s*)/)[1].length

		// def <name>():
		{
			const m = trimmed.match(/^def\s+([A-Za-z_]\w*)\(\)\s*:/)
			if (m) {
				const fnName = m[1]
				const childIndent = inferChildIndent(rawLines, i + 1, indent)
				if (astBackedCustomRegistrations && astProcedureBodies.has(fnName)) {
					i = skipSuite(rawLines, i + 1, childIndent)
					continue
				}
				const suite = astProcedureBodies.has(fnName)
					? { blocks: [], nextIndex: skipSuite(rawLines, i + 1, childIndent) }
					: parseSuite(rawLines, i + 1, childIndent, varMap, procedureNames)
				functionSuites.set(fnName, suite.blocks)

				if (isImplicitFrameHandlerName(fnName)) {
					topBlocks.push({
						type: 'game_on_tick',
						id: rid(),
						inputs: { DO: { block: preferredBodyRoot(fnName, suite.blocks, astProcedureBodies) } },
					})
					emittedFrameFns.add(fnName)
				} else {
					topBlocks.push(mkProcedureDefinition(fnName, astProcedureBodies.get(fnName) || suite.blocks))
				}

				i = suite.nextIndex
				continue
			}
		}

		// register_frame_handler(fn)
		{
			const m = trimmed.match(/^register_frame_handler\(\s*([A-Za-z_]\w*)\s*\)\s*$/)
			if (m) {
				if (astBackedCustomRegistrations) {
					i++
					continue
				}
				const fnName = m[1]
				if (!emittedFrameFns.has(fnName)) {
					const suiteBlocks = functionSuites.get(fnName) || []
					topBlocks.push({
						type: 'game_on_tick',
						id: rid(),
						inputs: { DO: { block: preferredBodyRoot(fnName, suiteBlocks, astProcedureBodies) } },
					})
					emittedFrameFns.add(fnName)
				}
				i++
				continue
			}
		}

		// register_key_handler("key", fn)
		{
			const m = trimmed.match(
				/^register_key_handler\(\s*["']([^"']+)["']\s*,\s*([A-Za-z_]\w*)\s*\)\s*$/
			)
			if (m) {
				if (astBackedCustomRegistrations) {
					i++
					continue
				}
				const key = pythonKeyToBlocklyKey(m[1])
				const suiteBlocks = functionSuites.get(m[2]) || []
				topBlocks.push({
					type: 'game_on_key',
					id: rid(),
					fields: { KEY: key },
					inputs: { DO: { block: preferredBodyRoot(m[2], suiteBlocks, astProcedureBodies) } },
				})
				i++
				continue
			}
		}

		// register_key_up_handler("key", fn)
		{
			const m = trimmed.match(
				/^register_key_up_handler\(\s*["']([^"']+)["']\s*,\s*([A-Za-z_]\w*)\s*\)\s*$/
			)
			if (m) {
				if (astBackedCustomRegistrations) {
					i++
					continue
				}
				const key = pythonKeyToBlocklyKey(m[1])
				const suiteBlocks = functionSuites.get(m[2]) || []
				topBlocks.push({
					type: 'game_on_key_up',
					id: rid(),
					fields: { KEY: key },
					inputs: { DO: { block: preferredBodyRoot(m[2], suiteBlocks, astProcedureBodies) } },
				})
				i++
				continue
			}
		}

		// register_mouse_click_handler(fn)
		{
			const m = trimmed.match(/^register_mouse_click_handler\(\s*([A-Za-z_]\w*)\s*\)\s*$/)
			if (m) {
				if (astBackedCustomRegistrations) {
					i++
					continue
				}
				const suiteBlocks = functionSuites.get(m[1]) || []
				topBlocks.push({
					type: 'game_on_mouse_click',
					id: rid(),
					inputs: { DO: { block: preferredBodyRoot(m[1], suiteBlocks, astProcedureBodies) } },
				})
				i++
				continue
			}
		}

		// register_touch_start_handler(fn)
		{
			const m = trimmed.match(/^register_touch_start_handler\(\s*([A-Za-z_]\w*)\s*\)\s*$/)
			if (m) {
				if (astBackedCustomRegistrations) {
					i++
					continue
				}
				const suiteBlocks = functionSuites.get(m[1]) || []
				topBlocks.push({
					type: 'game_on_touch_start',
					id: rid(),
					inputs: { DO: { block: preferredBodyRoot(m[1], suiteBlocks, astProcedureBodies) } },
				})
				i++
				continue
			}
		}

		// register_scene("name", fn)
		{
			const m = trimmed.match(
				/^register_scene\(\s*["']([^"']+)["']\s*,\s*([A-Za-z_]\w*)\s*\)\s*$/
			)
			if (m) {
				if (astBackedCustomRegistrations) {
					i++
					continue
				}
				const suiteBlocks = functionSuites.get(m[2]) || []
				topBlocks.push({
					type: 'game_on_scene',
					id: rid(),
					fields: { NAME: m[1] },
					inputs: { DO: { block: preferredBodyRoot(m[2], suiteBlocks, astProcedureBodies) } },
				})
				i++
				continue
			}
		}

		// register_every_ticks(N, fn)
		{
			const m = trimmed.match(/^register_every_ticks\(\s*([\s\S]*)\s*\)\s*$/)
			if (m) {
				const args = splitCallArgs(m[1])
				if (args.length === 2) {
					if (astBackedCustomRegistrations) {
						i++
						continue
					}
					const n = parseValueExpression(args[0], varMap)
					const fnName = String(args[1] || '').trim()
					const suiteBlocks = functionSuites.get(fnName) || []
					if (n) {
						topBlocks.push({ type: 'game_every_n_ticks', id: rid(), inputs: { N: n, DO: { block: preferredBodyRoot(fnName, suiteBlocks, astProcedureBodies) } } })
						i++
						continue
					}
				}
			}
		}

		// register_after_ticks(N, fn)
		{
			const m = trimmed.match(/^register_after_ticks\(\s*([\s\S]*)\s*\)\s*$/)
			if (m) {
				const args = splitCallArgs(m[1])
				if (args.length === 2) {
					if (astBackedCustomRegistrations) {
						i++
						continue
					}
					const n = parseValueExpression(args[0], varMap)
					const fnName = String(args[1] || '').trim()
					const suiteBlocks = functionSuites.get(fnName) || []
					if (n) {
						topBlocks.push({ type: 'game_after_n_ticks', id: rid(), inputs: { N: n, DO: { block: preferredBodyRoot(fnName, suiteBlocks, astProcedureBodies) } } })
						i++
						continue
					}
				}
			}
		}
		// register_collision_handler("a", "b", fn)
		{
			const m = trimmed.match(
				/^register_collision_handler\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*([A-Za-z_]\w*)\s*\)\s*$/
			)
			if (m) {
				if (astBackedCustomRegistrations) {
					i++
					continue
				}
				const suiteBlocks = functionSuites.get(m[3]) || []
				topBlocks.push({
					type: 'game_on_collide',
					id: rid(),
					fields: { A: m[1], B: m[2] },
					inputs: { DO: { block: preferredBodyRoot(m[3], suiteBlocks, astProcedureBodies) } },
				})
				i++
				continue
			}
		}

		// register_collision_stay_handler("a", "b", fn)
		{
			const m = trimmed.match(/^register_collision_stay_handler\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*([A-Za-z_]\w*)\s*\)\s*$/)
			if (m) {
				if (astBackedCustomRegistrations) {
					i++
					continue
				}
				const suiteBlocks = functionSuites.get(m[3]) || []
				topBlocks.push({ type: 'game_on_collide_stay', id: rid(), fields: { A: m[1], B: m[2] }, inputs: { DO: { block: preferredBodyRoot(m[3], suiteBlocks, astProcedureBodies) } } })
				i++
				continue
			}
		}

		// register_collision_exit_handler("a", "b", fn)
		{
			const m = trimmed.match(/^register_collision_exit_handler\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*([A-Za-z_]\w*)\s*\)\s*$/)
			if (m) {
				if (astBackedCustomRegistrations) {
					i++
					continue
				}
				const suiteBlocks = functionSuites.get(m[3]) || []
				topBlocks.push({ type: 'game_on_collide_exit', id: rid(), fields: { A: m[1], B: m[2] }, inputs: { DO: { block: preferredBodyRoot(m[3], suiteBlocks, astProcedureBodies) } } })
				i++
				continue
			}
		}
		// register_group_collision_handler("name", "group", fn)
		{
			const m = trimmed.match(
				/^register_group_collision_handler\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*([A-Za-z_]\w*)\s*\)\s*$/
			)
			if (m) {
				if (astBackedCustomRegistrations) {
					i++
					continue
				}
				const suiteBlocks = functionSuites.get(m[3]) || []
				topBlocks.push({
					type: 'game_on_collide_group',
					id: rid(),
					fields: { NAME: m[1], GROUP: m[2] },
					inputs: { DO: { block: preferredBodyRoot(m[3], suiteBlocks, astProcedureBodies) } },
				})
				i++
				continue
			}
		}

		if (astBackedTopLevelStatements && isAstNativeSimpleTopLevelLine(trimmed, procedureNames)) {
			i++
			continue
		}

		const b = mapSimpleLine(trimmed, varMap, procedureNames)
		if (b) topBlocks.push(b)
		i++
	}

	return {
		blocks: topBlocks,
		variables: Array.from(varMap.values()),
	}
}

/* ----------------- public API: returns workspace JSON ----------------- */

export function convertPythonToBlockly(astJson, pythonCode = '') {
	console.log('[Python to Blockly] Starting conversion')

	const seededVarNames = collectVars(pythonCode || '')
	const normalizedAst = normalizeAstWorkspace(astJson, seededVarNames)
	const firstSanitizedAst = sanitizeAstJson(normalizedAst)
	const firstAstBlocks = firstSanitizedAst?.blocks?.blocks || []
	const astProcedureBodies = collectAstProcedureBodies(firstAstBlocks)
	const astWithCustomRegistrations = {
		...firstSanitizedAst,
		blocks: {
			...(firstSanitizedAst?.blocks || {}),
			blocks: normalizeAstCustomRegistrations(
				firstAstBlocks,
				astProcedureBodies,
				firstSanitizedAst?.variables || []
			),
		},
	}
	const sanitizedAst = sanitizeAstJson(astWithCustomRegistrations)
	const astBlocks = sanitizedAst?.blocks?.blocks || []
	const astBackedTopLevelStatements = hasAstBackedTopLevelStatements(astBlocks)
	const astBackedCustomRegistrations = hasAstBackedCustomRegistrations(astBlocks)

	const pattern = extractPythonPatterns(pythonCode, astProcedureBodies, {
		astBackedTopLevelStatements,
		astBackedCustomRegistrations,
	})
	if (!pattern || !pattern.blocks.length) {
		if (astBlocks.length) {
			console.log('[Python to Blockly] Pattern conversion unavailable, using AST-backed fallback')
			return sanitizedAst
		}

		console.log('[Python to Blockly] Conversion failed, returning null')
		return null
	}

	const mergedBlocks = mergePatternAndAstRoots(pattern.blocks, astBlocks)

	const workspaceJson = {
		blocks: {
			languageVersion: 0,
			blocks: mergedBlocks,
		},
		variables: [
			...pattern.variables.map(v => ({
				name: v.name,
				id: v.id,
				type: '',
			})),
			...((sanitizedAst?.variables || []).filter(astVar =>
				!pattern.variables.some(patternVar => patternVar.name === astVar?.name)
			)),
		],
	}

	console.log('[Python to Blockly] Conversion OK')
	return workspaceJson
}
