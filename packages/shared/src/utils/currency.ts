export function formatKES(amount: number, masked = false): string {
  if (masked) return 'KES ••••••'
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-KE').format(value)
}
