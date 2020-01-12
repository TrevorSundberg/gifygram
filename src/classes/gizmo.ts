import {Transform, Utility} from "./utility";
import Moveable from "moveable";
import {Widget} from "./manager";

export class Gizmo extends EventTarget {
  public readonly widget: Widget;

  public readonly moveable: Moveable;

  public constructor (widget: Widget) {
    super();
    this.widget = widget;
    const moveable = new Moveable(widget.element.parentElement, {
      draggable: true,
      keepRatio: true,
      pinchable: true,
      rotatable: true,
      scalable: true,
      target: widget.element
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
        this.widget.element.focus();
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
    Utility.setTransform(this.widget.element, state);
  }

  public getTransform (): Transform {
    return Utility.getTransform(this.widget.element);
  }
}
