import type { Locator, Page } from "@playwright/test";

type GameObjectRoot = Locator | Page;

export class GameObject {
  protected constructor(
    protected readonly page: Page,
    protected readonly root: GameObjectRoot = page
  ) {}

  protected getByRole(...parameters: Parameters<Page["getByRole"]>): ReturnType<Page["getByRole"]> {
    return this.root.getByRole(...parameters);
  }

  protected getByLabel(
    ...parameters: Parameters<Page["getByLabel"]>
  ): ReturnType<Page["getByLabel"]> {
    return this.root.getByLabel(...parameters);
  }
}
