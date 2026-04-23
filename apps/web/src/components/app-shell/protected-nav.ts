export type ProtectedNavItem = {
  href: string
  label: string
  matchPaths?: string[]
}

export function isProtectedNavItemActive(
  pathname: string,
  item: ProtectedNavItem
) {
  const candidates = item.matchPaths ?? [item.href]

  return candidates.some(
    (candidate) =>
      pathname === candidate || pathname.startsWith(`${candidate}/`)
  )
}
