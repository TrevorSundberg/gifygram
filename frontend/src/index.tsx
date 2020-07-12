import "./page/fonts.css";
import {
  BrowserRouter,
  Link,
  Route,
  Switch
} from "react-router-dom";
import {
  Deferred,
  EVENT_LOGGED_IN,
  EVENT_REQUEST_LOGIN,
  LoginEvent,
  RequestLoginEvent,
  getAuthIfSignedIn,
  signInWithGoogle
} from "./shared/shared";
import {LoginDialog, LoginUserIdContext, LoginUserIdState} from "./page/login";
import {theme, useStyles} from "./page/style";
import AppBar from "@material-ui/core/AppBar";
import {AuthTest} from "./page/authtest";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import Drawer from "@material-ui/core/Drawer";
import {EditorComponent} from "./editor/editorComponent";
import GitHubIcon from "@material-ui/icons/GitHub";
import HomeIcon from "@material-ui/icons/Home";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import MenuIcon from "@material-ui/icons/Menu";
import {ModalContainer} from "./editor/modal";
import {Profile} from "./page/profile";
import React from "react";
import ReactDOM from "react-dom";
import {ThemeProvider} from "@material-ui/core/styles";
import {Thread} from "./page/thread";
import {Threads} from "./page/threads";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import VideoCallIcon from "@material-ui/icons/VideoCall";

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
  const [showLoginDeferred, setShowLoginDeferred] = React.useState<Deferred<void> | null>(null);
  const [loggedInUserId, setLoggedInUserId] = React.useState<LoginUserIdState>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const closeDrawerCallback = () => setDrawerOpen(false);

  React.useEffect(() => {
    const onLoggedIn = (event: LoginEvent) => {
      setLoggedInUserId(event.userId);
    };

    getAuthIfSignedIn().then((authUser) => {
      if (authUser) {
        onLoggedIn(new LoginEvent(authUser.id));
      }
    });

    const onRequestLogin = (event: RequestLoginEvent) => {
      setShowLoginDeferred(event.deferredLoginPicked);
    };

    window.addEventListener(EVENT_LOGGED_IN, onLoggedIn);
    window.addEventListener(EVENT_REQUEST_LOGIN, onRequestLogin);
    return () => {
      window.removeEventListener(EVENT_LOGGED_IN, onLoggedIn);
      window.removeEventListener(EVENT_REQUEST_LOGIN, onRequestLogin);
    };
  }, []);

  const classes = useStyles();
  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <LoginUserIdContext.Provider value={loggedInUserId}>
      <BrowserRouter>
        <Switch>
          <Route path="/editor"
            render={(prop) => <EditorComponent history={prop.history} remixId={getUrlParam(prop, "remixId")}/>}
          />
          <Route>
            <div className={classes.toolbar} style={{width: "100%", marginBottom: 10}}>
              <AppBar position="fixed">
                <Toolbar className={classes.pageWidth}>
                  <IconButton
                    edge="start"
                    className={classes.menuButton}
                    color="inherit"
                    aria-label="menu"
                    onClick={() => setDrawerOpen(true)}>
                    <MenuIcon />
                  </IconButton>
                  <Typography noWrap variant="h6" className={classes.title}>
                    <Link to="/" className={classes.link}>
                      {require("../title")}
                    </Link>
                  </Typography>
                  <Link to="/editor" className={classes.link}>
                    <Button variant="contained" color="secondary">Create</Button>
                  </Link>
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
        <Drawer anchor={"left"} open={drawerOpen} onClose={closeDrawerCallback}>
          <List style={{minWidth: "250px"}}>
            <Link to="/" className={classes.link} onClick={closeDrawerCallback}>
              <ListItem button>
                <ListItemIcon><HomeIcon/></ListItemIcon>
                <ListItemText primary={"Home"} />
              </ListItem>
            </Link>
            <Link to="/editor" className={classes.link} onClick={closeDrawerCallback}>
              <ListItem button>
                <ListItemIcon><VideoCallIcon/></ListItemIcon>
                <ListItemText primary={"Create an Animation"} />
              </ListItem>
            </Link>
            <ListItem button onClick={() => window.open("https://github.com/TrevorSundberg/madeitforfun")}>
              <ListItemIcon><GitHubIcon/></ListItemIcon>
              <ListItemText primary={"See on GitHub"} />
            </ListItem>
          </List>
        </Drawer>
      </BrowserRouter>
      <ModalContainer/>
      <LoginDialog
        open={Boolean(showLoginDeferred)}
        onClose={() => {
          showLoginDeferred.reject(new Error("The login was cancelled"));
          setShowLoginDeferred(null);
        }}
        onSignInWithGoogle={async () => {
          await signInWithGoogle();
          showLoginDeferred.resolve();
          setShowLoginDeferred(null);
        }}/>
    </LoginUserIdContext.Provider>
  </ThemeProvider>;
};

ReactDOM.render(<App/>, document.getElementById("root"));
