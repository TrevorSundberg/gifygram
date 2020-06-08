import {API_POST_CREATE, API_POST_CREATE_MAX_MESSAGE_LENGTH, API_POST_LIST, ReturnedPost} from "../../../common/common";
import {AbortablePromise, abortableJsonFetch, cancel} from "../shared/shared";
import {AnimationVideo} from "./animationVideo";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import React from "react";
import TextField from "@material-ui/core/TextField";
import {createPsuedoPost} from "./post";
import {signInIfNeeded} from "../shared/auth";

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
    const postListFetch = abortableJsonFetch<ReturnedPost[]>(API_POST_LIST, {threadId: props.id});
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
    {posts.map((post) => <Card
      key={post.id}
      id={post.id}
      style={{marginBottom: 4}}>
      {
        post.userdata.type === "animation"
          ? <CardMedia>
            <AnimationVideo
              id={post.id}
              width={post.userdata.width}
              height={post.userdata.height}
              autoPlay
            />
          </CardMedia>
          : null
      }
      <CardContent>
        {
          post.userdata.type === "animation"
            ? <Button
              variant="contained"
              color="primary"
              onClick={() => {
                props.history.push(`/editor?remixId=${post.id}`);
              }}>
              Remix
            </Button>
            : null
        }
        <br/>
        {post.username}
        <br/>
        {post.replyId ? <div><a href={`#${post.replyId}`}>IN REPLY TO</a><br/></div> : null}
        <br/>
        {post.title}
        <br/>
            MESSAGE: {post.message}
      </CardContent>
    </Card>)}
    <Card>
      <CardContent>
        <TextField
          fullWidth
          label="Comment"
          multiline={true}
          inputProps={{maxLength: API_POST_CREATE_MAX_MESSAGE_LENGTH}}
          value={postMessage}
          onChange={(e) => {
            setPostMessage(e.target.value);
          }}/>
        <Button
          variant="contained"
          color="primary"
          onClick={async () => {
            const headers = await signInIfNeeded();

            const postCreateFetchPromise = abortableJsonFetch<PostCreate>(API_POST_CREATE, {
              message: postMessage,
              replyId: props.id
            }, {headers});
            setPostCreateFetch(postCreateFetchPromise);

            const newPost = await postCreateFetchPromise;
            if (newPost) {
              // Append our post to the end.
              setPosts((previous) => [
                ...previous,
                createPsuedoPost(newPost.id, {type: "comment"}, props.id, props.id, null, postMessage)
              ]);
            }
          }}>
            Post
        </Button>
      </CardContent>
    </Card>
  </div>;
};
