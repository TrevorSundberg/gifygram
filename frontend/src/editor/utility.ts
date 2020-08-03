import {MAX_VIDEO_SIZE} from "../../../common/common";

export const FRAME_RATE = 24;
export const FRAME_TIME = 1 / FRAME_RATE;
export const DURATION_PER_ENCODE = 1;
export const MAX_OUTPUT_SIZE: Size = [
  MAX_VIDEO_SIZE,
  MAX_VIDEO_SIZE
];

/**
 * Do NOT change these constants, this would be a breaking change as they
 * affect sizes of widgets and positioning within the video. When the animations
 * are serialized all their positions are relative to these constants.
 * Note also that they cannot be small (less than 22) as that starts to
 * cause browser artifacts, presumingly due to the use of transforms.
 */
export const RELATIVE_WIDGET_SIZE = 400;
export const RELATIVE_VIDEO_SIZE = 1280;

// Only fired when the editor is visible and focused.
export const VISIBLE_UPDATE = "visibleUpdate";

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

  public static centerTransform (size: Size): Transform {
    return {
      rotate: 0,
      scale: [
        1,
        1
      ],
      translate: [
        size[0] / 2,
        size[1] / 2
      ]
    };
  }
}

export type Size = [number, number];

export const getAspect = (size: Size) => size[0] / size[1];

export const resizeMinimumKeepAspect = (current: Size, target: Size): Size => {
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
