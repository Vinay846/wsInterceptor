/** Client-side route paths for the interceptor UI */
export const ROUTES = {
  HOME: '/',
  SHORTCUTS: '/shortcuts',
  SHORTCUT_NEW: '/shortcuts/new',
  shortcutEdit: (id: string) => `/shortcuts/${encodeURIComponent(id)}/edit`,
} as const;

export const ROUTE_PATTERNS = {
  SHORTCUT_EDIT: '/shortcuts/:shortcutId/edit',
} as const;
