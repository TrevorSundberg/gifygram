import * as React from "react";
import Moveable from "react-moveable";

export interface WidgetState {
  rotate: number;
  scale: [number, number];
  translate: [number, number];
  child: HTMLDivElement;
}

export class Widget extends React.Component<{}, WidgetState> {
  constructor (props) {
    super(props);
    this.state = {
      child: null,
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

  render () {
    const {child} = this.state;
    console.log(
      "render",
      child
    );
    if (child) {
      child.style.transform =
        `translate(${this.state.translate[0]}px, ${this.state.translate[1]}px)` +
        `rotate(${this.state.rotate}deg)` +
        `scale(${this.state.scale[0]}, ${this.state.scale[1]})`;
    }
    return <div>
      <div style={{display: "inline-block"}} ref={(element) => {
        if (element && element !== this.state.child) {
          // If we set the child immediately, the children may not have had time to layout
          setTimeout(
            () => {
              this.setState((state) => ({
                ...state,
                child: element
              }));
            },
            0
          );
        }
      }}>
        {this.props.children}
      </div>
      <Moveable
        target={child}
        draggable={true}
        scalable={true}
        keepRatio={true}
        rotatable={true}
        pinchable={true}

        onRotateStart={({set}) => {
          set(this.state.rotate);
        }}
        onRotate={({beforeRotate}) => {
          this.setState((state) => ({
            ...state,
            rotate: beforeRotate
          }));
        }}
        onDragStart={({set}) => {
          set(this.state.translate);
        }}
        onDrag={({beforeTranslate}) => {
          this.setState((state) => ({
            ...state,
            translate: beforeTranslate as [number, number]
          }));
        }}
        onDragEnd={(targ) => {
          targ.target.focus();
        }}
        onScaleStart={({set, dragStart}) => {
          set(this.state.scale);
          if (dragStart) {
            dragStart.set(this.state.translate);
          }
        }}
        onScale={({scale, drag}) => {
          this.setState((state) => ({
            ...state,
            scale: scale as [number, number],
            translate: drag.beforeTranslate as [number, number]
          }));
        }}
      />
    </div>;
  }
}
