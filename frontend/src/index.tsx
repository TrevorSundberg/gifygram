import {
  BrowserRouter,
  Link,
  Route,
  Switch
} from "react-router-dom";
import {theme, useStyles} from "./page/style";
import AppBar from "@material-ui/core/AppBar";
import {AuthTest} from "./page/authtest";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import {EditorComponent} from "./editor/editorComponent";
import IconButton from "@material-ui/core/IconButton";
import InputBase from "@material-ui/core/InputBase";
import MenuIcon from "@material-ui/icons/Menu";
import {ModalContainer} from "./editor/modal";
import {Profile} from "./page/profile";
import React from "react";
import ReactDOM from "react-dom";
import SearchIcon from "@material-ui/icons/Search";
import {ThemeProvider} from "@material-ui/core/styles";
import {Thread} from "./page/thread";
import {Threads} from "./page/threads";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";

const url = new URL(window.location.href);

if (url.hash) {
  const id = url.hash.slice(1);
  if (!document.getElementById(id)) {
    const observer = new MutationObserver(() => {
      const element = document.getElementById(id);
      if (element) {
        observer.disconnect();
        console.log("Begin scrolling to dynamic element", id);
        setTimeout(() => {
          if (location.hash.slice(1) === id) {
            location.hash = "";
            location.hash = id;
          }
          console.log("End scrolling to dynamic element", id);
        }, 500);
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

const App = () => {
  const classes = useStyles();
  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Switch>
        <Route path="/editor"
          render={(prop) => <EditorComponent history={prop.history} remixId={getUrlParam(prop, "remixId")}/>}
        />
        <Route>
          <div className={classes.toolbar} style={{width: "100%", marginBottom: 10}}>
            <AppBar position="fixed">
              <Toolbar className={classes.pageWidth}>
                <IconButton edge="start" className={classes.menuButton} color="inherit" aria-label="menu">
                  <MenuIcon />
                </IconButton>
                <Typography noWrap variant="h6" className={classes.title}>
                  <Link to="/" className={classes.link}>
                    Made It For Fun
                  </Link>
                </Typography>
                <Link to="/editor" className={classes.link}>
                  <Button>Create</Button>
                </Link>
                <Button>Login</Button>
              </Toolbar>
            </AppBar>
          </div>
          <div className={classes.pageWidth} id="page">
            <Switch>
              <Route exact path="/"
                render={(prop) => <Threads history={prop.history}/>}
              />
              <Route exact path="/thread"
                render={(prop) => <Thread history={prop.history} id={getUrlParam(prop, "threadId")}/>}
              />
              <Route exact path="/profile"
                render={() => <Profile/>}
              />
              <Route exact path="/authtest">
                <AuthTest/>
              </Route>
            </Switch>
          </div>
        </Route>
      </Switch>
    </BrowserRouter>
    <ModalContainer/>
  </ThemeProvider>;
};

ReactDOM.render(<App/>, document.getElementById("root"));
