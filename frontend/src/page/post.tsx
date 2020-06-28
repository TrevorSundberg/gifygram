import {AnimationVideo} from "./animationVideo";
import Avatar from "@material-ui/core/Avatar";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import CardMedia from "@material-ui/core/CardMedia";
import {LikeButton} from "./likeButton";
import Link from "@material-ui/core/Link";
import React from "react";
import {ReturnedPost} from "../../../common/common";
import {ShareButton} from "./shareButton";
import TimerIcon from "@material-ui/icons/Timer";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import {makeLocalUrl} from "../shared/shared";
import millify from "millify";
import pluralize from "pluralize";

interface PostProps {
  post: ReturnedPost;
  preview: boolean;
  cardStyle?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  videoProps?: React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
  history: import("history").History;
}

export const Post: React.FC<PostProps> = (props) => <Card
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
    avatar={
      <Avatar>
        {props.post.username.slice(0, 1).toUpperCase()}
      </Avatar>
    }
    action={
      <div>
        {props.post.cached
          ? <Tooltip title="The post is pending">
            <TimerIcon fontSize="inherit"/>
          </Tooltip>
          : null}
        <LikeButton post={props.post}/>
      </div>
    }
    title={<div>
      {props.post.username}
      {props.post.replyId ? <span> <Link
        variant="overline"
        color="secondary"
        href={`#${props.post.replyId}`}>replying to...</Link></span>
        : null}
    </div>}
    subheader={typeof props.post.title === "string" ? props.post.title : props.post.message}
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
    typeof props.post.title === "string"
      ? <div>
        <CardContent style={{paddingBottom: 0}}>
          <Typography noWrap={props.preview} variant="body2" color="textSecondary" component="p">
            {props.post.message}
          </Typography>
        </CardContent>
        <CardActions disableSpacing style={{justifyContent: "space-between"}}>
          {
            props.post.userdata.type === "animation"
              ? <Button
                variant="contained"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  props.history.push(`/editor?remixId=${props.post.id}`);
                }}>
                Remix
              </Button>
              : null
          }
          <Box ml={1}>
            <Typography variant={props.preview ? "caption" : "body2"} color={"textSecondary"} component="p">
              {props.preview
                ? millify(props.post.views, {precision: 1})
                : props.post.views.toLocaleString()}
              {` ${pluralize("view", props.post.views)}`}
            </Typography>
          </Box>
          <div style={{flexGrow: 1}}></div>
          <ShareButton
            title={props.post.title}
            url={makeLocalUrl(
              "/thread",
              {threadId: props.post.threadId},
              props.post.id === props.post.threadId ? null : props.post.id
            )}/>
        </CardActions>
      </div>
      : null
  }
</Card>;
