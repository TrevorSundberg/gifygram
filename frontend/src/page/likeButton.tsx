import {API_POST_LIKE, ReturnedPost} from "../../../common/common";
import {Auth, abortableJsonFetch} from "../shared/shared";
import Badge from "@material-ui/core/Badge";
import FavoriteIcon from "@material-ui/icons/Favorite";
import IconButton from "@material-ui/core/IconButton";
import React from "react";

interface LikeButtonProps {
  post: ReturnedPost;
}

export const LikeButton: React.FC<LikeButtonProps> = (props) => {
  const [liked, setLiked] = React.useState(props.post.liked);
  const [likes, setLikes] = React.useState(props.post.likes);

  // Since we create the psuedo post to start with, the like staet can change from props.post.
  React.useEffect(() => {
    setLiked(props.post.liked);
  }, [props.post.liked]);
  React.useEffect(() => {
    setLikes(props.post.likes);
  }, [props.post.likes]);

  return <IconButton
    color={liked ? "secondary" : "default"}
    onClick={async (e) => {
      e.stopPropagation();
      setLiked(!liked);
      const newLikes = liked ? likes - 1 : likes + 1;
      setLikes(newLikes);
      await abortableJsonFetch(API_POST_LIKE, Auth.Required, {id: props.post.id, value: !liked});
    }}>
    <Badge badgeContent={likes} color="primary">
      <FavoriteIcon />
    </Badge>
  </IconButton>;
};
