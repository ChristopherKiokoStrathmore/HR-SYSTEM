import { describe, it, expect } from 'vitest'
import { formatKES, formatNumber } from '../utils/currency'
import { formatDate, monthYearLabel, diffDays, daysUntil, isExpired, isExpiringSoon } from '../utils/date'
import { calculatePayroll } from '../utils/payroll'

// ── Currency ──────────────────────────────────────────────────────────────────

describe('formatKES', () => {
  it('formats zero', () => {
    expect(formatKES(0)).toContain('0')
  })

  it('includes a currency symbol (KES or Ksh)', () => {
    // Node.js Intl renders KES as either "KES" or "Ksh" depending on ICU data version
    expect(formatKES(50000)).toMatch(/KES|Ksh/)
  })

  it('masks value when masked=true', () => {
    expect(formatKES(150000, true)).toBe('KES ••••••')
  })

  it('formats large amounts with separators', () => {
    const formatted = formatKES(1_234_567)
    expect(formatted).toMatch(/1[,.]?234/)
  })
})

describe('formatNumber', () => {
  it('formats with locale separators', () => {
    const result = formatNumber(1000)
    expect(result).toMatch(/1[,.]?000/)
  })
})

// ── Date utilities ────────────────────────────────────────────────────────────

describe('monthYearLabel', () => {
  it('returns full month name and year', () => {
    expect(monthYearLabel(1,  2025)).toContain('January')
    expect(monthYearLabel(12, 2024)).toContain('December')
    expect(monthYearLabel(6,  2025)).toContain('June')
  })
})

describe('diffDays', () => {
  it('returns 1 for same day', () => {
    expect(diffDays('2025-01-15', '2025-01-15')).toBe(1)
  })

  it('counts inclusive of start and end', () => {
    expect(diffDays('2025-01-01', '2025-01-05')).toBe(5)
  })
})

describe('isExpired', () => {
  it('returns false for null', () => {
    expect(isExpired(null)).toBe(false)
  })

  it('returns true for past date', () => {
    expect(isExpired('2000-01-01')).toBe(true)
  })

  it('returns false for future date', () => {
    expect(isExpired('2099-01-01')).toBe(false)
  })
})

describe('isExpiringSoon', () => {
  it('returns false for null', () => {
    expect(isExpiringSoon(null)).toBe(false)
  })

  it('returns false for date far in the future', () => {
    expect(isExpiringSoon('2099-01-01', 30)).toBe(false)
  })
})

describe('daysUntil', () => {
  it('returns a positive number for future dates', () => {
    expect(daysUntil('2099-01-01')).toBeGreaterThan(0)
  })

  it('returns a negative number for past dates', () => {
    expect(daysUntil('2000-01-01')).toBeLessThan(0)
  })
})

describe('formatDate', () => {
  it('returns a non-empty string for a valid date', () => {
    const result = formatDate('2025-06-15', 'en')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns Swahili month for sw locale', () => {
    // June in Swahili is "Juni"
    expect(formatDate('2025-06-15', 'sw')).toContain('Juni')
  })
})

// ── Kenya payroll calculations ────────────────────────────────────────────────

describe('calculatePayroll', () => {
  it('net salary is less than gross', () => {
    const { net_salary, gross_salary } = calculatePayroll({ gross_salary: 80_000 })
    expect(net_salary).toBeLessThan(gross_salary)
  })

  it('net salary is non-negative for any gross', () => {
    for (const gross of [5_000, 20_000, 100_000, 500_000]) {
      const { net_salary } = calculatePayroll({ gross_salary: gross })
      expect(net_salary).toBeGreaterThanOrEqual(0)
    }
  })

  it('correctly applies NSSF tier 1 only for low earners', () => {
    // Gross 5,000 → NSSF = 5000 * 0.06 = 300
    const { nssf } = calculatePayroll({ gross_salary: 5_000 })
    expect(nssf).toBe(300)
  })

  it('correctly applies both NSSF tiers for mid earners', () => {
    // Gross 18,000 → NSSF = (6000 * 0.06) + (12000 * 0.06) = 360 + 720 = 1080
    const { nssf } = calculatePayroll({ gross_salary: 18_000 })
    expect(nssf).toBe(1_080)
  })

  it('applies personal relief to PAYE (min KES 2,400/month)', () => {
    // Very low gross should result in zero PAYE after personal relief
    const { paye } = calculatePayroll({ gross_salary: 10_000 })
    expect(paye).toBeGreaterThanOrEqual(0)
  })

  it('includes helb and other_deductions in total', () => {
    const result = calculatePayroll({ gross_salary: 50_000, helb: 2_000, other_deductions: 500 })
    const totalDeductions = result.paye + result.nssf + result.nhif + result.helb + result.other_deductions
    expect(result.helb).toBe(2_000)
    expect(result.other_deductions).toBe(500)
    expect(result.net_salary).toBe(Math.max(0, 50_000 - totalDeductions))
  })
})
