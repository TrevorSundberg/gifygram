import Moveable from "moveable";
import Scene from "scenejs";
import polyfill from "css-typed-om";
polyfill(window);

const video = document.getElementById("video") as HTMLVideoElement;

const timeline = {
  "#test": {
  }
};

const scene = new Scene(timeline, {
  easing: "linear",
  selector: true
});

const moveable = new Moveable(document.body, {
  draggable: true,
  keepRatio: true,
  pinchable: true,
  rotatable: true,
  scalable: true,
  target: document.querySelector("#test") as HTMLElement
});

interface Transform {
  rotate: number;
  scale: [number, number];
  translate: [number, number];
}

const getStateCss = (state: Transform) => `translate(${state.translate[0]}px, ${state.translate[1]}px) ` +
  `rotate(${state.rotate}deg) ` +
  `scale(${state.scale[0]}, ${state.scale[1]}) `;

const setState = (element: HTMLElement | SVGElement, state: Transform) => {
  element.style.transform = getStateCss(state);
};

const getState = (element: HTMLElement | SVGElement): Transform => {
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

  const {transform} = element.style;
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
};

moveable.on("rotateStart", ({target, set}) => {
  set(getState(target).rotate);
});
moveable.on("rotate", ({target, beforeRotate}) => {
  setState(target, {
    ...getState(target),
    rotate: beforeRotate
  });
});
moveable.on("dragStart", ({target, set}) => {
  set(getState(target).translate);
});
moveable.on("drag", ({target, beforeTranslate}) => {
  setState(target, {
    ...getState(target),
    translate: beforeTranslate as [number, number]
  });
});
moveable.on("renderEnd", ({target}) => {
  target.focus();
  console.log(getStateCss(getState(target)));
  timeline["#test"][video.currentTime] = {
    transform: getStateCss(getState(target))
  };
  scene.set(timeline);
});
moveable.on("scaleStart", ({target, set, dragStart}) => {
  set(getState(target).scale);
  if (dragStart) {
    dragStart.set(getState(target).translate);
  }
});
moveable.on("scale", ({target, scale, drag}) => {
  setState(target, {
    ...getState(target),
    scale: scale as [number, number],
    translate: drag.beforeTranslate as [number, number]
  });
});

let lastTime = scene.getTime();
const update = () => {
  requestAnimationFrame(() => {
    update();
  });
  if (lastTime !== video.currentTime) {
    lastTime = video.currentTime;
    scene.setTime(video.currentTime);
  }
  moveable.updateTarget();
};
update();
