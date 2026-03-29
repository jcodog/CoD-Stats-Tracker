export const MIN_SESSION_SR = 0
export const MAX_SESSION_SR = 20000

export function assertNonNegativeInteger(value: number, fieldLabel: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldLabel} must be a non-negative whole number.`)
  }

  return value
}

export function clampOptionalNonNegativeInteger(
  value: number | null | undefined
) {
  if (value === null || value === undefined) {
    return null
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Optional stat fields must be non-negative integers.")
  }

  return value
}

export function assertStartSr(startSr: number) {
  if (
    !Number.isInteger(startSr) ||
    startSr < MIN_SESSION_SR ||
    startSr > MAX_SESSION_SR
  ) {
    throw new Error(
      `Start SR must be an integer between ${MIN_SESSION_SR} and ${MAX_SESSION_SR}.`
    )
  }

  return startSr
}

export function validateSrChangeAndComputeNextSr(args: {
  currentSr: number
  srChange: number
}) {
  if (
    !Number.isInteger(args.currentSr) ||
    args.currentSr < MIN_SESSION_SR ||
    args.currentSr > MAX_SESSION_SR
  ) {
    throw new Error(
      `Current SR must be an integer between ${MIN_SESSION_SR} and ${MAX_SESSION_SR}.`
    )
  }

  if (!Number.isInteger(args.srChange)) {
    throw new Error("SR change must be a whole number.")
  }

  const nextCurrentSr = args.currentSr + args.srChange

  if (nextCurrentSr < MIN_SESSION_SR || nextCurrentSr > MAX_SESSION_SR) {
    throw new Error(
      `SR change would move current SR outside the ${MIN_SESSION_SR} to ${MAX_SESSION_SR} range.`
    )
  }

  return nextCurrentSr
}
