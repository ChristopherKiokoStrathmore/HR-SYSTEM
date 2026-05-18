import type { PayrollCalculationInput, PayrollCalculationResult } from '../types/api'

/**
 * Kenya statutory deductions as of 2024.
 * PAYE uses the progressive tax bands from KRA.
 * NSSF uses the new NSSF Act 2013 (Tier I + Tier II).
 * NHIF uses the income-based contribution bands.
 */

const NSSF_LOWER_LIMIT = 6_000
const NSSF_UPPER_LIMIT = 18_000
const NSSF_TIER1_RATE = 0.06
const NSSF_TIER2_RATE = 0.06

function calculateNSSF(gross: number): number {
  const tier1 = Math.min(gross, NSSF_LOWER_LIMIT) * NSSF_TIER1_RATE
  const tier2Gross = Math.max(0, Math.min(gross, NSSF_UPPER_LIMIT) - NSSF_LOWER_LIMIT)
  const tier2 = tier2Gross * NSSF_TIER2_RATE
  return Math.round(tier1 + tier2)
}

function calculateNHIF(gross: number): number {
  if (gross < 6_000) return 150
  if (gross < 8_000) return 300
  if (gross < 12_000) return 400
  if (gross < 15_000) return 500
  if (gross < 20_000) return 600
  if (gross < 25_000) return 750
  if (gross < 30_000) return 850
  if (gross < 35_000) return 900
  if (gross < 40_000) return 950
  if (gross < 45_000) return 1_000
  if (gross < 50_000) return 1_100
  if (gross < 60_000) return 1_200
  if (gross < 70_000) return 1_300
  if (gross < 80_000) return 1_400
  if (gross < 90_000) return 1_500
  if (gross < 100_000) return 1_600
  return 1_700
}

function calculatePAYE(taxableIncome: number): number {
  // Monthly tax bands 2024
  let tax = 0
  const bands = [
    { limit: 24_000, rate: 0.1 },
    { limit: 8_333, rate: 0.25 },
    { limit: 467_667, rate: 0.3 },
    { limit: Infinity, rate: 0.35 },
  ]
  let remaining = taxableIncome
  for (const band of bands) {
    if (remaining <= 0) break
    const taxable = Math.min(remaining, band.limit)
    tax += taxable * band.rate
    remaining -= taxable
  }
  // Personal relief KES 2,400/month
  tax = Math.max(0, tax - 2_400)
  return Math.round(tax)
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const { gross_salary, helb = 0, other_deductions = 0 } = input

  const nssf = calculateNSSF(gross_salary)
  const nhif = calculateNHIF(gross_salary)
  const taxableIncome = gross_salary - nssf
  const paye = calculatePAYE(taxableIncome)

  const totalDeductions = paye + nssf + nhif + helb + other_deductions
  const netSalary = Math.max(0, gross_salary - totalDeductions)

  return {
    gross_salary,
    paye,
    nssf,
    nhif,
    helb,
    other_deductions,
    net_salary: netSalary,
  }
}
