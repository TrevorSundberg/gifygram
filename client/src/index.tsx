import "bootstrap/dist/css/bootstrap.min.css";
import {
  BrowserRouter,
  Route,
  Switch
} from "react-router-dom";
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

const getUrlParam = (props: { location: import("history").Location }, name: string) =>
  new URLSearchParams(props.location.search).get(name);

ReactDOM.render(
  <BrowserRouter>
    <Switch>
      <Route path="/threads"
        render={(props) => <Threads history={props.history}/>}
      />
      <Route path="/thread"
        render={(props) => <Thread history={props.history} id={getUrlParam(props, "threadId")}/>}
      />
      <Route path="/authtest">
        <AuthTest/>
      </Route>
      <Route path="/"
        render={(props) => <EditorComponent history={props.history} remixId={getUrlParam(props, "remixId")}/>}
      />
    </Switch>
  </BrowserRouter>,
  document.getElementById("root")
);
