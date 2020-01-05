import {Transform, Utility} from "./utility";
import Moveable from "moveable";

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
    moveable.on("renderEnd", (event) => {
      if (event.isDrag || event.isPinch) {
        this.emitKeyframe();
      } else {
        this.element.focus();
      }
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

  public setTransform (state: Transform) {
    Utility.setTransform(this.element, state);
  }

  public getTransform (): Transform {
    return Utility.getTransform(this.element);
  }
}
