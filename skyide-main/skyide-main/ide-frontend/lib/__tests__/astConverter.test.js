import { describe, expect, it } from 'vitest'

import { convertPythonToBlockly } from '../astConverter.js'

function topTypes(workspaceJson) {
	return (workspaceJson?.blocks?.blocks || []).map(block => block.type)
}

describe('astConverter game extensions', () => {
		it('maps new game APIs into Blockly blocks', () => {
			const python = [
				'create_sprite("player", 1, 1)',
				'set_pixel(3, 4, "#ffd54f")',
				'set_sprite_size("player", 2, 2)',
				'set_random_seed(42)',
				'respawn_sprite_safe("coin", "player", 3)',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
			const types = topTypes(converted)

			expect(types).toContain('game_create_sprite')
			expect(types).toContain('game_set_pixel')
			expect(types).toContain('game_set_size')
			expect(types).toContain('game_set_random_seed')
			expect(types).toContain('game_respawn_safe')
	})

	it('normalizes key aliases like spacebar in imported conditions', () => {
		const python = [
			'def on_frame():',
			'    if key_is_pressed("spacebar"):',
			'        move_by("player", 1, 0)',
			'register_frame_handler(on_frame)',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const tickBlock = (converted?.blocks?.blocks || []).find(block => block.type === 'game_on_tick')
		expect(tickBlock).toBeTruthy()

		const ifBlock = tickBlock?.inputs?.DO?.block
		const cond = ifBlock?.inputs?.IF0?.block
		expect(cond?.type).toBe('game_is_key_pressed')
		expect(cond?.fields?.KEY).toBe(' ')
	})

	it('maps entity/group and physics APIs into Blockly blocks', () => {
		const python = [
			'spawn_sprite("bullet", 2, 3, "bullets")',
			'clone_sprite("enemy", "enemy2", 10, 4, "enemies")',
			'add_to_group("enemy2", "enemies")',
			'set_velocity("player", 1, -2)',
			'change_velocity_x("player", 1)',
			'set_acceleration("player", 0, 1)',
			'set_gravity("player", 1)',
			'set_friction("player", 0.9)',
			'set_jump_power("player", 5)',
			'jump_sprite("player")',
			'move_by("player", 1, 1)',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const types = topTypes(converted)

		expect(types).toContain('game_spawn_sprite')
		expect(types).toContain('game_clone_sprite')
		expect(types).toContain('game_add_to_group')
		expect(types).toContain('game_set_velocity')
		expect(types).toContain('game_change_velocity_x')
		expect(types).toContain('game_set_acceleration')
		expect(types).toContain('game_set_gravity')
		expect(types).toContain('game_set_friction')
		expect(types).toContain('game_set_jump_power')
		expect(types).toContain('game_jump')
		expect(types).toContain('game_move_by')
	})


	it('maps HUD, scene, and extended input APIs into Blockly blocks', () => {
		const python = [
			'set_hud_text("Ready")',
			'set_hud_metric_label("score", "Player")',
			'set_lives(3)',
			'change_lives(-1)',
			'set_timer(30)',
			'change_timer(-1)',
			'set_health(75)',
			'change_health(-5)',
			'show_score_overlay(True)',
			'show_status_overlay(False)',
			'set_hud_metric_visible("timer", False)',
			'set_hud_order("score,health")',
			'set_hud_inline_overlay(False)',
			'set_game_over_text("Try again")',
			'set_win_text("Level clear")',
			'load_scene("level2")',
			'pause_game()',
			'resume_game()',
			'restart_scene()',
			'def on_release():',
			'    pass',
			'def on_click():',
			'    pass',
			'def on_touch():',
			'    pass',
			'def on_menu():',
			'    set_hud_text("Menu")',
			'register_key_up_handler("left", on_release)',
			'register_mouse_click_handler(on_click)',
			'register_touch_start_handler(on_touch)',
			'register_scene("menu", on_menu)',
			'a = get_lives()',
			'b = get_timer()',
			'c = get_health()',
			'd = get_current_scene()',
			'e = get_mouse_x()',
			'f = get_touch_y()',
			'g = get_gamepad_axis(0)',
			'h = gamepad_button_pressed(1)',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const types = topTypes(converted)

		expect(types).toContain('game_set_hud_text')
		expect(types).toContain('game_set_hud_metric_label')
		expect(types).toContain('game_set_lives')
		expect(types).toContain('game_change_lives')
		expect(types).toContain('game_set_timer')
		expect(types).toContain('game_change_timer')
		expect(types).toContain('game_set_health')
		expect(types).toContain('game_change_health')
		expect(types).toContain('game_set_score_overlay_visible')
		expect(types).toContain('game_set_status_overlay_visible')
		expect(types).toContain('game_set_hud_metric_visible')
		expect(types).toContain('game_set_hud_order')
		expect(types).toContain('game_set_hud_inline_overlay')
		expect(types).toContain('game_set_game_over_text')
		expect(types).toContain('game_set_win_text')
		expect(types).toContain('game_load_scene')
		expect(types).toContain('game_pause')
		expect(types).toContain('game_resume')
		expect(types).toContain('game_restart_scene')
		expect(types).toContain('game_on_key_up')
		expect(types).toContain('game_on_mouse_click')
		expect(types).toContain('game_on_touch_start')
		expect(types).toContain('game_on_scene')
	})

	it('maps collision and visual APIs into Blockly blocks', () => {
		const python = [
			'set_collision_layer("player", "player")',
			'set_collision_mask("player", "enemies,walls")',
			'set_collision_response("player", "slide")',
			'show_sprite("player")',
			'hide_sprite("enemy")',
			'set_sprite_opacity("player", 0.5)',
			'set_sprite_rotation("player", 45)',
			'set_sprite_scale("player", 2, 1)',
			'set_sprite_z_index("player", 10)',
			'set_sprite_image("player", "https://example.com/p.png")',
			'set_sprite_sheet("player", "https://example.com/s.png", 4, 4)',
			'define_sprite_animation("player", "walk", 0, 3, 8, True)',
			'play_sprite_animation("player", "walk")',
			'stop_sprite_animation("player")',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const types = topTypes(converted)

		expect(types).toContain('game_set_collision_layer')
		expect(types).toContain('game_set_collision_mask')
		expect(types).toContain('game_set_collision_response')
		expect(types).toContain('game_show_sprite')
		expect(types).toContain('game_hide_sprite')
		expect(types).toContain('game_set_opacity')
		expect(types).toContain('game_set_rotation')
		expect(types).toContain('game_set_scale')
		expect(types).toContain('game_set_z_index')
		expect(types).toContain('game_set_image')
		expect(types).toContain('game_set_spritesheet')
		expect(types).toContain('game_define_animation')
		expect(types).toContain('game_play_animation')
		expect(types).toContain('game_stop_animation')
	})

	it('preserves zero-argument helper functions and calls from imported Python', () => {
		const python = [
			'create_sprite("player", 1, 1)',
			'def draw_piece():',
			'    set_position("player", 2, 3)',
			'def on_left():',
			'    draw_piece()',
			'draw_piece()',
			'register_key_handler("left", on_left)',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const topBlocks = converted?.blocks?.blocks || []
		const types = topTypes(converted)

		expect(types).toContain('procedures_defnoreturn')
		expect(types).toContain('procedures_callnoreturn')
		expect(types).toContain('game_on_key')

		const procDef = topBlocks.find(block => block.type === 'procedures_defnoreturn')
		expect(procDef?.fields?.NAME).toBe('draw_piece')

		const topCall = topBlocks.find(block => block.type === 'procedures_callnoreturn')
		expect(topCall?.fields?.NAME).toBe('draw_piece')
		expect(topCall?.extraState?.name).toBe('draw_piece')

		const onKey = topBlocks.find(block => block.type === 'game_on_key')
		const nestedCall = onKey?.inputs?.DO?.block
		expect(nestedCall?.type).toBe('procedures_callnoreturn')
		expect(nestedCall?.fields?.NAME).toBe('draw_piece')
	})

	it('supports direct getter comparisons inside imported conditions', () => {
		const python = [
			'def on_frame():',
			'    if get_health() <= 0:',
			'        game_over()',
			'    if get_score() >= 40:',
			'        win_game()',
			'register_frame_handler(on_frame)',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const tickBlock = (converted?.blocks?.blocks || []).find(block => block.type === 'game_on_tick')
		expect(tickBlock).toBeTruthy()

		const firstIf = tickBlock?.inputs?.DO?.block
		expect(firstIf?.type).toBe('controls_if')
		expect(firstIf?.inputs?.IF0?.block?.type).toBe('logic_compare')
		expect(firstIf?.inputs?.IF0?.block?.fields?.OP).toBe('LTE')
		expect(firstIf?.inputs?.IF0?.block?.inputs?.A?.block?.type).toBe('game_get_health')
		expect(firstIf?.inputs?.IF0?.block?.inputs?.B?.shadow?.fields?.NUM).toBe('0')
		expect(firstIf?.inputs?.DO0?.block?.type).toBe('game_game_over')

		const secondIf = firstIf?.next?.block
		expect(secondIf?.type).toBe('controls_if')
		expect(secondIf?.inputs?.IF0?.block?.type).toBe('logic_compare')
		expect(secondIf?.inputs?.IF0?.block?.fields?.OP).toBe('GTE')
		expect(secondIf?.inputs?.IF0?.block?.inputs?.A?.block?.type).toBe('game_get_score')
		expect(secondIf?.inputs?.IF0?.block?.inputs?.B?.shadow?.fields?.NUM).toBe('40')
		expect(secondIf?.inputs?.DO0?.block?.type).toBe('game_win_game')
	})

	it('supports boolean game-call comparisons against False in imported conditions', () => {
		const python = [
			'space_ready = 0',
			'def on_frame():',
			'    if key_is_pressed("space") == False:',
			'        space_ready = 1',
			'register_frame_handler(on_frame)',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const tickBlock = (converted?.blocks?.blocks || []).find(block => block.type === 'game_on_tick')
		expect(tickBlock).toBeTruthy()

		const ifBlock = tickBlock?.inputs?.DO?.block
		expect(ifBlock?.type).toBe('controls_if')
		expect(ifBlock?.inputs?.IF0?.block?.type).toBe('logic_negate')
		expect(ifBlock?.inputs?.IF0?.block?.inputs?.BOOL?.block?.type).toBe('game_is_key_pressed')
		expect(ifBlock?.inputs?.IF0?.block?.inputs?.BOOL?.block?.fields?.KEY).toBe(' ')
		expect(ifBlock?.inputs?.DO0?.block?.type).toBe('variables_set')
		expect(ifBlock?.inputs?.DO0?.block?.fields?.VAR?.name).toBe('space_ready')
		expect(ifBlock?.inputs?.DO0?.block?.inputs?.VALUE?.shadow?.fields?.NUM).toBe('1')
	})

	it('supports not key_is_pressed conditions in imported handlers', () => {
		const python = [
			'space_ready = 0',
			'def on_frame():',
			'    if not key_is_pressed("space"):',
			'        space_ready = 1',
			'register_frame_handler(on_frame)',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const tickBlock = (converted?.blocks?.blocks || []).find(block => block.type === 'game_on_tick')
		expect(tickBlock).toBeTruthy()

		const ifBlock = tickBlock?.inputs?.DO?.block
		expect(ifBlock?.type).toBe('controls_if')
		expect(ifBlock?.inputs?.IF0?.block?.type).toBe('logic_negate')
		expect(ifBlock?.inputs?.IF0?.block?.inputs?.BOOL?.block?.type).toBe('game_is_key_pressed')
		expect(ifBlock?.inputs?.DO0?.block?.type).toBe('variables_set')
	})

	it('preserves loop variables for one-argument range imports', () => {
		const python = [
			'def on_frame():',
			'    for i in range(3):',
			'        change_score(i)',
			'register_frame_handler(on_frame)',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const tickBlock = (converted?.blocks?.blocks || []).find(block => block.type === 'game_on_tick')
		expect(tickBlock).toBeTruthy()

		const forBlock = tickBlock?.inputs?.DO?.block
		expect(forBlock?.type).toBe('controls_for')
		expect(forBlock?.fields?.VAR?.name).toBe('i')
		expect(forBlock?.inputs?.FROM?.shadow?.fields?.NUM).toBe('0')
		expect(forBlock?.inputs?.TO?.block?.type).toBe('math_arithmetic')
		expect(forBlock?.inputs?.TO?.block?.fields?.OP).toBe('MINUS')
		expect(forBlock?.inputs?.TO?.block?.inputs?.B?.shadow?.fields?.NUM).toBe('1')
		expect(forBlock?.inputs?.DO?.block?.type).toBe('game_change_score')
		expect(forBlock?.inputs?.DO?.block?.inputs?.DELTA?.shadow?.fields?.VAR?.name).toBe('i')
	})

	it('imports a real arcade-style game snippet with events, collisions, and HUD state', () => {
		const python = [
			'set_score(0)',
			'set_health(100)',
			'set_hud_metric_label("score", "Points")',
			'create_sprite("player", 1, 1)',
			'create_sprite("coin", 4, 4)',
			'create_sprite("enemy", 8, 8)',
			'def on_coin():',
			'    change_score(10)',
			'    delete_sprite("coin")',
			'def on_enemy():',
			'    change_health(-25)',
			'    if get_health() <= 0:',
			'        game_over()',
			'def on_frame():',
			'    if key_is_pressed("right") or key_is_pressed("d"):',
			'        move_by("player", 1, 0)',
			'    if get_score() >= 10:',
			'        win_game()',
			'register_collision_handler("player", "coin", on_coin)',
			'register_collision_handler("player", "enemy", on_enemy)',
			'register_frame_handler(on_frame)',
		].join('\n')

		const converted = convertPythonToBlockly(null, python)
		const types = topTypes(converted)

		expect(types).toContain('game_set_score')
		expect(types).toContain('game_set_health')
		expect(types).toContain('game_set_hud_metric_label')
		expect(types).toContain('game_create_sprite')
		expect(types).toContain('game_on_collide')
		expect(types).toContain('game_on_tick')
	})

	it('falls back to sanitized AST-backed blocks when the pattern importer cannot map the Python', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Unknown',
						id: 'drop-me',
						next: {
							block: {
								type: 'controls_if',
								id: 'keep-me',
								inputs: {
									IF0: {
										block: {
											type: 'logic_boolean',
											id: 'bool-1',
											fields: { BOOL: 'TRUE' },
										},
									},
								},
							},
						},
					},
				],
			},
			variables: [{ name: 'score_now', id: 'var-score', type: '' }],
		}

		const converted = convertPythonToBlockly(astWorkspace, 'import math')

		expect(topTypes(converted)).toEqual(['controls_if'])
		expect(converted?.variables).toEqual([{ name: 'score_now', id: 'var-score', type: '' }])
	})

	it('merges AST-standard blocks with custom game blocks instead of choosing only one source', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'controls_if',
						id: 'if-1',
						inputs: {
							IF0: {
								block: {
									type: 'logic_boolean',
									id: 'bool-1',
									fields: { BOOL: 'TRUE' },
								},
							},
						},
					},
					{
						type: 'game_set_score',
						id: 'dup-score',
						inputs: {
							VALUE: {
								shadow: {
									type: 'math_number',
									id: 'dup-num',
									fields: { NUM: '1' },
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, 'set_score(1)')
		const types = topTypes(converted)

		expect(types).toContain('controls_if')
		expect(types.filter(type => type === 'game_set_score')).toHaveLength(1)
	})

	it('hydrates handler bodies from AST-derived procedure stacks when available', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'procedures_defnoreturn',
						id: 'proc-on-frame',
						fields: { NAME: 'on_frame' },
						inputs: {
							STACK: {
								block: {
									type: 'controls_if',
									id: 'if-from-ast',
									inputs: {
										IF0: {
											block: {
												type: 'logic_boolean',
												id: 'bool-true',
												fields: { BOOL: 'TRUE' },
											},
										},
										DO0: {
											block: {
												type: 'game_set_score',
												id: 'score-from-ast',
												inputs: {
													VALUE: {
														shadow: {
															type: 'math_number',
															id: 'score-num',
															fields: { NUM: '1' },
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				],
			},
		}

		const python = [
			'def on_frame():',
			'    if True:',
			'        set_score(1)',
			'register_frame_handler(on_frame)',
		].join('\n')

		const converted = convertPythonToBlockly(astWorkspace, python)
		const topBlocks = converted?.blocks?.blocks || []
		const tickBlock = topBlocks.find(block => block.type === 'game_on_tick')
		const procDef = topBlocks.find(block => block.type === 'procedures_defnoreturn')

		expect(tickBlock?.inputs?.DO?.block?.type).toBe('controls_if')
		expect(tickBlock?.inputs?.DO?.block?.inputs?.IF0?.block?.type).toBe('logic_boolean')
		expect(procDef?.inputs?.STACK?.block?.type).toBe('controls_if')
	})

	it('prefers AST-derived structured assignment roots over duplicate pattern assignments', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'variables_set',
						id: 'ast-var-set',
						fields: {
							VAR: { id: 'var_score_now', name: 'score_now' },
						},
						inputs: {
							VALUE: {
								shadow: {
									type: 'math_number',
									id: 'ast-score-num',
									fields: { NUM: '1' },
								},
							},
						},
					},
				],
			},
			variables: [{ name: 'score_now', id: 'var_score_now', type: '' }],
		}

		const converted = convertPythonToBlockly(astWorkspace, 'score_now = 1')
		const topBlocks = converted?.blocks?.blocks || []
		const variableSets = topBlocks.filter(block => block.type === 'variables_set')

		expect(variableSets).toHaveLength(1)
		expect(variableSets[0]?.fields?.VAR?.name).toBe('score_now')
		expect(variableSets[0]?.inputs?.VALUE?.shadow?.fields?.NUM).toBe('1')
	})

	it('prefers AST-native top-level game statements over competing simple-line pattern roots', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Expr',
						id: 'expr-set-position',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-set-position',
									inputs: {
										FUNC: {
											block: {
												type: 'ast_Name',
												id: 'fn-set-position',
												fields: { ID: 'set_position' },
											},
										},
										ARG0: {
											block: {
												type: 'ast_Str',
												id: 'arg-player',
												fields: { TEXT: 'player' },
											},
										},
										ARG1: {
											block: {
												type: 'ast_Num',
												id: 'arg-x',
												fields: { NUM: '1' },
											},
										},
										ARG2: {
											block: {
												type: 'ast_Num',
												id: 'arg-y',
												fields: { NUM: '2' },
											},
										},
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, 'set_position("player", 1, 2)')
		const types = topTypes(converted)

		expect(types.filter(type => type === 'game_set_xy')).toHaveLength(1)
		expect(types).not.toContain('game_set_position')
	})

	it('normalizes AST register handlers into custom event roots without pattern duplication', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'procedures_defnoreturn',
						id: 'proc-on-frame',
						fields: { NAME: 'on_frame' },
						inputs: {
							STACK: {
								block: {
									type: 'game_set_score',
									id: 'score-from-ast',
									inputs: {
										VALUE: {
											shadow: {
												type: 'math_number',
												id: 'score-num',
												fields: { NUM: '1' },
											},
										},
									},
								},
							},
						},
					},
					{
						type: 'ast_Expr',
						id: 'expr-register-frame',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-register-frame',
									inputs: {
										FUNC: {
											block: {
												type: 'ast_Name',
												id: 'fn-register-frame',
												fields: { ID: 'register_frame_handler' },
											},
										},
										ARG0: {
											block: {
												type: 'ast_Name',
												id: 'arg-on-frame',
												fields: { ID: 'on_frame' },
											},
										},
									},
								},
							},
						},
					},
				],
			},
		}

		const python = [
			'def on_frame():',
			'    set_score(1)',
			'register_frame_handler(on_frame)',
		].join('\n')

		const converted = convertPythonToBlockly(astWorkspace, python)
		const types = topTypes(converted)
		const tickBlocks = (converted?.blocks?.blocks || []).filter(block => block.type === 'game_on_tick')
		const procedures = (converted?.blocks?.blocks || []).filter(block => block.type === 'procedures_defnoreturn')

		expect(types.filter(type => type === 'game_on_tick')).toHaveLength(1)
		expect(procedures).toHaveLength(1)
		expect(tickBlocks[0]?.inputs?.DO?.block?.type).toBe('game_set_score')
	})

	it('hydrates AST-backed handler bodies that compare boolean game calls to False', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'procedures_defnoreturn',
						id: 'proc-on-frame-bool-compare',
						fields: { NAME: 'on_frame' },
						inputs: {
							STACK: {
								block: {
									type: 'ast_If',
									id: 'if-space-up',
									inputs: {
										TEST: {
											block: {
												type: 'ast_Compare',
												id: 'compare-space-false',
												fields: { OP: 'Eq' },
												inputs: {
													LEFT: {
														block: {
															type: 'ast_Call',
															id: 'call-key-pressed',
															inputs: {
																FUNC: {
																	block: {
																		type: 'ast_Name',
																		id: 'fn-key-is-pressed',
																		fields: { ID: 'key_is_pressed' },
																	},
																},
																ARG0: {
																	block: {
																		type: 'ast_Str',
																		id: 'space-arg',
																		fields: { TEXT: 'space' },
																	},
																},
															},
														},
													},
													RIGHT: {
														block: {
															type: 'ast_Constant',
															id: 'const-false',
															fields: { BOOL: 'FALSE' },
														},
													},
												},
											},
										},
										BODY: {
											block: {
												type: 'ast_Assign',
												id: 'assign-space-ready',
												inputs: {
													TARGET: {
														block: {
															type: 'ast_Name',
															id: 'target-space-ready',
															fields: { ID: 'space_ready' },
														},
													},
													VALUE: {
														block: {
															type: 'ast_Num',
															id: 'value-one',
															fields: { NUM: '1' },
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				],
			},
			variables: [{ name: 'space_ready', id: 'var_space_ready', type: '' }],
		}

		const python = [
			'space_ready = 0',
			'def on_frame():',
			'    if key_is_pressed("space") == False:',
			'        space_ready = 1',
			'register_frame_handler(on_frame)',
		].join('\n')

		const converted = convertPythonToBlockly(astWorkspace, python)
		const tickBlock = (converted?.blocks?.blocks || []).find(block => block.type === 'game_on_tick')
		expect(tickBlock).toBeTruthy()

		const ifBlock = tickBlock?.inputs?.DO?.block
		expect(ifBlock?.type).toBe('controls_if')
		expect(ifBlock?.inputs?.IF0?.block?.type).toBe('logic_compare')
		expect(ifBlock?.inputs?.IF0?.block?.inputs?.A?.block?.type).toBe('game_is_key_pressed')
		expect(ifBlock?.inputs?.IF0?.block?.inputs?.A?.block?.fields?.KEY).toBe(' ')
		expect(ifBlock?.inputs?.IF0?.block?.inputs?.B?.shadow?.type).toBe('logic_boolean')
		expect(ifBlock?.inputs?.IF0?.block?.inputs?.B?.shadow?.fields?.BOOL).toBe('FALSE')
		expect(ifBlock?.inputs?.DO0?.block?.type).toBe('variables_set')
		expect(ifBlock?.inputs?.DO0?.block?.fields?.VAR?.name).toBe('space_ready')
	})

	it('normalizes ast_Assign roots into variables_set blocks before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Assign',
						id: 'assign-1',
						inputs: {
							TARGET: {
								block: {
									type: 'ast_Name',
									id: 'target-name',
									fields: { ID: 'score_now' },
								},
							},
							VALUE: {
								block: {
									type: 'ast_Num',
									id: 'value-num',
									fields: { NUM: '7' },
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const root = converted?.blocks?.blocks?.[0]

		expect(root?.type).toBe('variables_set')
		expect(root?.fields?.VAR?.name).toBe('score_now')
		expect(root?.inputs?.VALUE?.shadow?.fields?.NUM).toBe('7')
	})

	it('normalizes ast_If roots into controls_if blocks before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_If',
						id: 'if-ast',
						inputs: {
							TEST: {
								block: {
									type: 'ast_Compare',
									id: 'compare-1',
									fields: { OP: 'GtE' },
									inputs: {
										LEFT: { block: { type: 'ast_Call', id: 'get-score', inputs: { FUNC: { block: { type: 'ast_Name', id: 'fn-get-score', fields: { ID: 'get_score' } } } } } },
										RIGHT: { block: { type: 'ast_Num', id: 'num-10', fields: { NUM: '10' } } },
									},
								},
							},
							BODY: {
								block: {
									type: 'ast_Expr',
									id: 'expr-win',
									inputs: {
										VALUE: {
											block: {
												type: 'ast_Call',
												id: 'call-win',
												inputs: { FUNC: { block: { type: 'ast_Name', id: 'fn-win', fields: { ID: 'win_game' } } } },
											},
										},
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const root = converted?.blocks?.blocks?.[0]

		expect(root?.type).toBe('controls_if')
		expect(root?.inputs?.IF0?.block?.type).toBe('logic_compare')
		expect(root?.inputs?.DO0?.block?.type).toBe('game_win_game')
	})

	it('normalizes ast_For range roots into controls_for blocks before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_For',
						id: 'for-ast',
						inputs: {
							TARGET: { block: { type: 'ast_Name', id: 'loop-var', fields: { ID: 'i' } } },
							ITER: {
								block: {
									type: 'ast_Call',
									id: 'range-call',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-range', fields: { ID: 'range' } } },
										ARG0: { block: { type: 'ast_Num', id: 'range-num', fields: { NUM: '3' } } },
									},
								},
							},
							BODY: {
								block: {
									type: 'ast_Expr',
									id: 'expr-change',
									inputs: {
										VALUE: {
											block: {
												type: 'ast_Call',
												id: 'call-change',
												inputs: {
													FUNC: { block: { type: 'ast_Name', id: 'fn-change', fields: { ID: 'change_score' } } },
													ARG0: { block: { type: 'ast_Name', id: 'score-var', fields: { ID: 'i' } } },
												},
											},
										},
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const root = converted?.blocks?.blocks?.[0]

		expect(root?.type).toBe('controls_for')
		expect(root?.fields?.VAR?.name).toBe('i')
		expect(root?.inputs?.DO?.block?.type).toBe('game_change_score')
	})

	it('normalizes ast_While roots into controls_whileUntil blocks before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_While',
						id: 'while-ast',
						inputs: {
							TEST: {
								block: {
									type: 'ast_Compare',
									id: 'while-compare',
									fields: { OP: 'Gt' },
									inputs: {
										LEFT: { block: { type: 'ast_Name', id: 'left-health', fields: { ID: 'health_now' } } },
										RIGHT: { block: { type: 'ast_Num', id: 'right-zero', fields: { NUM: '0' } } },
									},
								},
							},
							BODY: {
								block: {
									type: 'ast_Expr',
									id: 'body-change',
									inputs: {
										VALUE: {
											block: {
												type: 'ast_Call',
												id: 'call-health',
												inputs: {
													FUNC: { block: { type: 'ast_Name', id: 'fn-health', fields: { ID: 'change_health' } } },
													ARG0: { block: { type: 'ast_Num', id: 'minus-five', fields: { NUM: '-5' } } },
												},
											},
										},
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const root = converted?.blocks?.blocks?.[0]

		expect(root?.type).toBe('controls_whileUntil')
		expect(root?.fields?.MODE).toBe('WHILE')
		expect(root?.inputs?.BOOL?.block?.type).toBe('logic_compare')
		expect(root?.inputs?.DO?.block?.type).toBe('game_change_health')
	})

	it('normalizes ast_AugAssign roots into variables_set arithmetic blocks before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_AugAssign',
						id: 'augassign-1',
						fields: { OP: 'Add' },
						inputs: {
							TARGET: {
								block: {
									type: 'ast_Name',
									id: 'target-name',
									fields: { ID: 'score_now' },
								},
							},
							VALUE: {
								block: {
									type: 'ast_Num',
									id: 'value-num',
									fields: { NUM: '2' },
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const root = converted?.blocks?.blocks?.[0]

		expect(root?.type).toBe('variables_set')
		expect(root?.fields?.VAR?.name).toBe('score_now')
		expect(root?.inputs?.VALUE?.block?.type).toBe('math_arithmetic')
		expect(root?.inputs?.VALUE?.block?.fields?.OP).toBe('ADD')
		expect(root?.inputs?.VALUE?.block?.inputs?.A?.block?.type).toBe('variables_get')
		expect(root?.inputs?.VALUE?.block?.inputs?.B?.shadow?.fields?.NUM).toBe('2')
	})

	it('normalizes ast_UnaryOp not roots into logic_negate blocks before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_UnaryOp',
						id: 'unary-not-1',
						fields: { OP: 'Not' },
						inputs: {
							OPERAND: {
								block: {
									type: 'ast_Call',
									id: 'call-paused',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-paused', fields: { ID: 'is_game_paused' } } },
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const root = converted?.blocks?.blocks?.[0]

		expect(root?.type).toBe('logic_negate')
		expect(root?.inputs?.BOOL?.block?.type).toBe('game_is_paused')
	})

	it('normalizes AST game expression calls like random_int and distance_between before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Assign',
						id: 'assign-random',
						inputs: {
							TARGET: {
								block: {
									type: 'ast_Name',
									id: 'target-roll',
									fields: { ID: 'roll' },
								},
							},
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-random',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-random', fields: { ID: 'random_int' } } },
										ARG0: { block: { type: 'ast_Num', id: 'min-num', fields: { NUM: '1' } } },
										ARG1: { block: { type: 'ast_Num', id: 'max-num', fields: { NUM: '6' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Assign',
						id: 'assign-distance',
						inputs: {
							TARGET: {
								block: {
									type: 'ast_Name',
									id: 'target-distance',
									fields: { ID: 'dist' },
								},
							},
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-distance',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-distance', fields: { ID: 'distance_between' } } },
										ARG0: { block: { type: 'ast_Str', id: 'str-a', fields: { TEXT: 'player' } } },
										ARG1: { block: { type: 'ast_Str', id: 'str-b', fields: { TEXT: 'enemy' } } },
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const roots = converted?.blocks?.blocks || []

		expect(roots[0]?.type).toBe('variables_set')
		expect(roots[0]?.inputs?.VALUE?.block?.type).toBe('game_random_int')
		expect(roots[0]?.inputs?.VALUE?.block?.inputs?.MIN?.shadow?.fields?.NUM).toBe('1')
		expect(roots[0]?.inputs?.VALUE?.block?.inputs?.MAX?.shadow?.fields?.NUM).toBe('6')

		expect(roots[1]?.type).toBe('variables_set')
		expect(roots[1]?.inputs?.VALUE?.block?.type).toBe('game_distance_to')
		expect(roots[1]?.inputs?.VALUE?.block?.fields?.A).toBe('player')
		expect(roots[1]?.inputs?.VALUE?.block?.fields?.B).toBe('enemy')
	})

	it('normalizes AST game statement calls like set_hud_metric_visible and set_game_speed before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Expr',
						id: 'expr-hud-visible',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-hud-visible',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-hud-visible', fields: { ID: 'set_hud_metric_visible' } } },
										ARG0: { block: { type: 'ast_Str', id: 'metric-score', fields: { TEXT: 'score' } } },
										ARG1: { block: { type: 'ast_Constant', id: 'bool-false', fields: { BOOL: 'FALSE' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Expr',
						id: 'expr-speed',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-speed',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-speed', fields: { ID: 'set_game_speed' } } },
										ARG0: { block: { type: 'ast_Num', id: 'speed-num', fields: { NUM: '12' } } },
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const roots = converted?.blocks?.blocks || []

		expect(roots[0]?.type).toBe('game_set_hud_metric_visible')
		expect(roots[0]?.fields?.METRIC).toBe('score')
		expect(roots[0]?.fields?.VISIBLE).toBe('FALSE')
		expect(roots[1]?.type).toBe('game_set_speed')
		expect(roots[1]?.inputs?.RATE?.shadow?.fields?.NUM).toBe('12')
	})

	it('normalizes additional AST game expression families before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Assign',
						id: 'assign-x',
						inputs: {
							TARGET: { block: { type: 'ast_Name', id: 'target-x', fields: { ID: 'px' } } },
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-get-x',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-get-x', fields: { ID: 'get_sprite_x' } } },
										ARG0: { block: { type: 'ast_Str', id: 'name-player', fields: { TEXT: 'player' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Assign',
						id: 'assign-collide',
						inputs: {
							TARGET: { block: { type: 'ast_Name', id: 'target-hit', fields: { ID: 'hit' } } },
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-collide',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-collide', fields: { ID: 'sprites_colliding' } } },
										ARG0: { block: { type: 'ast_Str', id: 'collide-a', fields: { TEXT: 'player' } } },
										ARG1: { block: { type: 'ast_Str', id: 'collide-b', fields: { TEXT: 'enemy' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Assign',
						id: 'assign-random-x',
						inputs: {
							TARGET: { block: { type: 'ast_Name', id: 'target-rx', fields: { ID: 'rx' } } },
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-random-x',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-random-x', fields: { ID: 'random_x' } } },
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const roots = converted?.blocks?.blocks || []

		expect(roots[0]?.inputs?.VALUE?.block?.type).toBe('game_get_x')
		expect(roots[0]?.inputs?.VALUE?.block?.fields?.NAME).toBe('player')
		expect(roots[1]?.inputs?.VALUE?.block?.type).toBe('game_colliding')
		expect(roots[1]?.inputs?.VALUE?.block?.fields?.A).toBe('player')
		expect(roots[1]?.inputs?.VALUE?.block?.fields?.B).toBe('enemy')
		expect(roots[2]?.inputs?.VALUE?.block?.type).toBe('game_random_x')
	})

	it('normalizes chained ast_BoolOp roots into nested logic_operation blocks before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_BoolOp',
						id: 'boolop-chain',
						fields: { OP: 'And' },
						inputs: {
							VALUE0: { block: { type: 'ast_Constant', id: 'bool-a', fields: { BOOL: 'TRUE' } } },
							VALUE1: { block: { type: 'ast_Constant', id: 'bool-b', fields: { BOOL: 'FALSE' } } },
							VALUE2: { block: { type: 'ast_Constant', id: 'bool-c', fields: { BOOL: 'TRUE' } } },
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const root = converted?.blocks?.blocks?.[0]

		expect(root?.type).toBe('logic_operation')
		expect(root?.fields?.OP).toBe('AND')
		expect(root?.inputs?.A?.block?.type).toBe('logic_operation')
		expect(root?.inputs?.A?.block?.fields?.OP).toBe('AND')
		expect(root?.inputs?.A?.block?.inputs?.A?.shadow?.type).toBe('logic_boolean')
		expect(root?.inputs?.A?.block?.inputs?.B?.shadow?.type).toBe('logic_boolean')
		expect(root?.inputs?.B?.shadow?.type).toBe('logic_boolean')
	})

	it('normalizes ast_IfExp roots into logic_ternary blocks before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Assign',
						id: 'assign-ternary',
						inputs: {
							TARGET: { block: { type: 'ast_Name', id: 'target-result', fields: { ID: 'result' } } },
							VALUE: {
								block: {
									type: 'ast_IfExp',
									id: 'ifexp-1',
									inputs: {
										TEST: {
											block: {
												type: 'ast_Call',
												id: 'call-paused',
												inputs: {
													FUNC: { block: { type: 'ast_Name', id: 'fn-paused', fields: { ID: 'is_game_paused' } } },
												},
											},
										},
										BODY: { block: { type: 'ast_Num', id: 'then-num', fields: { NUM: '1' } } },
										ORELSE: { block: { type: 'ast_Num', id: 'else-num', fields: { NUM: '0' } } },
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const root = converted?.blocks?.blocks?.[0]

		expect(root?.type).toBe('variables_set')
		expect(root?.fields?.VAR?.name).toBe('result')
		expect(root?.inputs?.VALUE?.block?.type).toBe('logic_ternary')
		expect(root?.inputs?.VALUE?.block?.inputs?.IF?.block?.type).toBe('game_is_paused')
		expect(root?.inputs?.VALUE?.block?.inputs?.THEN?.shadow?.fields?.NUM).toBe('1')
		expect(root?.inputs?.VALUE?.block?.inputs?.ELSE?.shadow?.fields?.NUM).toBe('0')
	})

	it('normalizes chained ast_Compare roots into AND-linked logic_compare blocks before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Compare',
						id: 'compare-chain',
						fields: { OPS0: 'Lt', OPS1: 'Lt' },
						inputs: {
							LEFT: { block: { type: 'ast_Num', id: 'compare-zero', fields: { NUM: '0' } } },
							COMPARATORS0: { block: { type: 'ast_Name', id: 'compare-x', fields: { ID: 'x' } } },
							COMPARATORS1: { block: { type: 'ast_Num', id: 'compare-ten', fields: { NUM: '10' } } },
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const root = converted?.blocks?.blocks?.[0]

		expect(root?.type).toBe('logic_operation')
		expect(root?.fields?.OP).toBe('AND')
		expect(root?.inputs?.A?.block?.type).toBe('logic_compare')
		expect(root?.inputs?.A?.block?.fields?.OP).toBe('LT')
		expect(root?.inputs?.A?.block?.inputs?.A?.shadow?.fields?.NUM).toBe('0')
		expect(root?.inputs?.A?.block?.inputs?.B?.shadow?.type).toBe('variables_get')
		expect(root?.inputs?.B?.block?.type).toBe('logic_compare')
		expect(root?.inputs?.B?.block?.fields?.OP).toBe('LT')
		expect(root?.inputs?.B?.block?.inputs?.A?.shadow?.type).toBe('variables_get')
		expect(root?.inputs?.B?.block?.inputs?.B?.shadow?.fields?.NUM).toBe('10')
	})

	it('normalizes ast_List literals and ast_Subscript reads before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Assign',
						id: 'assign-list',
						inputs: {
							TARGET: { block: { type: 'ast_Name', id: 'target-cells', fields: { ID: 'cells' } } },
							VALUE: {
								block: {
									type: 'ast_List',
									id: 'list-1',
									inputs: {
										ELT0: { block: { type: 'ast_Num', id: 'elt-0', fields: { NUM: '1' } } },
										ELT1: { block: { type: 'ast_Num', id: 'elt-1', fields: { NUM: '2' } } },
										ELT2: { block: { type: 'ast_Num', id: 'elt-2', fields: { NUM: '3' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Assign',
						id: 'assign-item',
						inputs: {
							TARGET: { block: { type: 'ast_Name', id: 'target-item', fields: { ID: 'item' } } },
							VALUE: {
								block: {
									type: 'ast_Subscript',
									id: 'subscript-1',
									inputs: {
										VALUE: { block: { type: 'ast_Name', id: 'subscript-list', fields: { ID: 'cells' } } },
										SLICE: { block: { type: 'ast_Num', id: 'subscript-index', fields: { NUM: '0' } } },
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const roots = converted?.blocks?.blocks || []

		expect(roots[0]?.type).toBe('variables_set')
		expect(roots[0]?.fields?.VAR?.name).toBe('cells')
		expect(roots[0]?.inputs?.VALUE?.block?.type).toBe('lists_create_with')
		expect(roots[0]?.inputs?.VALUE?.block?.extraState?.itemCount).toBe(3)
		expect(roots[0]?.inputs?.VALUE?.block?.inputs?.ADD0?.shadow?.fields?.NUM).toBe('1')
		expect(roots[0]?.inputs?.VALUE?.block?.inputs?.ADD2?.shadow?.fields?.NUM).toBe('3')

		expect(roots[1]?.type).toBe('variables_set')
		expect(roots[1]?.fields?.VAR?.name).toBe('item')
		expect(roots[1]?.inputs?.VALUE?.block?.type).toBe('lists_getIndex')
		expect(roots[1]?.inputs?.VALUE?.block?.fields?.MODE).toBe('GET')
		expect(roots[1]?.inputs?.VALUE?.block?.fields?.WHERE).toBe('FROM_START')
		expect(roots[1]?.inputs?.VALUE?.block?.inputs?.VALUE?.shadow?.type).toBe('variables_get')
		expect(roots[1]?.inputs?.VALUE?.block?.inputs?.AT?.block?.type).toBe('math_arithmetic')
		expect(roots[1]?.inputs?.VALUE?.block?.inputs?.AT?.block?.fields?.OP).toBe('ADD')
		expect(roots[1]?.inputs?.VALUE?.block?.inputs?.AT?.block?.inputs?.B?.shadow?.fields?.NUM).toBe('1')
	})



	it('normalizes ast_Subscript writes and list append/pop mutation before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Assign',
						id: 'assign-subscript-write',
						inputs: {
							TARGET: {
								block: {
									type: 'ast_Subscript',
									id: 'target-subscript',
									inputs: {
										VALUE: { block: { type: 'ast_Name', id: 'target-list', fields: { ID: 'cells' } } },
										SLICE: { block: { type: 'ast_Name', id: 'target-index', fields: { ID: 'i' } } },
									},
								},
							},
							VALUE: { block: { type: 'ast_Num', id: 'write-num', fields: { NUM: '9' } } },
						},
					},
					{
						type: 'ast_Expr',
						id: 'expr-append',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-append',
									inputs: {
										FUNC: {
											block: {
												type: 'ast_Attribute',
												id: 'attr-append',
												fields: { ATTR: 'append' },
												inputs: {
													VALUE: { block: { type: 'ast_Name', id: 'append-list', fields: { ID: 'cells' } } },
												},
											},
										},
										ARG0: { block: { type: 'ast_Num', id: 'append-num', fields: { NUM: '4' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Assign',
						id: 'assign-pop',
						inputs: {
							TARGET: { block: { type: 'ast_Name', id: 'pop-target', fields: { ID: 'removed' } } },
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-pop',
									inputs: {
										FUNC: {
											block: {
												type: 'ast_Attribute',
												id: 'attr-pop',
												fields: { ATTR: 'pop' },
												inputs: {
													VALUE: { block: { type: 'ast_Name', id: 'pop-list', fields: { ID: 'cells' } } },
												},
											},
										},
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const roots = converted?.blocks?.blocks || []

		expect(roots[0]?.type).toBe('lists_setIndex')
		expect(roots[0]?.fields?.MODE).toBe('SET')
		expect(roots[0]?.fields?.WHERE).toBe('FROM_START')
		expect(roots[0]?.inputs?.LIST?.shadow?.type).toBe('variables_get')
		expect(roots[0]?.inputs?.AT?.block?.type).toBe('math_arithmetic')
		expect(roots[0]?.inputs?.TO?.shadow?.fields?.NUM).toBe('9')

		expect(roots[1]?.type).toBe('lists_setIndex')
		expect(roots[1]?.fields?.MODE).toBe('INSERT')
		expect(roots[1]?.fields?.WHERE).toBe('LAST')
		expect(roots[1]?.inputs?.LIST?.shadow?.type).toBe('variables_get')
		expect(roots[1]?.inputs?.TO?.shadow?.fields?.NUM).toBe('4')

		expect(roots[2]?.type).toBe('variables_set')
		expect(roots[2]?.fields?.VAR?.name).toBe('removed')
		expect(roots[2]?.inputs?.VALUE?.block?.type).toBe('lists_getIndex')
		expect(roots[2]?.inputs?.VALUE?.block?.fields?.MODE).toBe('GET_REMOVE')
		expect(roots[2]?.inputs?.VALUE?.block?.fields?.WHERE).toBe('LAST')
	})

	it('normalizes len(list) calls and indexed augassign mutation before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Assign',
						id: 'assign-len',
						inputs: {
							TARGET: { block: { type: 'ast_Name', id: 'target-count', fields: { ID: 'count' } } },
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-len',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-len', fields: { ID: 'len' } } },
										ARG0: { block: { type: 'ast_Name', id: 'len-list', fields: { ID: 'cells' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_AugAssign',
						id: 'augassign-subscript',
						fields: { OP: 'Add' },
						inputs: {
							TARGET: {
								block: {
									type: 'ast_Subscript',
									id: 'aug-target-subscript',
									inputs: {
										VALUE: { block: { type: 'ast_Name', id: 'aug-list', fields: { ID: 'cells' } } },
										SLICE: { block: { type: 'ast_Name', id: 'aug-index', fields: { ID: 'i' } } },
									},
								},
							},
							VALUE: { block: { type: 'ast_Num', id: 'aug-num', fields: { NUM: '1' } } },
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const roots = converted?.blocks?.blocks || []

		expect(roots[0]?.type).toBe('variables_set')
		expect(roots[0]?.fields?.VAR?.name).toBe('count')
		expect(roots[0]?.inputs?.VALUE?.block?.type).toBe('lists_length')
		expect(roots[0]?.inputs?.VALUE?.block?.inputs?.VALUE?.shadow?.type).toBe('variables_get')

		expect(roots[1]?.type).toBe('lists_setIndex')
		expect(roots[1]?.fields?.MODE).toBe('SET')
		expect(roots[1]?.fields?.WHERE).toBe('FROM_START')
		expect(roots[1]?.inputs?.AT?.block?.type).toBe('math_arithmetic')
		expect(roots[1]?.inputs?.TO?.block?.type).toBe('math_arithmetic')
		expect(roots[1]?.inputs?.TO?.block?.fields?.OP).toBe('ADD')
		expect(roots[1]?.inputs?.TO?.block?.inputs?.A?.block?.type).toBe('lists_getIndex')
		expect(roots[1]?.inputs?.TO?.block?.inputs?.B?.shadow?.fields?.NUM).toBe('1')
	})

	it('normalizes broader AST game statement families before merge', () => {
		const astWorkspace = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'ast_Expr',
						id: 'expr-spawn',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-spawn',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-spawn', fields: { ID: 'spawn_sprite' } } },
										ARG0: { block: { type: 'ast_Str', id: 'base-bullet', fields: { TEXT: 'bullet' } } },
										ARG1: { block: { type: 'ast_Num', id: 'spawn-x', fields: { NUM: '2' } } },
										ARG2: { block: { type: 'ast_Num', id: 'spawn-y', fields: { NUM: '3' } } },
										ARG3: { block: { type: 'ast_Str', id: 'spawn-group', fields: { TEXT: 'bullets' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Expr',
						id: 'expr-scale',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-scale',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-scale', fields: { ID: 'set_sprite_scale' } } },
										ARG0: { block: { type: 'ast_Str', id: 'scale-name', fields: { TEXT: 'player' } } },
										ARG1: { block: { type: 'ast_Num', id: 'scale-x', fields: { NUM: '2' } } },
										ARG2: { block: { type: 'ast_Num', id: 'scale-y', fields: { NUM: '1' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Expr',
						id: 'expr-collision-layer',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-layer',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-layer', fields: { ID: 'set_collision_layer' } } },
										ARG0: { block: { type: 'ast_Str', id: 'layer-name', fields: { TEXT: 'player' } } },
										ARG1: { block: { type: 'ast_Str', id: 'layer-value', fields: { TEXT: 'heroes' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Expr',
						id: 'expr-overlay',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-overlay',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-overlay', fields: { ID: 'show_score_overlay' } } },
										ARG0: { block: { type: 'ast_Constant', id: 'overlay-bool', fields: { BOOL: 'TRUE' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Expr',
						id: 'expr-scene',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-scene',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-scene', fields: { ID: 'load_scene' } } },
										ARG0: { block: { type: 'ast_Str', id: 'scene-name', fields: { TEXT: 'level2' } } },
									},
								},
							},
						},
					},
					{
						type: 'ast_Expr',
						id: 'expr-random-seed',
						inputs: {
							VALUE: {
								block: {
									type: 'ast_Call',
									id: 'call-random-seed',
									inputs: {
										FUNC: { block: { type: 'ast_Name', id: 'fn-random-seed', fields: { ID: 'set_random_seed' } } },
										ARG0: { block: { type: 'ast_Num', id: 'seed-num', fields: { NUM: '42' } } },
									},
								},
							},
						},
					},
				],
			},
		}

		const converted = convertPythonToBlockly(astWorkspace, '')
		const types = topTypes(converted)

		expect(types).toContain('game_spawn_sprite')
		expect(types).toContain('game_set_scale')
		expect(types).toContain('game_set_collision_layer')
		expect(types).toContain('game_set_score_overlay_visible')
		expect(types).toContain('game_load_scene')
		expect(types).toContain('game_set_random_seed')
	})

})
