import * as React from "react";
import * as ReactDOM from "react-dom";

import Scene from "scenejs";
import {Widget} from "./components/widget";

ReactDOM.render(
  <Widget><img src="https://i.pinimg.com/originals/b2/76/af/b276af58ff041b951321765eec87ce29.png"></img></Widget>,
  document.getElementById("root")
);

const scene = new Scene(
  {
    "#test": {
      0: "left: 0px; top: 0px; transform: translate(0px);",
      1: {
        left: "100px",
        top: "0px",
        transform: "translate(50px)"
      },
      2: {
        left: "200px",
        top: "100px",
        transform: {
          translate: "100px"
        }
      }
    }
  },
  {
    easing: "ease-in-out",
    selector: true
  }
);

scene.setTime(0.5);
