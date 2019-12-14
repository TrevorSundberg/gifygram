export class Widget {
  public readonly element: HTMLElement;

  public readonly id: string;

  /** @internal */
  public constructor (id: string, element: HTMLElement) {
    this.id = id;
    this.element = element;
  }
}
