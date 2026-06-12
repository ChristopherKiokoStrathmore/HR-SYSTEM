export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function generateEmployeeNumber(prefix: string, count: number): string {
  return `${prefix.toUpperCase()}-${String(count).padStart(4, '0')}`
}

export function maskString(str: string, visibleChars = 4): string {
  if (str.length <= visibleChars) return '•'.repeat(str.length)
  return '•'.repeat(str.length - visibleChars) + str.slice(-visibleChars)
}

export function titleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
}
