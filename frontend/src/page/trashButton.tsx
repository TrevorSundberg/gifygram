import {API_POST_DELETE, ReturnedPost} from "../../../common/common";
import {Auth, THREADS_CACHE_KEY, abortableJsonFetch} from "../shared/shared";
import DeleteIcon from "@material-ui/icons/Delete";
import IconButton from "@material-ui/core/IconButton";
import React from "react";
import {cacheDelete} from "../shared/cache";

interface TrashButtonProps {
  post: ReturnedPost;
  onTrashed: () => void;
}

export const TrashButton: React.FC<TrashButtonProps> = (props) =>
  <IconButton onClick={async () => {
    await abortableJsonFetch(API_POST_DELETE, Auth.Required, {id: props.post.id});

    // Delete it as part of this thread, and as the thread itself (if it is one).
    cacheDelete(props.post.threadId, props.post);
    cacheDelete(THREADS_CACHE_KEY, props.post);

    props.onTrashed();
  }}>
    <DeleteIcon/>
  </IconButton>;
