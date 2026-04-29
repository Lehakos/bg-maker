import type { Locator, Page } from "@playwright/test";

export async function numberInputValue(locator: Locator) {
  return Number.parseFloat(await locator.inputValue());
}

export async function horizontalDistance(left: Locator, right: Locator) {
  const leftBox = await left.boundingBox();
  const rightBox = await right.boundingBox();

  if (!leftBox || !rightBox) {
    throw new Error("Could not locate elements for horizontal distance");
  }

  return rightBox.x - leftBox.x;
}

export async function backgroundImage(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element).backgroundImage);
}

export function onePixelPngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8Y9sAAAAASUVORK5CYII=",
    "base64"
  );
}

export async function locatorWidth(locator: Locator) {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error("Could not locate element width");
  }

  return box.width;
}

export async function locatorHeight(locator: Locator) {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error("Could not locate element height");
  }

  return box.height;
}

export async function dragLocator(
  page: Page,
  locator: Locator,
  deltaX: number,
  deltaY: number,
  missingMessage = "Could not locate draggable element"
) {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error(missingMessage);
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 5 });
  await page.mouse.up();
}

export async function dragLocatorTo(
  page: Page,
  source: Locator,
  target: Locator,
  options: {
    beforeDrop?: () => Promise<void>;
    missingMessage?: string;
    steps?: number;
    targetPosition?: { x: number; y: number };
  } = {}
) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error(options.missingMessage ?? "Could not locate drag source or target");
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + (options.targetPosition?.x ?? targetBox.width / 2);
  const targetY = targetBox.y + (options.targetPosition?.y ?? targetBox.height / 2);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: options.steps ?? 8 });
  await options.beforeDrop?.();
  await page.mouse.up();
}
