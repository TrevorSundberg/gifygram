import "./page/fonts.css";
import "./page/hashScroll";
import {API_ALL_THREADS_ID, API_TRENDING_THREADS_ID} from "../../common/common";
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
  signInIfNeeded,
  signInWithGoogle
} from "./shared/shared";
import {LoginDialog, LoginUserIdContext, LoginUserIdState} from "./page/login";
import {theme, useStyles} from "./page/style";
import AccountBoxIcon from "@material-ui/icons/AccountBox";
import AppBar from "@material-ui/core/AppBar";
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
import MovieIcon from "@material-ui/icons/Movie";
import PersonIcon from "@material-ui/icons/Person";
import {Profile} from "./page/profile";
import React from "react";
import ReactDOM from "react-dom";
import {ThemeProvider} from "@material-ui/core/styles";
import {Thread} from "./page/thread";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";

const getUrlParam = (props: { location: import("history").Location }, name: string) =>
  JSON.parse(new URLSearchParams(props.location.search).get(name));

const App = () => {
  const [showLoginDeferred, setShowLoginDeferred] = React.useState<Deferred<void> | null>(null);
  const [loggedInUserId, setLoggedInUserId] = React.useState<LoginUserIdState>(undefined);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const closeDrawerCallback = () => setDrawerOpen(false);

  React.useEffect(() => {
    getAuthIfSignedIn().then((authUser) => {
      if (authUser) {
        setLoggedInUserId(authUser.id);
      } else {
        setLoggedInUserId(null);
      }
    });

    const onRequestLogin = (event: RequestLoginEvent) => {
      setShowLoginDeferred(event.deferredLoginPicked);
    };

    const onLoggedIn = (event: LoginEvent) => {
      setLoggedInUserId(event.userId);
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
                  render={(prop) =>
                    <div>
                      <Typography variant="h4" align="left">
                        <b>TRENDING</b> Posts
                      </Typography>
                      <Thread
                        history={prop.history}
                        limit={4}
                        key={API_TRENDING_THREADS_ID}
                        threadId={API_TRENDING_THREADS_ID}/>
                      <Typography variant="h4" align="left">
                        <b>NEWEST</b> Posts
                      </Typography>
                      <Thread history={prop.history} key={API_ALL_THREADS_ID} threadId={API_ALL_THREADS_ID}/>
                    </div>}
                />
                <Route exact path="/thread"
                  render={(prop) => {
                    const threadId = getUrlParam(prop, "threadId");
                    return <Thread history={prop.history} key={threadId} threadId={threadId}/>;
                  }}
                />
                <Route exact path="/profile"
                  render={() => <Profile/>}
                />
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
                <ListItemIcon><MovieIcon/></ListItemIcon>
                <ListItemText primary={"Create Animation"} />
              </ListItem>
            </Link>
            {
              loggedInUserId
                ? <Link to="/profile" className={classes.link} onClick={closeDrawerCallback}>
                  <ListItem button>
                    <ListItemIcon><AccountBoxIcon/></ListItemIcon>
                    <ListItemText primary={"Edit Profile"} />
                  </ListItem>
                </Link>
                : <ListItem button onClick={() => signInIfNeeded()}>
                  <ListItemIcon><PersonIcon/></ListItemIcon>
                  <ListItemText primary={"Sign In"} />
                </ListItem>
            }
            <ListItem button onClick={() => window.open("https://github.com/TrevorSundberg/madeitforfun")}>
              <ListItemIcon><GitHubIcon/></ListItemIcon>
              <ListItemText primary={"Visit GitHub"} />
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
