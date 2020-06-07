import {Theme, createMuiTheme, createStyles, fade, makeStyles} from "@material-ui/core/styles";

export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1
    },
    pageWidth: {
      maxWidth: 1024,
      width: "100%",
      margin: "auto"
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
    },
    closeButton: {
      position: "absolute",
      right: theme.spacing(1),
      top: theme.spacing(1),
      color: theme.palette.grey[500]
    },
    link: {
      color: "inherit",
      textDecoration: "inherit"
    },
    videoAspectRatioWrapper: {
      position: "relative",
      height: 0
    },
    video: {
      width: "100%",
      height: "auto"
    }
  }), {index: 1});

export const theme = createMuiTheme({
  palette: {
    type: "dark"
  }
});
