import { describe, expect, it } from "vitest";
import {
  isSpacePanShortcutTargetBlocked,
  isWorkspaceShortcutTargetBlocked,
  shouldIgnoreWorkspaceShortcut
} from "./workspace-keyboard-shortcuts";

describe("workspace keyboard shortcuts", () => {
  it("ignores workspace shortcuts from text entry and dialog targets", () => {
    expect(isWorkspaceShortcutTargetBlocked(createKeyboardTarget("input"))).toBe(true);
    expect(isWorkspaceShortcutTargetBlocked(createKeyboardTarget("[role='dialog']"))).toBe(true);
    expect(isWorkspaceShortcutTargetBlocked(createKeyboardTarget("canvas"))).toBe(false);
  });

  it("ignores already handled and composing keyboard events", () => {
    expect(
      shouldIgnoreWorkspaceShortcut({
        defaultPrevented: true,
        target: createKeyboardTarget("canvas")
      })
    ).toBe(true);
    expect(
      shouldIgnoreWorkspaceShortcut({
        isComposing: true,
        target: createKeyboardTarget("canvas")
      })
    ).toBe(true);
  });

  it("blocks space panning inside form controls and outside the workspace scroll container", () => {
    const insideTarget = createKeyboardTarget("canvas");
    const outsideTarget = createKeyboardTarget("canvas");
    const scrollContainer = {
      contains: (target: EventTarget) => target === insideTarget
    } as unknown as HTMLElement;

    expect(isSpacePanShortcutTargetBlocked(createKeyboardTarget("button"), scrollContainer)).toBe(
      true
    );
    expect(isSpacePanShortcutTargetBlocked(outsideTarget, scrollContainer)).toBe(true);
    expect(isSpacePanShortcutTargetBlocked(insideTarget, scrollContainer)).toBe(false);
  });
});

function createKeyboardTarget(matchedSelector: string) {
  return {
    closest: (selector: string) =>
      selector.includes(matchedSelector) ? ({} as Element) : null
  } as unknown as EventTarget;
}
