import {makeFullLocalUrl, makeLocalUrl} from "../shared/shared";
import {AnimationVideo} from "./animationVideo";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import CardMedia from "@material-ui/core/CardMedia";
import {ClientPost} from "../../../common/common";
import {LikeButton} from "./likeButton";
import Link from "@material-ui/core/Link";
import MenuItem from "@material-ui/core/MenuItem";
import React from "react";
import Select from "@material-ui/core/Select";
import {ShareButton} from "./shareButton";
import TimerIcon from "@material-ui/icons/Timer";
import Tooltip from "@material-ui/core/Tooltip";
import {TrashButton} from "./trashButton";
import Typography from "@material-ui/core/Typography";
import {UserAvatar} from "./userAvatar";
import millify from "millify";
import pluralize from "pluralize";
import {useStyles} from "./style";

interface PostProps {
  post: ClientPost;
  preview: boolean;
  cardStyle?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  videoProps?: React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
  history: import("history").History;
  onTrashed?: () => void;
}

export const Post: React.FC<PostProps> = (props) => {
  const isThread = props.post.threadId === props.post.id;
  const classes = useStyles();
  return <Card
    key={props.post.id}
    id={props.post.id}
    style={props.cardStyle}
    onClick={(e) => {
      // Prevent the share Popover from triggering us on close.
      let element = e.target instanceof HTMLElement ? e.target : null;
      while (element) {
        if (element.getAttribute("data-ignore-click") === "true") {
          return;
        }
        element = element.parentElement;
      }

      if (props.onClick) {
        props.onClick(e);
      }
    }}>
    <CardHeader
      classes={{content: classes.cardHeader}}
      avatar={
        <UserAvatar
          username={props.post.username}
          avatarId={props.post.avatarId}
        />
      }
      action={
        <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
          {props.post.cached
            ? <Box mr={1}>
              <Tooltip title="The post is pending">
                <TimerIcon fontSize="inherit"/>
              </Tooltip>
            </Box>
            : null}
          {
            !props.preview && props.post.canDelete
              ? <Box mr={1}>
                <TrashButton post={props.post} onTrashed={props.onTrashed}/>
              </Box>
              : null
          }
          <LikeButton post={props.post}/>
        </div>
      }
      title={<Typography variant="subtitle1" noWrap>
        {props.post.username}
        {props.post.replyId && props.post.userdata.type === "animation" ? <span> <Link
          variant="overline"
          color="secondary"
          href={`#${props.post.replyId}`}>Remix of...</Link></span>
          : null}
      </Typography>}
      subheader={props.post.userdata.type === "animation" ? props.post.title : props.post.message}
    />
    {
      props.post.userdata.type === "animation"
        ? <CardMedia>
          <AnimationVideo
            {...props.videoProps}
            id={props.post.id}
            width={props.post.userdata.width}
            height={props.post.userdata.height}
          />
        </CardMedia>
        : null
    }
    {
      props.post.userdata.type === "animation"
        ? <div>
          <CardContent style={{paddingBottom: 0}}>
            <Typography noWrap={props.preview} variant="body2" color="textSecondary" component="p">
              {props.post.message}
            </Typography>
          </CardContent>
          <CardActions disableSpacing style={{justifyContent: "space-between"}}>
            <Button
              variant="contained"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                props.history.push(makeLocalUrl("/editor", {remixId: props.post.id}));
              }}>
              Remix
            </Button>
            {
              isThread
                ? <Box ml={1}>
                  <Typography variant={props.preview ? "caption" : "body2"} color={"textSecondary"} component="p">
                    {props.preview
                      ? millify(props.post.views, {precision: 1})
                      : props.post.views.toLocaleString()}
                    {` ${pluralize("view", props.post.views)}`}
                  </Typography>
                </Box>
                : null
            }
            <div style={{flexGrow: 1}}></div>
            {
              props.preview
                ? null
                : <Box mr={1}>
                  <Select
                    value="placeholder"
                    MenuProps={{
                      disableScrollLock: true
                    }}>
                    <MenuItem value="placeholder" disabled>
                      Attribution
                    </MenuItem>
                    {
                      props.post.userdata.attribution.map((attributedSource) =>
                        <Link
                          key={attributedSource.src}
                          href={attributedSource.originUrl}
                          color="textPrimary"
                          target="_blank"
                          rel="noopener"
                        >
                          <MenuItem>
                            <Box mr={1}>
                              <img src={attributedSource.previewUrl} height={24}/>
                            </Box>
                            {attributedSource.title}
                          </MenuItem>
                        </Link>)
                    }
                  </Select>
                </Box>
            }
            <ShareButton
              title={props.post.title}
              url={makeFullLocalUrl(
                "/thread",
                {threadId: props.post.threadId},
                props.post.id === props.post.threadId ? null : props.post.id
              )}/>
          </CardActions>
        </div>
        : null
    }
  </Card>;
};
