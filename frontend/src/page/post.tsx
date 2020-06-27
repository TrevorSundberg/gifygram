import {PostData, ReturnedPost} from "../../../common/common";
import {AnimationVideo} from "./animationVideo";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import CardMedia from "@material-ui/core/CardMedia";
import {LikeButton} from "./likeButton";
import Link from "@material-ui/core/Link";
import React from "react";
import {ShareButton} from "./shareButton";
import Typography from "@material-ui/core/Typography";
import {makeLocalUrl} from "../shared/shared";

export const createPsuedoPost = (
  id: string,
  userdata: PostData,
  replyId?: string,
  threadId?: string,
  title = "",
  message = ""
): ReturnedPost => ({
  id,
  threadId: threadId || id,
  title,
  message,
  userdata,
  replyId,
  userId: "",
  username: "",
  liked: false,
  likes: 0
});

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
    // Prevent the Popover from triggering us on close.
    if (e.target instanceof HTMLDivElement) {
      if (e.target.getAttribute("aria-hidden") === "true") {
        return;
      }
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
      <LikeButton post={props.post}/>
    }
    title={<div>
      {props.post.username}
      {props.post.replyId ? <span> <Link
        variant="overline"
        color="secondary"
        href={`#${props.post.replyId}`}>replying to...</Link></span>
        : null}
    </div>}
    subheader={props.post.title || props.post.message}
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
    props.post.title
      ? <div>
        <CardContent style={{paddingBottom: 0}}>
          <Typography noWrap={props.preview} variant="body2" color="textSecondary" component="p">
            {props.post.message}
          </Typography>
        </CardContent>
        <CardActions disableSpacing>
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
