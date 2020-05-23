import "bootstrap/dist/css/bootstrap.min.css";
import {EditorComponent} from "./editor/editorComponent";
import React from "react";
import ReactDOM from "react-dom";
import {Threads} from "./www/threads";

const url = new URL(window.location.href);

ReactDOM.render(
  url.searchParams.has("threads") ? <Threads/> : <EditorComponent/>,
  document.getElementById("root")
);
