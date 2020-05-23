import "bootstrap/dist/css/bootstrap.min.css";
import {EditorComponent} from "./editor/editorComponent";
import React from "react";
import ReactDOM from "react-dom";
import {Thread} from "./www/thread";
import {Threads} from "./www/threads";

const url = new URL(window.location.href);

ReactDOM.render(
  (() => {
    if (url.searchParams.has("threads")) {
      return <Threads/>;
    }
    if (url.searchParams.has("threadId")) {
      return <Thread id={url.searchParams.get("threadId")}/>;
    }
    return <EditorComponent/>;
  })(),
  document.getElementById("root")
);
