import Moveable from "moveable";
import polyfill from "css-typed-om";
polyfill(window);

export interface Transform {
  rotate: number;
  scale: [number, number];
  translate: [number, number];
}

export class Gizmo extends EventTarget {
  public readonly element: HTMLElement;

  private moveable: Moveable;

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
      this.dispatchEvent(new Event("keyframe"));
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

  public destroy () {
    this.moveable.destroy();
    this.dispatchEvent(new Event("destroy"));
  }

  public update () {
    this.moveable.updateTarget();
  }

  public static getTransformCss (state: Transform) {
    return `translate(${state.translate[0]}px, ${state.translate[1]}px) ` +
      `rotate(${state.rotate}deg) ` +
      `scale(${state.scale[0]}, ${state.scale[1]}) `;
  }

  public setTransform (state: Transform) {
    this.element.style.transform = Gizmo.getTransformCss(state);
  }

  public getTransform (): Transform {
    const result: Transform = {
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

    const {transform} = this.element.style;
    if (transform) {
      const transformValue = CSSStyleValue.parse("transform", transform);
      if (transformValue instanceof CSSTransformValue) {
        for (const component of transformValue) {
          if (component instanceof CSSTranslate) {
            result.translate = [
              component.x.to("px").value,
              component.y.to("px").value
            ];
          } else if (component instanceof CSSRotate) {
            result.rotate = component.angle.to("deg").value;
          } else if (component instanceof CSSScale) {
            result.scale = [
              component.x as number,
              component.y as number
            ];
          }
        }
      }
    }
    return result;
  }
}
