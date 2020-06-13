import {PostData, ReturnedPost} from "../../../common/common";
import {AnimationVideo} from "./animationVideo";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import CardMedia from "@material-ui/core/CardMedia";
import FavoriteIcon from "@material-ui/icons/Favorite";
import IconButton from "@material-ui/core/IconButton";
import Link from "@material-ui/core/Link";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import React from "react";
import ShareIcon from "@material-ui/icons/Share";
import Typography from "@material-ui/core/Typography";

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
  username: "Me"
});

interface PostProps {
  post: ReturnedPost;
  cardStyle?: React.CSSProperties;
  onClick?: () => void;
  videoProps?: React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
  history: import("history").History;
}

export const Post: React.FC<PostProps> = (props) => <Card
  key={props.post.id}
  style={props.cardStyle}
  onClick={props.onClick}>
  <CardHeader
    avatar={
      <Avatar>
        {props.post.username.slice(0, 1).toUpperCase()}
      </Avatar>
    }
    action={
      <IconButton>
        <MoreVertIcon />
      </IconButton>
    }
    title={props.post.title}
    subheader={props.post.username}
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
  <CardContent>
    {props.post.replyId ? <Link href={`#${props.post.replyId}`}>IN REPLY TO</Link> : null}
    <Typography noWrap variant="body2" color="textSecondary" component="p">
      {props.post.message}
    </Typography>
  </CardContent>
  <CardActions disableSpacing>
    <IconButton>
      <FavoriteIcon />
    </IconButton>
    <IconButton>
      <ShareIcon />
    </IconButton>
    <div style={{flexGrow: 1}}></div>
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
  </CardActions>
</Card>;
