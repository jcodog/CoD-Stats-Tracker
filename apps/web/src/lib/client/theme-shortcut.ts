export function shouldToggleTheme(
  event: Pick<
    KeyboardEvent,
    | "key"
    | "defaultPrevented"
    | "repeat"
    | "isComposing"
    | "ctrlKey"
    | "altKey"
    | "metaKey"
  >,
  insideKeyboardControl: boolean
) {
  return (
    !insideKeyboardControl &&
    !event.defaultPrevented &&
    !event.repeat &&
    !event.isComposing &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    event.key.toLowerCase() === "d"
  )
}
