import { computeTimeEntryCostsPlain } from '@/lib/timekeeping/time-entry-cost'

describe('computeTimeEntryCostsPlain', () => {
  it('applies OT multiplier to overtime hours (1.5 setting → 1.5× base per OT hour)', () => {
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

  it('matches two 1h-reg + 1h-OT lines at 1.5 setting (250 each → 500 total)', () => {
    const line = () =>
      computeTimeEntryCostsPlain({
        regularHours: 1,
        overtimeHours: 1,
        baseRate: 100,
        otMultiplier: 1.5,
      })
    const a = line()
    const b = line()
    expect(a.totalCost + b.totalCost).toBe(500)
    expect(a.totalCost).toBe(250)
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
