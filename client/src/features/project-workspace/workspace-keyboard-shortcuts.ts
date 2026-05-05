type ShortcutKeyboardEvent = {
  defaultPrevented?: boolean;
  isComposing?: boolean;
  target: EventTarget | null;
};

type ClosestKeyboardTarget = EventTarget & {
  closest: (selector: string) => Element | null;
};

const workspaceShortcutBlockedTargetSelector = [
  "input",
  "textarea",
  "select",
  "[contenteditable]",
  "[role='dialog']",
  "[role='searchbox']",
  "[role='textbox']",
  "[data-workspace-shortcuts='ignore']"
].join(",");

const spacePanBlockedTargetSelector = [
  workspaceShortcutBlockedTargetSelector,
  "a[href]",
  "button",
  "[role='button']",
  "[role='checkbox']",
  "[role='menuitem']",
  "[role='option']",
  "[role='radio']",
  "[role='slider']",
  "[role='switch']"
].join(",");

export function shouldIgnoreWorkspaceShortcut(event: ShortcutKeyboardEvent) {
  return (
    event.defaultPrevented === true ||
    event.isComposing === true ||
    isWorkspaceShortcutTargetBlocked(event.target)
  );
}

export function isWorkspaceShortcutTargetBlocked(target: EventTarget | null) {
  return hasClosestKeyboardTarget(target, workspaceShortcutBlockedTargetSelector);
}

export function isSpacePanShortcutTargetBlocked(
  target: EventTarget | null,
  scrollContainer: HTMLElement | null
) {
  const closestTarget = getClosestKeyboardTarget(target);

  if (!closestTarget) {
    return false;
  }

  const documentBody = typeof document === "undefined" ? null : document.body;
  const documentElement = typeof document === "undefined" ? null : document.documentElement;

  if (
    scrollContainer &&
    closestTarget !== documentBody &&
    closestTarget !== documentElement &&
    !scrollContainer.contains(closestTarget as unknown as Node)
  ) {
    return true;
  }

  return hasClosestKeyboardTarget(target, spacePanBlockedTargetSelector);
}

function hasClosestKeyboardTarget(target: EventTarget | null, selector: string) {
  return Boolean(getClosestKeyboardTarget(target)?.closest(selector));
}

function getClosestKeyboardTarget(target: EventTarget | null) {
  const maybeElement = target as
    | (EventTarget & { closest?: (selector: string) => Element | null })
    | null;

  return typeof maybeElement?.closest === "function"
    ? (maybeElement as ClosestKeyboardTarget)
    : null;
}
