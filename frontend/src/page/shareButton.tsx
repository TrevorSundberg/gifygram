import {
  EmailIcon,
  EmailShareButton,
  FacebookIcon,
  FacebookShareButton,
  RedditIcon,
  RedditShareButton,
  TumblrIcon,
  TumblrShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton
} from "react-share";
import {constants, useStyles} from "./style";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import IconButton from "@material-ui/core/IconButton";
import Popover from "@material-ui/core/Popover";
import React from "react";
import ShareIcon from "@material-ui/icons/Share";
import TextField from "@material-ui/core/TextField";
import copy from "copy-to-clipboard";

interface ShareButtonProps {
  title: string;
  url: string;
}

export const ShareButton: React.FC<ShareButtonProps> = (props) => {
  const [anchorElement, setAnchorElement] = React.useState<HTMLButtonElement | null>(null);
  const [copied, setCopied] = React.useState(false);

  const classes = useStyles();
  return <div>
    <IconButton onClick={(e) => {
      e.stopPropagation();
      setAnchorElement(e.currentTarget);
    }}>
      <ShareIcon />
    </IconButton>
    <Popover
      data-ignore-click="true"
      open={Boolean(anchorElement)}
      anchorEl={anchorElement}
      container={document.getElementById("page")}
      onClose={() => setAnchorElement(null)}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center"
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center"
      }}
    >
      <Card>
        <CardContent style={{paddingBottom: 0}}>
          <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
            <TextField
              fullWidth
              onFocus={(e) => e.target.setSelectionRange(0, Number.MAX_SAFE_INTEGER)}
              size="small"
              label="Link"
              defaultValue={props.url}
              InputProps={{
                readOnly: true
              }}
              variant="outlined"
            />
            <Button
              color={copied ? "secondary" : "default"}
              onClick={(e) => {
                e.stopPropagation();
                setCopied(copy(props.url));
              }}>
              Copy
            </Button>
          </div>
        </CardContent>

        <CardActions>
          <FacebookShareButton url={props.url} title={props.title} className={classes.shareSocialButton}>
            <IconButton component="div" size="small">
              <FacebookIcon round={true} size={constants.shareIconSize} />
            </IconButton>
          </FacebookShareButton>
          <TwitterShareButton url={props.url} title={props.title} className={classes.shareSocialButton}>
            <IconButton component="div" size="small">
              <TwitterIcon round={true} size={constants.shareIconSize} />
            </IconButton>
          </TwitterShareButton>
          <RedditShareButton url={props.url} title={props.title} className={classes.shareSocialButton}>
            <IconButton component="div" size="small">
              <RedditIcon round={true} size={constants.shareIconSize} />
            </IconButton>
          </RedditShareButton>
          <TumblrShareButton url={props.url} title={props.title} className={classes.shareSocialButton}>
            <IconButton component="div" size="small">
              <TumblrIcon round={true} size={constants.shareIconSize} />
            </IconButton>
          </TumblrShareButton>
          <WhatsappShareButton url={props.url} title={props.title} className={classes.shareSocialButton}>
            <IconButton component="div" size="small">
              <WhatsappIcon round={true} size={constants.shareIconSize} />
            </IconButton>
          </WhatsappShareButton>
          <EmailShareButton url={props.url} title={props.title} className={classes.shareSocialButton}>
            <IconButton component="div" size="small">
              <EmailIcon round={true} size={constants.shareIconSize} />
            </IconButton>
          </EmailShareButton>
        </CardActions>
      </Card>
    </Popover>
  </div>;
};
