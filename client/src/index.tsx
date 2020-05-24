import "bootstrap/dist/css/bootstrap.min.css";
import {AuthTest} from "./www/authtest";
import {EditorComponent} from "./editor/editorComponent";
import React from "react";
import ReactDOM from "react-dom";
import {Thread} from "./www/thread";
import {Threads} from "./www/threads";

const url = new URL(window.location.href);

if (url.hash) {
  const id = url.hash.slice(1);
  if (!document.getElementById(id)) {
    const observer = new MutationObserver(() => {
      if (document.getElementById(id)) {
        console.log("Scrolling to dynamic element", id);
        location.hash = "";
        location.hash = id;
        observer.disconnect();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

ReactDOM.render(
  (() => {
    if (url.searchParams.has("threads")) {
      return <Threads/>;
    }
    if (url.searchParams.has("threadId")) {
      return <Thread id={url.searchParams.get("threadId")}/>;
    }
    if (url.searchParams.has("authtest")) {
      return <AuthTest/>;
    }
    return <EditorComponent remixId={url.searchParams.get("remixId")}/>;
  })(),
  document.getElementById("root")
);
