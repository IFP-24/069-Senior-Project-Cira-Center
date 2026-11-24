import { describe, expect, it } from 'vitest'

import { __engineInternals } from '../simEngine.js'

const { normalizeKeyAlias, normalizeSeed, normalizeGroupName, normalizeCollisionMask, normalizeCollisionResponse, spritesOverlap, shouldSpritesCollideByLayer } = __engineInternals

describe('simEngine internals', () => {
	it('normalizes key aliases consistently', () => {
		expect(normalizeKeyAlias('Left')).toBe('ArrowLeft')
		expect(normalizeKeyAlias('arrowright')).toBe('ArrowRight')
		expect(normalizeKeyAlias('Space')).toBe(' ')
		expect(normalizeKeyAlias('spacebar')).toBe(' ')
		expect(normalizeKeyAlias(' ')).toBe(' ')
		expect(normalizeKeyAlias('A')).toBe('a')
		expect(normalizeKeyAlias('W')).toBe('w')
	})

	it('normalizes seed values deterministically', () => {
		expect(normalizeSeed(1234)).toBe(1234)
		expect(normalizeSeed('1234')).toBe(1234)
		expect(normalizeSeed('alpha-seed')).toBe(normalizeSeed('alpha-seed'))
		expect(normalizeSeed('alpha-seed')).not.toBe(normalizeSeed('beta-seed'))
	})

	it('normalizes group names safely', () => {
		expect(normalizeGroupName(' enemies ')).toBe('enemies')
		expect(normalizeGroupName('')).toBe('')
		expect(normalizeGroupName(null)).toBe('')
	})


	it('normalizes collision mask and response helpers', () => {
		expect(normalizeCollisionMask('*')).toEqual(['*'])
		expect(normalizeCollisionMask('enemy,wall')).toEqual(['enemy', 'wall'])
		expect(normalizeCollisionResponse('BOUNCE')).toBe('bounce')
		expect(normalizeCollisionResponse('slide')).toBe('slide')
		expect(normalizeCollisionResponse('unknown')).toBe('none')
	})

	it('evaluates layer/mask collision filtering', () => {
		const a = { collision: { layer: 'player', mask: ['enemy'], enabled: true } }
		const b = { collision: { layer: 'enemy', mask: ['player'], enabled: true } }
		const c = { collision: { layer: 'coin', mask: ['enemy'], enabled: true } }

		expect(shouldSpritesCollideByLayer(a, b)).toBe(true)
		expect(shouldSpritesCollideByLayer(a, c)).toBe(false)
	})
	it('handles larger sprite overlap edge cases', () => {
		const a = { x: 0, y: 0, width: 2, height: 2 }
		const b = { x: 1, y: 1, width: 2, height: 2 }
		const c = { x: 2, y: 2, width: 1, height: 1 }
		const d = { x: 2, y: 0, width: 1, height: 2 }

		expect(spritesOverlap(a, b)).toBe(true)
		expect(spritesOverlap(a, c)).toBe(false)
		expect(spritesOverlap(a, d)).toBe(false)
	})
})
