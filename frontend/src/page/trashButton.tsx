import {API_POST_DELETE, ClientPost} from "../../../common/common";
import {Auth, abortableJsonFetch} from "../shared/shared";
import DeleteIcon from "@material-ui/icons/Delete";
import IconButton from "@material-ui/core/IconButton";
import React from "react";

interface TrashButtonProps {
  post: ClientPost;
  onTrashed: () => void;
}

export const TrashButton: React.FC<TrashButtonProps> = (props) =>
  <IconButton onClick={async () => {
    await abortableJsonFetch(API_POST_DELETE, Auth.Required, {id: props.post.id});
    props.onTrashed();
  }}>
    <DeleteIcon/>
  </IconButton>;
