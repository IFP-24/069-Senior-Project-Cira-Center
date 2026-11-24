import { describe, expect, it } from 'vitest'

import {
	analyzeRoundTripReadiness,
	analyzePythonLearningStage,
	BLOCK_ROUNDTRIP_GUIDE,
	detectPythonCompatibilityIssues,
	getBlockingPythonCompatibilityIssues,
	getPythonRuntimeBlockingIssues,
	PYTHON_COMPATIBILITY_GUIDE,
	ROUNDTRIP_MUST_GUARANTEES,
	ROUNDTRIP_SUPPORT_LEVELS,
} from '../editorEnhancements.js'

describe('detectPythonCompatibilityIssues', () => {
	it('returns line, reason, and suggestion for reduced-fidelity imports', () => {
		const code = [
			'move_by("hero", 1, 1)',
			'set_sprite_color("hero", player_color)',
			'set_random_seed("seed")',
			'respawn_sprite_safe("coin", away_from="player", min_distance=2)',
			'unsupported_call("x")',
		].join('\n')

		const findings = detectPythonCompatibilityIssues(code)
		expect(findings.length).toBeGreaterThanOrEqual(4)

		for (const finding of findings) {
			expect(finding.line).toBeTypeOf('number')
			expect(finding.reason || finding.message).toBeTruthy()
			expect(finding.suggestion).toBeTruthy()
			expect(finding.severity).toBe('error')
		}
	})

	it('flags parameterized helpers, returns, and imports as Python-only patterns', () => {
		const code = [
			'def hit_enemy(name):',
			'    return name',
			'import math',
			'print("debug")',
			'grid = {"x": 1}',
			'next_x = cells[0][0]',
			'hit_enemy("boss")',
		].join('\n')

		const findings = detectPythonCompatibilityIssues(code)
		const reasons = findings.map(finding => finding.reason || finding.message)

		expect(reasons.some(reason => reason.includes('zero-argument helper functions'))).toBe(true)
		expect(reasons.some(reason => reason.includes('Helper return values'))).toBe(true)
		expect(reasons.some(reason => reason.includes('not external modules'))).toBe(true)
		expect(reasons.some(reason => reason.includes('print() is not mapped'))).toBe(true)
		expect(reasons.some(reason => reason.includes('Dictionaries, tuples, and nested collection-heavy state'))).toBe(true)
		expect(reasons.some(reason => reason.includes('Only simple one-dimensional list reads and writes'))).toBe(true)
		expect(reasons.some(reason => reason.includes('helper functions with parameters'))).toBe(true)
	})

	it('treats set_pixel as a supported beginner API when color is literal', () => {
		const code = [
			'set_pixel(3, 4, "#ffd54f")',
			'setPixel(5, 6, "off")',
		].join('\n')

		const findings = detectPythonCompatibilityIssues(code)

		expect(findings).toHaveLength(0)
	})

	it('returns blocking compatibility issues for conversion guards', () => {
		const findings = detectPythonCompatibilityIssues('import math\nprint("debug")')
		const blocking = getBlockingPythonCompatibilityIssues(findings)

		expect(blocking).toHaveLength(findings.length)
		expect(blocking.every(finding => finding.severity === 'error')).toBe(true)
	})

	it('treats only imports and outside-library patterns as runtime blockers', () => {
		const findings = detectPythonCompatibilityIssues('import math\nprint("debug")\nunknown_call()')
		const runtimeBlocking = getPythonRuntimeBlockingIssues(findings)

		expect(runtimeBlocking).toHaveLength(1)
		expect(runtimeBlocking[0].reason || runtimeBlocking[0].message).toContain('not external modules')
	})
})

describe('analyzePythonLearningStage', () => {
	it('classifies simple event-driven code as beginner', () => {
		const code = [
			'create_sprite("player", 1, 1)',
			'def on_frame():',
			'    if key_is_pressed("right"):',
			'        move_by("player", 1, 0)',
			'register_frame_handler(on_frame)',
		].join('\n')

		const analysis = analyzePythonLearningStage(code)

		expect(analysis.stage.id).toBe('beginner')
		expect(analysis.isBlockSafe).toBe(true)
	})

	it('classifies loops and timers as intermediate', () => {
		const code = [
			'def add_bonus():',
			'    for i in range(3):',
			'        change_score(i)',
			'register_every_ticks(10, add_bonus)',
		].join('\n')

		const analysis = analyzePythonLearningStage(code)

		expect(analysis.stage.id).toBe('intermediate')
		expect(analysis.matchedSignals).toContain('for range loops')
		expect(analysis.matchedSignals).toContain('timed events')
		expect(analysis.isBlockSafe).toBe(true)
	})

	it('classifies simple list/indexing patterns as supported intermediate code', () => {
		const code = [
			'cells = [1, 2, 3]',
			'value = cells[0]',
			'set_score(value)',
		].join('\n')

		const analysis = analyzePythonLearningStage(code)

		expect(analysis.stage.id).toBe('intermediate')
		expect(analysis.isBlockSafe).toBe(true)
		expect(analysis.blockingFindings.length).toBe(0)
	})



	it('treats simple list mutation as supported intermediate code', () => {
		const code = [
			'cells = [1, 2, 3]',
			'cells[i] = 4',
			'cells[i] += 1',
			'cells.append(5)',
			'last_item = cells.pop()',
			'count = len(cells)',
		].join('\n')

		const findings = detectPythonCompatibilityIssues(code)
		const analysis = analyzePythonLearningStage(code, findings)

		expect(findings).toHaveLength(0)
		expect(analysis.stage.id).toBe('intermediate')
		expect(analysis.isBlockSafe).toBe(true)
	})

	it('classifies imports as outside current Python scope', () => {
		const code = [
			'import math',
			'set_score(1)',
		].join('\n')

		const analysis = analyzePythonLearningStage(code)

		expect(analysis.stage.id).toBe('unsupported-runtime')
		expect(analysis.isBlockSafe).toBe(false)
	})
})

describe('analyzeRoundTripReadiness', () => {
	it('marks block-generated beginner Python as round-trip safe', () => {
		const code = [
			'create_sprite("player", 1, 1)',
			'def on_left_pressed():',
			'    move_by("player", -1, 0)',
			'register_key_handler("left", on_left_pressed)',
		].join('\n')

		const analysis = analyzeRoundTripReadiness({ source: 'blocks', pythonCode: code })

		expect(analysis.isRoundTripSafe).toBe(true)
		expect(analysis.directionLabel).toBe('Blocks ⇄ Python')
		expect(analysis.summary).toContain('dependable Blocks ⇄ Python')
	})

	it('marks Python-only advanced code as not round-trip safe', () => {
		const code = [
			'import math',
			'set_score(1)',
		].join('\n')

		const analysis = analyzeRoundTripReadiness({ source: 'python', pythonCode: code })

		expect(analysis.isRoundTripSafe).toBe(false)
		expect(analysis.directionLabel).toBe('Python ⇄ Blocks')
		expect(analysis.blockingFindings.length).toBeGreaterThan(0)
		expect(analysis.summary).toContain('may not round-trip cleanly')
	})
})

describe('PYTHON_COMPATIBILITY_GUIDE', () => {
	it('documents concrete compatible-writing rules and starter patterns', () => {
		expect(PYTHON_COMPATIBILITY_GUIDE.writePythonThisWay.length).toBeGreaterThanOrEqual(6)
		expect(PYTHON_COMPATIBILITY_GUIDE.roundTripChecklist.length).toBeGreaterThanOrEqual(4)
		expect(PYTHON_COMPATIBILITY_GUIDE.compatibleTemplate).toContain('register_key_handler')
		expect(PYTHON_COMPATIBILITY_GUIDE.compatibleTemplate).toContain('register_frame_handler')
		expect(PYTHON_COMPATIBILITY_GUIDE.supportedApiFamilies.length).toBeGreaterThanOrEqual(4)
		expect(PYTHON_COMPATIBILITY_GUIDE.supportedApiFamilies.some(family => family.title.includes('Events'))).toBe(true)
	})

	it('documents the beginner, intermediate, and advanced learning levels by code structure', () => {
		expect(PYTHON_COMPATIBILITY_GUIDE.learningPath[0].title).toBe('Stage 1 · Beginner')
		expect(PYTHON_COMPATIBILITY_GUIDE.learningPath[1].title).toBe('Stage 2 · Intermediate')
		expect(PYTHON_COMPATIBILITY_GUIDE.learningPath[2].title).toBe('Stage 3 · Advanced')

		expect(PYTHON_COMPATIBILITY_GUIDE.learningPath[0].concepts).toEqual(
			expect.arrayContaining(['flat variables', 'direct event handlers', 'simple if / else', 'simple movement and collisions']),
		)
		expect(PYTHON_COMPATIBILITY_GUIDE.learningPath[1].concepts).toEqual(
			expect.arrayContaining(['loops', 'for range loops', 'boolean logic', 'zero-argument helpers', 'timed events', 'simple one-dimensional list reads/writes', 'modest stateful games']),
		)
		expect(PYTHON_COMPATIBILITY_GUIDE.learningPath[2].concepts).toEqual(
			expect.arrayContaining(['parameterized helpers', 'return values', 'board/grid logic', 'multiple interacting systems', 'reusable abstractions', 'dynamic data/state models']),
		)
	})
})

describe('ROUNDTRIP_MUST_GUARANTEES', () => {
	it('documents the round-trip guarantees explicitly', () => {
		expect(ROUNDTRIP_MUST_GUARANTEES.title).toBe('Must Guarantee')
		expect(ROUNDTRIP_MUST_GUARANTEES.items).toEqual(
			expect.arrayContaining([
				expect.stringContaining('Blocks -> Python -> Blocks'),
				expect.stringContaining('Python -> Blocks -> Python'),
				expect.stringContaining('if / else'),
				expect.stringContaining('for range(...)'),
				expect.stringContaining('while'),
				expect.stringContaining('key-up handlers'),
				expect.stringContaining('Unsupported Python does not partially convert silently'),
				expect.stringContaining('ast_*'),
			]),
		)
	})
})

describe('ROUNDTRIP_SUPPORT_LEVELS', () => {
	it('distinguishes guaranteed, evolving, and unsupported runtime boundaries', () => {
		expect(ROUNDTRIP_SUPPORT_LEVELS).toHaveLength(3)
		expect(ROUNDTRIP_SUPPORT_LEVELS.map(level => level.title)).toEqual([
			'Guaranteed round-trip subset',
			'Supported but still evolving',
			'Not supported in this Python environment',
		])
		expect(ROUNDTRIP_SUPPORT_LEVELS[0].examples).toEqual(
			expect.arrayContaining([
				expect.stringContaining('simple one-dimensional lists'),
				expect.stringContaining('key, key-up, frame, collision, and timed handlers'),
			]),
		)
		expect(ROUNDTRIP_SUPPORT_LEVELS[2].examples).toEqual(
			expect.arrayContaining([expect.stringContaining('outside libraries')]),
		)
	})
})

describe('BLOCK_ROUNDTRIP_GUIDE', () => {
	it('documents concrete block-first round-trip guidance', () => {
		expect(BLOCK_ROUNDTRIP_GUIDE.buildBlocksThisWay.length).toBeGreaterThanOrEqual(5)
		expect(BLOCK_ROUNDTRIP_GUIDE.roundTripChecklist.length).toBeGreaterThanOrEqual(4)
		expect(BLOCK_ROUNDTRIP_GUIDE.starterPatternSteps.length).toBeGreaterThanOrEqual(4)
		expect(BLOCK_ROUNDTRIP_GUIDE.supportedBlockFamilies.length).toBeGreaterThanOrEqual(4)
		expect(BLOCK_ROUNDTRIP_GUIDE.supportedBlockFamilies.some(family => family.title.includes('Game events'))).toBe(true)
	})
})
