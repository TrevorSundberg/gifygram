import "bootstrap/dist/css/bootstrap.min.css";
import {
  BrowserRouter,
  Route,
  Switch
} from "react-router-dom";
import {Theme, ThemeProvider, createMuiTheme, createStyles, fade, makeStyles} from "@material-ui/core/styles";
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
import {Thread} from "./www/thread";
import {Threads} from "./www/threads";
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

const WIDTH = 1024;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1
    },
    toolbar: theme.mixins.toolbar,
    menuButton: {
      marginRight: theme.spacing(2)
    },
    title: {
      flexGrow: 1
    },
    search: {
      "position": "relative",
      "borderRadius": theme.shape.borderRadius,
      "backgroundColor": fade(theme.palette.common.white, 0.15),
      "&:hover": {
        backgroundColor: fade(theme.palette.common.white, 0.25)
      },
      "marginLeft": 0,
      "width": "100%",
      [theme.breakpoints.up("sm")]: {
        marginLeft: theme.spacing(1),
        width: "auto"
      }
    },
    searchIcon: {
      padding: theme.spacing(0, 2),
      height: "100%",
      position: "absolute",
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    inputRoot: {
      color: "inherit"
    },
    inputInput: {
      padding: theme.spacing(1, 1, 1, 0),
      // Vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
      transition: theme.transitions.create("width"),
      width: "100%",
      [theme.breakpoints.up("sm")]: {
        "width": "12ch",
        "&:focus": {
          width: "20ch"
        }
      }
    }
  }));

const theme = createMuiTheme({
  palette: {
    type: "dark",
    primary: {
      main: "#221266"
    },
    secondary: {
      main: "#6c1b92"
    },
    background: {
      default: "#111"
    }
  }
});

const App = () => {
  const classes = useStyles();
  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Switch>
        <Route path="/:page">
          <div className={classes.toolbar} style={{width: "100%", marginBottom: 10}}>
            <AppBar position="fixed">
              <Toolbar style={{maxWidth: WIDTH, width: "100%", margin: "auto"}}>
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
          <div style={{
            maxWidth: WIDTH,
            margin: "auto"
          }}>
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
