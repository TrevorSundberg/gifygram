import {Theme, createMuiTheme, createStyles, makeStyles} from "@material-ui/core/styles";

export const PAGE_WIDTH = 960;

export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1
    },
    pageWidth: {
      maxWidth: PAGE_WIDTH,
      paddingLeft: theme.spacing(),
      paddingRight: theme.spacing(),
      width: "100%",
      margin: "auto"
    },
    toolbar: theme.mixins.toolbar,
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
    },
    cardHeader: {
      display: "grid"
    },
    masonryGrid: {
      display: "flex",
      marginLeft: "-10px",
      width: "auto"
    },
    masonryGridColumn: {
      paddingLeft: "10px",
      backgroundClip: "padding-box"
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
