import {Theme, createMuiTheme, createStyles, makeStyles} from "@material-ui/core/styles";

export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1
    },
    pageWidth: {
      maxWidth: 960,
      paddingLeft: theme.spacing(),
      paddingRight: theme.spacing(),
      width: "100%",
      margin: "auto"
    },
    toolbar: theme.mixins.toolbar,
    menuButton: {
      marginRight: theme.spacing(2)
    },
    title: {
      flexGrow: 1,
      fontFamily: "'Arvo', serif"
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
    video: {
      width: "100%",
      height: "auto"
    },
    shareSocialButton: {
      flex: 1
    }
  }), {index: 1});

export const theme = createMuiTheme({
  palette: {
    type: "dark"
  }
});

export const constants = {
  shareIconSize: 32
};
