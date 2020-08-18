import {Theme, createMuiTheme, createStyles, fade, makeStyles} from "@material-ui/core/styles";

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
      marginLeft: -theme.spacing(),
      width: "auto"
    },
    masonryGridColumn: {
      paddingLeft: theme.spacing(),
      backgroundClip: "padding-box"
    },
    search: {
      "position": "relative",
      "borderRadius": theme.shape.borderRadius,
      "backgroundColor": fade(theme.palette.common.white, 0.15),
      "&:hover": {
        backgroundColor: fade(theme.palette.common.white, 0.25)
      },
      "width": "100%"
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
    searchInputRoot: {
      color: "inherit",
      width: "100%"
    },
    searchInputInput: {
      padding: theme.spacing(1, 1, 1, 0),
      // Vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
      width: "100%"
    },
    searchImage: {
      marginTop: theme.spacing(),
      cursor: "pointer",
      width: "100%",
      verticalAlign: "top"
    },
    postTime: {
      float: "right",
      marginRight: theme.spacing(),
      color: theme.palette.text.secondary
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
