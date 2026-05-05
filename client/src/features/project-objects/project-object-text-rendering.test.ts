import { getDefaultProjectObjectText } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  getProjectObjectLabelTextStyle,
  getProjectObjectTextFontFamilyCssValue,
  getProjectObjectTextOutline,
  getProjectObjectTextShadow
} from "./project-object-text-rendering";

describe("project object text rendering", () => {
  it("generates font family and readable text effect styles", () => {
    const text = {
      ...getDefaultProjectObjectText("label", "Title"),
      color: "#123456",
      effect: {
        color: "#ffffff",
        mode: "shadow" as const,
        strength: 4
      },
      fontFamily: "serif" as const,
      fontSize: 24
    };

    expect(getProjectObjectTextFontFamilyCssValue("mono")).toContain("monospace");
    expect(getProjectObjectTextShadow(text)).toBe("0 4px 6px #ffffff");
    expect(getProjectObjectTextOutline(text)).toBeUndefined();
    expect(
      getProjectObjectTextOutline({
        ...text,
        effect: { ...text.effect, mode: "outline" }
      })
    ).toBe("4px #ffffff");
    expect(getProjectObjectLabelTextStyle(text)).toMatchObject({
      color: "#123456",
      fontFamily: "Georgia, Cambria, 'Times New Roman', serif",
      fontSize: "24px",
      textShadow: "0 4px 6px #ffffff"
    });
  });
});
