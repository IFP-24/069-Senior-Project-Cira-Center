import { describe, expect, it, vi } from 'vitest'
import * as Blockly from 'blockly'
import 'blockly/blocks'
import { pythonGenerator } from 'blockly/python'

import '../../blocks/gameBlocks.js'
import '../../blocks/pythonGenerators.js'
import { convertPythonToBlockly } from '../astConverter.js'
import { getGameWorkspaceFixture } from '../gameFixtures.js'

function topTypes(workspaceJson) {
	return (workspaceJson?.blocks?.blocks || []).map(block => block.type)
}

function collectTypes(block, out = []) {
	if (!block) return out
	out.push(block.type)
	for (const input of Object.values(block.inputs || {})) {
		if (input.block) collectTypes(input.block, out)
		if (input.shadow) collectTypes(input.shadow, out)
	}
	if (block.next?.block) collectTypes(block.next.block, out)
	return out
}

function allTypes(workspaceJson) {
	const out = []
	for (const block of workspaceJson?.blocks?.blocks || []) collectTypes(block, out)
	return out
}

function numShadow(id, value) {
	return { type: 'math_number', id, fields: { NUM: String(value) } }
}

function textShadow(id, value) {
	return { type: 'text', id, fields: { TEXT: value } }
}

function makeFakeBlock(id, fields = {}) {
	return {
		id,
		getFieldValue(name) {
			return fields[name]
		},
		getField() {
			return null
		},
	}
}

async function roundTripRealWorkspace(workspaceJson, label = 'real-workspace') {
	vi.resetModules()
	vi.doUnmock('blockly/python')
	vi.doUnmock('blockly/blocks')

	const BlocklyReal = await import('blockly')
	await import('blockly/blocks')
	const { pythonGenerator: realPythonGenerator } = await import('blockly/python')
	await import('../../blocks/gameBlocks.js?roundtrip-real')
	await import('../../blocks/pythonGenerators.js?roundtrip-real')

	const workspace = new BlocklyReal.Workspace()
	try {
		BlocklyReal.serialization.workspaces.load(workspaceJson, workspace)
		const python = realPythonGenerator.workspaceToCode(workspace)
		const converted = convertPythonToBlockly(null, python)
		return {
			python,
			converted,
			top: topTypes(converted),
			all: allTypes(converted),
		}
	} finally {
		workspace.dispose()
	}
}

function roundTripPythonSnippet(python) {
	const converted = convertPythonToBlockly(null, python)
	return {
		converted,
		top: topTypes(converted),
		all: allTypes(converted),
	}
}

describe('python generator round-trip', () => {
	it('round-trips a mini collector game from generated Python back into Blockly events', () => {
		const keyBlock = makeFakeBlock('key-1', { KEY: 'ArrowRight' })
		const collideBlock = makeFakeBlock('collide-1', { A: 'player', B: 'coin' })

		const fakeGen = {
			...pythonGenerator,
			statementToCode(block, inputName) {
				if (block === keyBlock && inputName === 'DO') return '    move_by("player", 1, 0)\n'
				if (block === collideBlock && inputName === 'DO') return '    change_score(1)\n    delete_sprite("coin")\n'
				return ''
			},
		}

		const python = [
			'create_sprite("player", 1, 1)',
			'create_sprite("coin", 4, 1)',
			pythonGenerator.forBlock['game_on_key'](keyBlock, fakeGen).trim(),
			pythonGenerator.forBlock['game_on_collide'](collideBlock, fakeGen).trim(),
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const types = (converted?.blocks?.blocks || []).map(block => block.type)

		expect(types).toContain('game_create_sprite')
		expect(types).toContain('game_on_key')
		expect(types).toContain('game_on_collide')
	})

	it('generates readable handler names and only adds suffixes for duplicates', () => {
		const firstKeyBlock = makeFakeBlock('left-one', { KEY: 'ArrowLeft' })
		const secondKeyBlock = makeFakeBlock('left-two', { KEY: 'ArrowLeft' })

		const fakeGen = {
			...pythonGenerator,
			__handlerNameCounts: Object.create(null),
			statementToCode() {
				return '    move_by("player", -1, 0)\n'
			},
		}

		const first = pythonGenerator.forBlock['game_on_key'](firstKeyBlock, fakeGen).trim()
		const second = pythonGenerator.forBlock['game_on_key'](secondKeyBlock, fakeGen).trim()

		expect(first).toContain('def on_left_pressed():')
		expect(first).toContain('register_key_handler("left", on_left_pressed)')
		expect(second).toContain('def on_left_pressed_2():')
		expect(second).toContain('register_key_handler("left", on_left_pressed_2)')
	})

	it('round-trips generated key-up and timer events back into Blockly custom roots', () => {
		const keyUpBlock = makeFakeBlock('keyup-1', { KEY: ' ' })
		const everyTicksBlock = makeFakeBlock('every-1')

		const fakeGen = {
			...pythonGenerator,
			statementToCode(block, inputName) {
				if (block === keyUpBlock && inputName === 'DO') return '    set_hud_text("ready")\n'
				if (block === everyTicksBlock && inputName === 'DO') return '    change_score(1)\n'
				return ''
			},
		}

		const python = [
			pythonGenerator.forBlock['game_on_key_up'](keyUpBlock, fakeGen).trim(),
			pythonGenerator.forBlock['game_every_n_ticks'](everyTicksBlock, {
				...fakeGen,
				valueToCode(block, inputName) {
					if (block === everyTicksBlock && inputName === 'N') return '12'
					return '0'
				},
			}).trim(),
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const types = topTypes(converted)

		expect(types).toContain('game_on_key_up')
		expect(types).toContain('game_every_n_ticks')
	})

	it('round-trips generated frame handlers that use boolean key comparisons', () => {
		const tickBlock = makeFakeBlock('tick-1')

		const fakeGen = {
			...pythonGenerator,
			statementToCode(block, inputName) {
				if (block === tickBlock && inputName === 'DO') {
					return '    if key_is_pressed("space") == False:\n        set_score(1)\n'
				}
				return ''
			},
		}

		const python = pythonGenerator.forBlock['game_on_tick'](tickBlock, fakeGen).trim()
		const converted = convertPythonToBlockly(null, python)
		const tickRoot = (converted?.blocks?.blocks || []).find(block => block.type === 'game_on_tick')

		expect(tickRoot).toBeTruthy()
		expect(tickRoot?.inputs?.DO?.block?.type).toBe('controls_if')
		expect(tickRoot?.inputs?.DO?.block?.inputs?.IF0?.block?.type).toBe('logic_negate')
		expect(tickRoot?.inputs?.DO?.block?.inputs?.IF0?.block?.inputs?.BOOL?.block?.type).toBe('game_is_key_pressed')
	})

	it('round-trips set pixel blocks through generated Python', async () => {
		const workspaceJson = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'game_set_pixel',
						id: 'pixel-1',
						fields: { COLOR: '#ffd54f' },
						inputs: {
							X: { shadow: { type: 'math_number', id: 'pixel-x', fields: { NUM: '3' } } },
							Y: { shadow: { type: 'math_number', id: 'pixel-y', fields: { NUM: '4' } } },
						},
						x: 20,
						y: 20,
					},
				],
			},
		}

		const { python, top } = await roundTripRealWorkspace(workspaceJson, 'set-pixel')

		expect(python).toMatch(/set_pixel\(3, 4, ['"]#ffd54f['"]\)/)
		expect(top).toContain('game_set_pixel')
	})

	it('round-trips a mini game from real workspace JSON through generated Python back into custom blocks', async () => {
		const workspaceJson = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'game_create_sprite',
						id: 'player-create',
						fields: { NAME: 'player' },
						inputs: {
							X: { shadow: { type: 'math_number', id: 'player-x', fields: { NUM: '1' } } },
							Y: { shadow: { type: 'math_number', id: 'player-y', fields: { NUM: '1' } } },
						},
						x: 20,
						y: 20,
						next: {
							block: {
								type: 'game_create_sprite',
								id: 'coin-create',
								fields: { NAME: 'coin' },
								inputs: {
									X: { shadow: { type: 'math_number', id: 'coin-x', fields: { NUM: '4' } } },
									Y: { shadow: { type: 'math_number', id: 'coin-y', fields: { NUM: '1' } } },
								},
							},
						},
					},
					{
						type: 'game_on_key',
						id: 'move-right',
						fields: { KEY: 'ArrowRight' },
						x: 20,
						y: 180,
						inputs: {
							DO: {
								block: {
									type: 'game_move_by',
									id: 'move-player',
									fields: { NAME: 'player' },
									inputs: {
										DX: { shadow: { type: 'math_number', id: 'dx-one', fields: { NUM: '1' } } },
										DY: { shadow: { type: 'math_number', id: 'dy-zero', fields: { NUM: '0' } } },
									},
								},
							},
						},
					},
					{
						type: 'game_on_collide',
						id: 'player-coin-collide',
						fields: { A: 'player', B: 'coin' },
						x: 20,
						y: 300,
						inputs: {
							DO: {
								block: {
									type: 'game_change_score',
									id: 'score-plus-one',
									inputs: {
										DELTA: { shadow: { type: 'math_number', id: 'delta-one', fields: { NUM: '1' } } },
									},
									next: {
										block: {
											type: 'game_delete_sprite',
											id: 'delete-coin',
											fields: { NAME: 'coin' },
										},
									},
								},
							},
						},
					},
				],
			},
		}

		const { python, top } = await roundTripRealWorkspace(workspaceJson, 'mini-collector')

		expect(python).toMatch(/register_key_handler\(['"]right['"],\s*on_right_pressed\)/)
		expect(python).toMatch(
			/register_collision_handler\(['"]player['"],\s*['"]coin['"],\s*on_player_hits_coin\)/,
		)
		expect(top).toContain('game_create_sprite')
		expect(top).toContain('game_on_key')
		expect(top).toContain('game_on_collide')
	})

	it('formats generated Python as setup, then handler defs, then registrations', async () => {
		const workspaceJson = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'game_create_sprite',
						id: 'player-create',
						fields: { NAME: 'player' },
						inputs: {
							X: { shadow: numShadow('player-x', 1) },
							Y: { shadow: numShadow('player-y', 1) },
						},
						x: 20,
						y: 20,
					},
					{
						type: 'game_on_key',
						id: 'move-right',
						fields: { KEY: 'ArrowRight' },
						x: 240,
						y: 20,
						inputs: {
							DO: {
								block: {
									type: 'game_move_by',
									id: 'move-right-body',
									fields: { NAME: 'player' },
									inputs: {
										DX: { shadow: numShadow('move-right-dx', 1) },
										DY: { shadow: numShadow('move-right-dy', 0) },
									},
								},
							},
						},
					},
					{
						type: 'game_on_collide',
						id: 'collect-coin',
						fields: { A: 'player', B: 'coin' },
						x: 240,
						y: 140,
						inputs: {
							DO: {
								block: {
									type: 'game_change_score',
									id: 'collect-score',
									inputs: {
										DELTA: { shadow: numShadow('collect-score-delta', 1) },
									},
								},
							},
						},
					},
				],
			},
		}

		const { python } = await roundTripRealWorkspace(workspaceJson, 'formatted-mini')

		expect(python).toMatch(/create_sprite\(['"]player['"], 1, 1\)\n\ndef on_right_pressed\(\):/)
		expect(python).toMatch(/def on_player_hits_coin\(\):[\s\S]*\n\nregister_key_handler\(['"]right['"], on_right_pressed\)/)
		expect(python.trim()).toMatch(/register_collision_handler\(['"]player['"], ['"]coin['"], on_player_hits_coin\)$/)
	})

	it('round-trips a pong workspace through real Blockly and back into event/game blocks', async () => {
		const workspaceJson = getGameWorkspaceFixture('pong')

		const { python, top, all } = await roundTripRealWorkspace(workspaceJson, 'pong')

		expect(python).toMatch(/create_sprite\(['"]player_paddle['"], 1, 8\)/)
		expect(python).toMatch(/create_sprite\(['"]cpu_paddle['"], 21, 8\)/)
		expect(python).toMatch(/create_sprite\(['"]ball['"], 11, 9\)/)
		expect(python).toMatch(/register_key_handler\(['"]w['"],/)
		expect(python).toMatch(/register_key_handler\(['"]s['"],/)
		expect(python).toMatch(/register_frame_handler\(/)
		expect(top).toContain('game_on_key')
		expect(top).toContain('game_on_tick')
		expect(all).toContain('controls_if')
	})

	it('round-trips a breakout workspace through real Blockly and back into event/game blocks', async () => {
		const workspaceJson = getGameWorkspaceFixture('breakout')

		const { python, top, all } = await roundTripRealWorkspace(workspaceJson, 'breakout')

		expect(python).toMatch(/create_sprite\(['"]paddle['"], 11, 17\)/)
		expect(python).toMatch(/create_sprite\(['"]ball['"], 11, 15\)/)
		expect(python).toMatch(/register_key_handler\(['"]space['"],/)
		expect(python).toMatch(/register_collision_handler\(['"]ball['"],\s*['"]brick1['"],/)
		expect(top).toContain('game_on_key')
		expect(top).toContain('game_on_collide')
		expect(all).toContain('game_win_game')
	})

	it('round-trips a snake workspace through real Blockly and back into event/game blocks', async () => {
		const workspaceJson = getGameWorkspaceFixture('snake')

		const { python, top, all } = await roundTripRealWorkspace(workspaceJson, 'snake')

		expect(python).toMatch(/create_sprite\(['"]head['"], 6, 6\)/)
		expect(python).toMatch(/respawn_sprite_safe\(['"]food['"], ['"]head['"], 4\)/)
		expect(python).toMatch(/register_collision_handler\(['"]head['"],\s*['"]food['"],/)
		expect(top).toContain('game_on_key')
		expect(top).toContain('game_on_collide')
		expect(all).toContain('controls_if')
		expect(all).toContain('game_win_game')
	})

	it('round-trips a shooter workspace through real Blockly and back into event/game blocks', async () => {
		const workspaceJson = getGameWorkspaceFixture('shooter')

		const { python, top, all } = await roundTripRealWorkspace(workspaceJson, 'shooter')

		expect(python).toMatch(/register_key_handler\(['"]space['"],/)
		expect(python).toMatch(/register_key_up_handler\(['"]space['"],/)
		expect(python).toMatch(/register_collision_handler\(['"]bullet['"],\s*['"]enemy['"],/)
		expect(python).toContain('random_int(2, 20)')
		expect(top).toContain('game_on_key')
		expect(top).toContain('game_on_key_up')
		expect(top).toContain('game_on_collide')
		expect(all).toContain('controls_if')
	})

	it('round-trips a tetris-lite workspace through real Blockly and back into event/game blocks', async () => {
		const workspaceJson = getGameWorkspaceFixture('tetris-lite')

		const { python, top, all } = await roundTripRealWorkspace(workspaceJson, 'tetris-lite')

		expect(python).toMatch(/create_sprite\(['"]b0['"], 10, 2\)/)
		expect(python).toMatch(/register_key_handler\(['"]left['"],/)
		expect(python).toMatch(/register_key_handler\(['"]down['"],/)
		expect(python).toMatch(/register_frame_handler\(/)
		expect(top).toContain('game_on_key')
		expect(top).toContain('game_on_tick')
		expect(all).toContain('controls_if')
		expect(all).toContain('game_win_game')
	})

	it('round-trips the documented supported beginner subset into editable Blockly roots', () => {
		const python = [
			'player_x = 1',
			'player_y = 1',
			'score_now = 0',
			'lives_now = 3',
			'tick_count = 0',
			'set_score(0)',
			'set_lives(3)',
			'set_timer(0)',
			'set_hud_metric_visible("score", True)',
			'set_hud_metric_visible("lives", True)',
			'set_hud_metric_visible("timer", True)',
			'create_sprite("player", 1, 1)',
			'create_sprite("coin", 4, 1)',
			'def reset_player():',
			'    player_x = 1',
			'    player_y = 1',
			'    set_position("player", player_x, player_y)',
			'def on_space_up():',
			'    set_hud_text("ready")',
			'def on_collect():',
			'    change_score(1)',
			'    delete_sprite("coin")',
			'def every_second():',
			'    tick_count = tick_count + 1',
			'    if tick_count > 2:',
			'        set_hud_text("timer running")',
			'def on_frame():',
			'    player_x = player_x + 1',
			'    if get_score() >= 1:',
			'        win_game()',
			'    else:',
			'        while player_x > 5:',
			'            player_x = player_x - 1',
			'        for i in range(2):',
			'            score_now = score_now + i',
			'        set_position("player", player_x, player_y)',
			'register_key_handler("right", reset_player)',
			'register_key_up_handler("space", on_space_up)',
			'register_collision_handler("player", "coin", on_collect)',
			'register_every_ticks(12, every_second)',
			'register_frame_handler(on_frame)',
		].join('\n')

		const { top, all } = roundTripPythonSnippet(python)

		expect(top).toEqual(
			expect.arrayContaining([
				'variables_set',
				'game_create_sprite',
				'game_on_key',
				'game_on_key_up',
				'game_on_collide',
				'game_every_n_ticks',
				'game_on_tick',
			]),
		)
		expect(all).toEqual(
			expect.arrayContaining([
				'variables_set',
				'math_arithmetic',
				'controls_if',
				'controls_for',
				'controls_whileUntil',
				'procedures_defnoreturn',
			]),
		)
		expect(all.some(type => type.startsWith('ast_'))).toBe(false)
	})
})
