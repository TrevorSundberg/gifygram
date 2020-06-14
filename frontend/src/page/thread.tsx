import {API_POST_CREATE, API_POST_CREATE_MAX_MESSAGE_LENGTH, API_POST_LIST, ReturnedPost} from "../../../common/common";
import {AbortablePromise, Auth, abortableJsonFetch, cancel} from "../shared/shared";
import {Post, createPsuedoPost} from "./post";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import React from "react";
import TextField from "@material-ui/core/TextField";

interface ThreadProps {
  id: string;
  history: import("history").History;
}

interface PostCreate {
  id: string;
}

export const Thread: React.FC<ThreadProps> = (props) => {
  // We make a fake first post that includes the video to load it quicker.
  const [posts, setPosts] = React.useState<ReturnedPost[]>([
    createPsuedoPost(
      props.id,
      {
        type: "animation",
        width: 0,
        height: 0
      }
    )
  ]);
  const [postMessage, setPostMessage] = React.useState("");
  const [postCreateFetch, setPostCreateFetch] = React.useState<AbortablePromise<PostCreate>>(null);

  React.useEffect(() => {
    const postListFetch = abortableJsonFetch<ReturnedPost[]>(API_POST_LIST, Auth.Optional, {threadId: props.id});
    postListFetch.then((postList) => {
      if (postList) {
        postList.reverse();
        setPosts(postList);
      }
    });

    return () => {
      cancel(postListFetch);
      cancel(postCreateFetch);
    };
  }, []);

  return <div>
    {posts.map((post) => <Post
      preview={false}
      key={post.id}
      post={post}
      cardStyle={{marginBottom: 4}}
      videoProps={{autoPlay: true}}
      history={props.history}/>)}
    <Card>
      <CardContent>
        <form>
          <TextField
            fullWidth
            disabled={Boolean(postCreateFetch)}
            label="Comment"
            inputProps={{maxLength: API_POST_CREATE_MAX_MESSAGE_LENGTH}}
            value={postMessage}
            onChange={(e) => {
              setPostMessage(e.target.value);
            }}/>
          <Button
            type="submit"
            style={{display: "none"}}
            disabled={Boolean(postCreateFetch)}
            onClick={async () => {
              const postCreateFetchPromise = abortableJsonFetch<PostCreate>(API_POST_CREATE, Auth.Required, {
                message: postMessage,
                replyId: props.id
              });
              setPostCreateFetch(postCreateFetchPromise);

              const newPost = await postCreateFetchPromise;
              if (newPost) {
                // Append our post to the end.
                setPosts((previous) => [
                  ...previous,
                  createPsuedoPost(newPost.id, {type: "comment"}, props.id, props.id, null, postMessage)
                ]);
              }
              setPostCreateFetch(null);
              setPostMessage("");
            }}>
            Post
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>;
};
