import "./shared/firebase";
import "./page/fonts.css";
import "./page/hashScroll";
import {API_ALL_THREADS_ID, API_TRENDING_THREADS_ID} from "../../common/common";
import {
  BrowserRouter,
  Route,
  Link as RouterLink,
  Switch
} from "react-router-dom";
import {
  Deferred,
  EVENT_MENU_OPEN,
  EVENT_REQUEST_LOGIN,
  RequestLoginEvent,
  isDevEnvironment,
  signInIfNeeded
} from "./shared/shared";
import {LoginDialog, LoginUserIdContext, LoginUserIdState} from "./page/login";
import {theme, useStyles} from "./page/style";
import AccountBoxIcon from "@material-ui/icons/AccountBox";
import AppBar from "@material-ui/core/AppBar";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import Drawer from "@material-ui/core/Drawer";
import {EditorComponent} from "./editor/editorComponent";
import GitHubIcon from "@material-ui/icons/GitHub";
import HomeIcon from "@material-ui/icons/Home";
import IconButton from "@material-ui/core/IconButton";
import Link from "@material-ui/core/Link";
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
import StorageIcon from "@material-ui/icons/Storage";
import {ThemeProvider} from "@material-ui/core/styles";
import {Thread} from "./page/thread";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import firebase from "firebase/app";

const getUrlParam = (props: { location: import("history").Location }, name: string) =>
  JSON.parse(new URLSearchParams(props.location.search).get(name));

const App = () => {
  const [showLoginDeferred, setShowLoginDeferred] = React.useState<Deferred<void> | null>(null);
  const [loggedInUserId, setLoggedInUserId] = React.useState<LoginUserIdState>(undefined);
  const [menuOpen, setMenuOpen] = React.useState(false);

  window.addEventListener(EVENT_MENU_OPEN, () => setMenuOpen(true));

  const closeMenuCallback = () => setMenuOpen(false);

  React.useEffect(() => {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        setLoggedInUserId(user.uid);
      } else {
        setLoggedInUserId(null);
      }
    });

    const onRequestLogin = (event: RequestLoginEvent) => {
      setShowLoginDeferred(event.deferredLoginPicked);
    };
    window.addEventListener(EVENT_REQUEST_LOGIN, onRequestLogin);
    return () => {
      window.removeEventListener(EVENT_REQUEST_LOGIN, onRequestLogin);
    };
  }, []);

  const emulatorUi = new URL(new URL(window.location.href).origin);
  emulatorUi.port = "5001";

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
                    color="inherit"
                    aria-label="menu"
                    onClick={() => setMenuOpen(true)}>
                    <MenuIcon />
                  </IconButton>
                  <RouterLink to="/" className={classes.link}>
                    <Box mr={1}>
                      <img
                        style={{verticalAlign: "middle"}}
                        src={require("./public/icon.png").default}
                        width="54px"
                        height="54px"/>
                    </Box>
                  </RouterLink>
                  <Typography noWrap variant="h6" className={classes.title}>
                    <RouterLink to="/" className={classes.link}>
                      {require("../title")}
                    </RouterLink>
                  </Typography>
                  <RouterLink to="/editor" className={classes.link}>
                    <Button id="create" variant="contained" color="secondary">Create</Button>
                  </RouterLink>
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
        <Drawer anchor={"left"} open={menuOpen} onClose={closeMenuCallback}>
          <List style={{minWidth: "250px"}}>
            <RouterLink to="/" className={classes.link} onClick={closeMenuCallback}>
              <ListItem button>
                <ListItemIcon><HomeIcon/></ListItemIcon>
                <ListItemText primary={"Home"} />
              </ListItem>
            </RouterLink>
            <RouterLink to="/editor" className={classes.link} onClick={closeMenuCallback}>
              <ListItem button>
                <ListItemIcon><MovieIcon/></ListItemIcon>
                <ListItemText primary={"Create Animation"} />
              </ListItem>
            </RouterLink>
            {
              loggedInUserId
                ? <RouterLink to="/profile" className={classes.link} onClick={closeMenuCallback}>
                  <ListItem button>
                    <ListItemIcon><AccountBoxIcon/></ListItemIcon>
                    <ListItemText primary={"Edit Profile"} />
                  </ListItem>
                </RouterLink>
                : <ListItem button onClick={() => signInIfNeeded().catch(() => 0)}>
                  <ListItemIcon><PersonIcon/></ListItemIcon>
                  <ListItemText primary={"Sign In"} />
                </ListItem>
            }
            <Link
              href="https://github.com/TrevorSundberg/madeitforfun"
              target="_blank"
              rel="noopener"
              className={classes.link}
              onClick={closeMenuCallback}>
              <ListItem button>
                <ListItemIcon><GitHubIcon/></ListItemIcon>
                <ListItemText primary={"Visit GitHub"} />
              </ListItem>
            </Link>
            {
              isDevEnvironment()
                ? <Link
                  href={emulatorUi.href}
                  target="_blank"
                  rel="noopener"
                  className={classes.link}
                  onClick={closeMenuCallback}>
                  <ListItem button>
                    <ListItemIcon><StorageIcon/></ListItemIcon>
                    <ListItemText primary={"Open Emulator UI"} />
                  </ListItem>
                </Link>
                : null
            }
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
        onSignInFailure={(message) => {
          showLoginDeferred.reject(new Error(message));
          setShowLoginDeferred(null);
        }}
        onSignInSuccess={(uid: string) => {
          setLoggedInUserId(uid);
          showLoginDeferred.resolve();
          setShowLoginDeferred(null);
        }}/>
    </LoginUserIdContext.Provider>
  </ThemeProvider>;
};

ReactDOM.render(<App/>, document.getElementById("root"));
