import Moveable from "moveable";

export interface Transform {
  rotate: number;
  scale: [number, number];
  translate: [number, number];
}

export class Gizmo extends EventTarget {
  public readonly element: HTMLElement;

  public readonly moveable: Moveable;

  public constructor (element: HTMLElement) {
    super();
    this.element = element;
    const moveable = new Moveable(document.body, {
      draggable: true,
      keepRatio: true,
      pinchable: true,
      rotatable: true,
      scalable: true,
      target: element
    });
    this.moveable = moveable;

    moveable.on("rotateStart", ({set}) => {
      set(this.getTransform().rotate);
    });
    moveable.on("rotate", ({beforeRotate}) => {
      this.setTransform({
        ...this.getTransform(),
        rotate: beforeRotate
      });
    });
    moveable.on("dragStart", ({set}) => {
      set(this.getTransform().translate);
    });
    moveable.on("drag", ({beforeTranslate}) => {
      this.setTransform({
        ...this.getTransform(),
        translate: beforeTranslate as [number, number]
      });
    });
    moveable.on("renderEnd", () => {
      this.element.focus();
      this.emitKeyframe();
    });
    moveable.on("scaleStart", ({set, dragStart}) => {
      set(this.getTransform().scale);
      if (dragStart) {
        dragStart.set(this.getTransform().translate);
      }
    });
    moveable.on("scale", ({scale, drag}) => {
      this.setTransform({
        ...this.getTransform(),
        scale: scale as [number, number],
        translate: drag.beforeTranslate as [number, number]
      });
    });
  }

  public emitKeyframe () {
    this.dispatchEvent(new Event("keyframe"));
  }

  public destroy () {
    this.moveable.destroy();
    this.dispatchEvent(new Event("destroy"));
  }

  public update () {
    this.moveable.updateTarget();
    this.moveable.updateRect();
  }

  public static identityTransform (): Transform {
    return {
      rotate: 0,
      scale: [
        1,
        1
      ],
      translate: [
        0,
        0
      ]
    };
  }

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
    element.style.transform = Gizmo.transformToCss(state);
  }

  public static getTransform (element: HTMLElement): Transform {
    return Gizmo.cssToTransform(element.style.transform);
  }

  public setTransform (state: Transform) {
    Gizmo.setTransform(this.element, state);
  }

  public getTransform (): Transform {
    return Gizmo.getTransform(this.element);
  }
}
