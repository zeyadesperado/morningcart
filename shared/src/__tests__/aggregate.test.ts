import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { deliverySplit, closeSession, verifyExact } from '../aggregate'
import { CLOSED_SESSION, restaurantById } from '../data'

describe('deliverySplit — exact, fair, integer', () => {
  it('always sums to the fee exactly; shares differ by at most 1 (fuzz)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 600_000 }), fc.integer({ min: 1, max: 80 }), (fee, n) => {
        const s = deliverySplit(fee, n)
        expect(s.length).toBe(n)
        expect(s.reduce((a, b) => a + b, 0)).toBe(fee)
        expect(Math.max(...s) - Math.min(...s)).toBeLessThanOrEqual(1)
        expect(s.every((x) => Number.isInteger(x) && x >= 0)).toBe(true)
      }),
      { numRuns: 3000 },
    )
  })

  it('matches the documented seed cases', () => {
    expect(deliverySplit(3000, 15)).toEqual(Array(15).fill(200))
    expect(deliverySplit(3000, 12)).toEqual(Array(12).fill(250))
    const s14 = deliverySplit(3000, 14)
    expect(s14.filter((x) => x === 215).length).toBe(4)
    expect(s14.filter((x) => x === 214).length).toBe(10)
    expect(s14.reduce((a, b) => a + b, 0)).toBe(3000)
  })

  it('handles n = 1 and fee = 0', () => {
    expect(deliverySplit(3000, 1)).toEqual([3000])
    expect(deliverySplit(0, 5)).toEqual([0, 0, 0, 0, 0])
  })
})

describe('closeSession — per-person totals reconcile exactly', () => {
  const r = restaurantById(CLOSED_SESSION.restaurantId)
  const res = closeSession(CLOSED_SESSION, r)

  it('Σ(per-person totals) === itemsGrandTotal + deliveryFee', () => {
    const sumTotals = res.perPerson.reduce((a, p) => a + p.total, 0)
    expect(sumTotals).toBe(res.itemsGrandTotal + res.deliveryFee)
    expect(sumTotals).toBe(res.grandTotal)
    expect(verifyExact(res)).toBe(true)
  })

  it('delivery shares sum to the fee', () => {
    expect(res.perPerson.reduce((a, p) => a + p.deliveryShare, 0)).toBe(res.deliveryFee)
  })

  it('grandTotal is 21300 piasters (183.00 items + 30.00 delivery)', () => {
    expect(res.itemsGrandTotal).toBe(18_300)
    expect(res.deliveryFee).toBe(3_000)
    expect(res.grandTotal).toBe(21_300)
  })
})

describe('order-on-behalf — items count, delivery heads do not', () => {
  const r = restaurantById(CLOSED_SESSION.restaurantId)
  const res = closeSession(CLOSED_SESSION, r)

  it('denominator is the number of submitters, not fed people', () => {
    expect(res.headcount).toBe(CLOSED_SESSION.orders.length) // 11, even though Omar ordered for Ziad too
  })

  it('the on-behalf line is attributed to the submitter', () => {
    const omar = res.perPerson.find((p) => p.person === 'Omar')!
    expect(omar.forNames).toContain('Ziad')
    // Omar still gets exactly one delivery share like everyone else
    const shares = res.perPerson.map((p) => p.deliveryShare)
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1)
  })
})
