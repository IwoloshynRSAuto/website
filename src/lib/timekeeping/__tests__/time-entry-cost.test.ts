import { computeTimeEntryCostsPlain } from '@/lib/timekeeping/time-entry-cost'

describe('computeTimeEntryCostsPlain', () => {
  it('applies multiplier only to overtime hours', () => {
    expect(
      computeTimeEntryCostsPlain({
        regularHours: 8,
        overtimeHours: 2,
        baseRate: 100,
        otMultiplier: 1.5,
      })
    ).toEqual({
      regularCost: 800,
      otCost: 300,
      totalCost: 1100,
    })
  })

  it('clamps negative inputs to zero', () => {
    expect(
      computeTimeEntryCostsPlain({
        regularHours: -1,
        overtimeHours: -2,
        baseRate: 50,
        otMultiplier: 2,
      })
    ).toEqual({
      regularCost: 0,
      otCost: 0,
      totalCost: 0,
    })
  })
})
