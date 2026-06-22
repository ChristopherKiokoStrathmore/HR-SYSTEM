/**
 * Dashboard role-based access control — single source of truth.
 *
 * The Django backend already scopes data by the X-User-Role header (forwarded
 * by lib/hr-api.ts), so this layer governs the dashboard UI: which modules a
 * role sees in the nav, which routes it may open, and which actions it may
 * perform. super_admin and company_admin always have full access.
 */

export type AppRole =
  | 'super_admin'
  | 'company_admin'
  | 'hr'
  | 'manager'
  | 'employee'

/** Roles with unconditional access to every module and action. */
export const FULL_ACCESS_ROLES: AppRole[] = ['super_admin', 'company_admin']

/** Roles allowed to switch between / view all companies. */
export const CROSS_COMPANY_ROLES: AppRole[] = ['super_admin', 'company_admin']

/**
 * Collapse any backend role slug (simple or granular RBAC) into one of the
 * five dashboard buckets. Unknown roles fail safe to the least privilege.
 */
export function normalizeRole(role?: string | null): AppRole {
  switch ((role || '').toLowerCase()) {
    case 'super_admin':
      return 'super_admin'
    case 'company_admin':
      return 'company_admin'
    case 'hr':
    case 'hr_admin':
    case 'internal_hr':
    case 'deployed_hr':
      return 'hr'
    case 'manager':
    case 'internal_manager':
    case 'deployed_manager':
      return 'manager'
    case 'employee':
    case 'white_collar_employee':
    case 'blue_collar_employee':
      return 'employee'
    default:
      return 'employee'
  }
}

/**
 * Module → roles that may open it (in addition to FULL_ACCESS_ROLES).
 * Keyed by the route prefix. More specific prefixes (e.g. the geofence
 * sub-route) are matched before their parent.
 */
export const MODULE_ACCESS: Record<string, AppRole[]> = {
  '/': ['hr', 'manager', 'employee'],
  '/recruitment': ['hr'],
  '/background-checks': ['hr'],
  '/onboarding': ['hr'],
  '/employees': ['hr', 'manager'],
  '/attendance/geofence': ['hr'],
  '/attendance': ['hr', 'manager', 'employee'],
  '/performance': ['hr', 'manager', 'employee'],
  '/payroll': ['hr', 'employee'],
  '/leave': ['hr', 'manager', 'employee'],
  '/medical': ['hr', 'employee'],
  '/disciplinary': ['hr', 'manager'],
  '/exits': ['hr'],
  '/certificates': ['hr', 'manager', 'employee'],
  '/reports': ['hr', 'manager'],
  '/settings': [], // FULL_ACCESS_ROLES only
}

/** Paths that never require authorization (still require being logged in). */
const UNGATED_PATHS = ['/forbidden']

/** True if the role may open the given dashboard path. */
export function canAccessPath(role: AppRole, pathname: string): boolean {
  if (FULL_ACCESS_ROLES.includes(role)) return true
  if (UNGATED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true
  }
  if (pathname === '/') return MODULE_ACCESS['/'].includes(role)

  // Longest matching module prefix wins (so /attendance/geofence beats /attendance).
  const match = Object.keys(MODULE_ACCESS)
    .filter((p) => p !== '/' && (pathname === p || pathname.startsWith(p + '/')))
    .sort((a, b) => b.length - a.length)[0]

  if (!match) return false // unknown module → deny for non-admins
  return MODULE_ACCESS[match].includes(role)
}

/**
 * Action capabilities. FULL_ACCESS_ROLES implicitly hold every capability.
 */
export const CAPABILITIES: Record<string, AppRole[]> = {
  'payroll.run': ['hr'],
  'payroll.approve': ['hr'],
  'employee.manage': ['hr'],
  'recruitment.manage': ['hr'],
  'settings.manage': [], // admins only
  'rbac.manage': [], // admins only
}

/** True if the role holds the given capability. */
export function can(role: AppRole, capability: string): boolean {
  if (FULL_ACCESS_ROLES.includes(role)) return true
  return (CAPABILITIES[capability] || []).includes(role)
}

export function canSwitchCompanies(role?: string | null): boolean {
  return CROSS_COMPANY_ROLES.includes(normalizeRole(role))
}

/** Human-readable label for a role (for profile/badge display). */
export function roleLabel(role: AppRole): string {
  return {
    super_admin: 'Super Admin',
    company_admin: 'Company Admin',
    hr: 'HR',
    manager: 'Manager',
    employee: 'Employee',
  }[role]
}
