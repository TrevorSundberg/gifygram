import "bootstrap/dist/css/bootstrap.min.css";
import {
  BrowserRouter,
  Route,
  Switch
} from "react-router-dom";
import AppBar from "@material-ui/core/AppBar";
import {AuthTest} from "./www/authtest";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import {EditorComponent} from "./editor/editorComponent";
import IconButton from "@material-ui/core/IconButton";
import InputBase from "@material-ui/core/InputBase";
import MenuIcon from "@material-ui/icons/Menu";
import {Profile} from "./www/profile";
import React from "react";
import ReactDOM from "react-dom";
import SearchIcon from "@material-ui/icons/Search";
import {ThemeProvider} from "@material-ui/core/styles";
import {Thread} from "./www/thread";
import {Threads} from "./www/threads";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";

// Don't understand why the order of this import matters. Seems like a bug in material-ui.
// eslint-disable-next-line sort-imports
import {theme, useStyles} from "./www/style";

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
        <Route path="/:page">
          <div className={classes.toolbar} style={{width: "100%", marginBottom: 10}}>
            <AppBar position="fixed">
              <Toolbar className={classes.pageWidth}>
                <IconButton edge="start" className={classes.menuButton} color="inherit" aria-label="menu">
                  <MenuIcon />
                </IconButton>
                <Typography variant="h6" className={classes.title}>
                Made It For Fun
                </Typography>
                <div className={classes.search}>
                  <div className={classes.searchIcon}>
                    <SearchIcon />
                  </div>
                  <InputBase
                    placeholder="Search…"
                    classes={{
                      root: classes.inputRoot,
                      input: classes.inputInput
                    }}
                    inputProps={{"aria-label": "search"}}
                  />
                </div>
                <Button color="inherit">Login</Button>
              </Toolbar>
            </AppBar>
          </div>
          <div className={classes.pageWidth}>
            <Switch>
              <Route path="/threads"
                render={(prop) => <Threads history={prop.history}/>}
              />
              <Route path="/thread"
                render={(prop) => <Thread history={prop.history} id={getUrlParam(prop, "threadId")}/>}
              />
              <Route path="/profile"
                render={(prop) => <Profile history={prop.history}/>}
              />
              <Route path="/authtest">
                <AuthTest/>
              </Route>
            </Switch>
          </div>
        </Route>
        <Route path="/"
          render={(prop) => <EditorComponent history={prop.history} remixId={getUrlParam(prop, "remixId")}/>}
        />
      </Switch>
    </BrowserRouter>
  </ThemeProvider>;
};

ReactDOM.render(<App/>, document.getElementById("root"));
