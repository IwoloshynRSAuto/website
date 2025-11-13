import { roundToNearest15Minutes, roundTimeString, calculateHoursBetween } from '../time-rounding'

describe('Time Rounding Utilities', () => {
  describe('roundToNearest15Minutes', () => {
    it('should round 8:05 to 8:00', () => {
      const date = new Date('2024-01-01T08:05:00')
      const rounded = roundToNearest15Minutes(date)
      expect(rounded.getHours()).toBe(8)
      expect(rounded.getMinutes()).toBe(0)
    })

    it('should round 8:23 to 8:30', () => {
      const date = new Date('2024-01-01T08:23:00')
      const rounded = roundToNearest15Minutes(date)
      expect(rounded.getHours()).toBe(8)
      expect(rounded.getMinutes()).toBe(30)
    })

    it('should round 8:38 to 8:30', () => {
      const date = new Date('2024-01-01T08:38:00')
      const rounded = roundToNearest15Minutes(date)
      expect(rounded.getHours()).toBe(8)
      expect(rounded.getMinutes()).toBe(30)
    })

    it('should round 8:46 to 8:45', () => {
      const date = new Date('2024-01-01T08:46:00')
      const rounded = roundToNearest15Minutes(date)
      expect(rounded.getHours()).toBe(8)
      expect(rounded.getMinutes()).toBe(45)
    })

    it('should zero out seconds and milliseconds', () => {
      const date = new Date('2024-01-01T08:23:45.123')
      const rounded = roundToNearest15Minutes(date)
      expect(rounded.getSeconds()).toBe(0)
      expect(rounded.getMilliseconds()).toBe(0)
    })
  })

  describe('roundTimeString', () => {
    it('should round time string correctly', () => {
      expect(roundTimeString('08:05')).toBe('08:00')
      expect(roundTimeString('08:23')).toBe('08:30')
      expect(roundTimeString('08:38')).toBe('08:30')
      expect(roundTimeString('08:46')).toBe('08:45')
    })

    it('should handle hour rollover', () => {
      expect(roundTimeString('08:58')).toBe('09:00')
    })
  })

  describe('calculateHoursBetween', () => {
    it('should calculate hours between two times', () => {
      const start = new Date('2024-01-01T08:00:00')
      const end = new Date('2024-01-01T12:00:00')
      const hours = calculateHoursBetween(start, end)
      expect(hours).toBe(4)
    })

    it('should round to nearest 15 minutes', () => {
      const start = new Date('2024-01-01T08:00:00')
      const end = new Date('2024-01-01T12:17:00') // 4h 17m = 4.25h rounded
      const hours = calculateHoursBetween(start, end)
      expect(hours).toBe(4.25)
    })
  })
})







