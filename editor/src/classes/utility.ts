export const FRAME_RATE = 30;
export const FRAME_TIME = 1 / FRAME_RATE;
export const DURATION_PER_ENCODE = 1;
export const TARGET_CANVAS_SIZE: Size = [
  1280,
  1280
];
export const TARGET_WIDGET_SIZE: Size = [
  400,
  400
];

export class Deferred<T> implements Promise<T> {
  private resolveSelf;

  private rejectSelf;

  private promise: Promise<T>

  public constructor () {
    this.promise = new Promise((resolve, reject) => {
      this.resolveSelf = resolve;
      this.rejectSelf = reject;
    });
  }

  public then<TResult1 = T, TResult2 = never> (
    onfulfilled?: ((value: T) =>
    TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) =>
    TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  public catch<TResult = never> (onrejected?: ((reason: any) =>
  TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult> {
    return this.promise.then(onrejected);
  }

  public finally (onfinally?: (() => void) | undefined | null): Promise<T> {
    console.log(onfinally);
    throw new Error("Not implemented");
  }

  public resolve (val: T) {
    this.resolveSelf(val);
  }

  public reject (reason: any) {
    this.rejectSelf(reason);
  }

  public [Symbol.toStringTag]: "Promise"
}

export interface Transform {
  rotate: number;
  scale: [number, number];
  translate: [number, number];
}

export class Utility {
  public static transformToCss (state: Transform): string {
    return `translate(${state.translate[0]}px, ${state.translate[1]}px) ` +
      `rotate(${state.rotate}deg) ` +
      `scale(${state.scale[0]}, ${state.scale[1]}) ` +
      // Fix a bug in Chrome where widgets were dissapearing
      "translateZ(0px)";
  }

  public static cssToTransform (css: string): Transform {
    const parsed: Record<string, number[]> = {};
    const regex = /([a-z]+)\(([^)]+)\)/ug;
    for (;;) {
      const result = regex.exec(css);
      if (!result) {
        break;
      }
      const numbers = result[2].split(",").map((str) => parseFloat(str.trim()));
      parsed[result[1]] = numbers;
    }
    return {
      rotate: parsed.rotate[0],
      scale: [
        parsed.scale[0],
        parsed.scale[1] || parsed.scale[0]
      ],
      translate: [
        parsed.translate[0],
        parsed.translate[1] || 0
      ]
    };
  }

  public static setTransform (element: HTMLElement, state: Transform) {
    element.style.transform = Utility.transformToCss(state);
  }

  public static getTransform (element: HTMLElement): Transform {
    return Utility.cssToTransform(element.style.transform);
  }

  public static centerTransform (width: number, height: number): Transform {
    return {
      rotate: 0,
      scale: [
        1,
        1
      ],
      translate: [
        width / 2,
        height / 2
      ]
    };
  }
}

export type NeverAsync = void;

export interface AttributedSource {
  attribution: string;
  src: string;
}

export type Size = [number, number];

export const getAspect = (size: Size) => size[0] / size[1];

export const resizeKeepAspect = (current: Size, target: Size): Size => {
  if (getAspect(current) > getAspect(target)) {
    return [
      target[0],
      target[0] / current[0] * current[1]
    ];
  }
  return [
    target[1] / current[1] * current[0],
    target[1]
  ];
};

export type TimeRange = [number, number];
