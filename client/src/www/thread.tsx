import {API_POST_CREATE, API_POST_LIST, ReturnedPost} from "../../../common/common";
import {abortableJsonFetch, cancel, makeUrl} from "../shared/shared";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import {NewPost} from "../shared/newPost";
import React from "react";
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
  const [posts, setPosts] = React.useState<ReturnedPost[]>([createPsuedoPost(props.id, "animation")]);
  const [postTitle, setPostTitle] = React.useState("");
  const [postMessage, setPostMessage] = React.useState("");

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
    };
  }, []);

  // /cancel(this.postCreateFetch);
  return <div>
    {posts.map((post) => <Card
      key={post.id}
      id={post.id}
      style={{marginBottom: 4}}>
      {
        post.userdata === "animation"
          ? <div>
            <CardMedia>
              <video
                style={{width: "100%"}}
                muted
                loop
                autoPlay
                src={makeUrl("/api/animation/video", {id: post.id})}>
              </video>
            </CardMedia>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                props.history.push(`/?remixId=${post.id}`);
              }}>
                Remix
            </Button>
          </div>
          : null
      }
      <CardContent>
        {post.username}
        <br/>
        {post.replyId ? <div><a href={`#${post.replyId}`}>IN REPLY TO</a><br/></div> : null}
            TITLE: {post.title}
        <br/>
            MESSAGE: {post.message}
      </CardContent>
    </Card>)}
    <Card>
      <CardContent>
        <NewPost onChange={(newTitle, newMessage) => {
          setPostTitle(newTitle);
          setPostMessage(newMessage);
        }}/>
        <Button
          variant="contained"
          color="primary"
          onClick={async () => {
            const headers = await signInIfNeeded();
            setPostTitle("");
            setPostMessage("");

            const postCreateFetch = abortableJsonFetch<PostCreate>(API_POST_CREATE, {
              postTitle,
              postMessage,
              replyId: props.id
            }, {headers});

            React.useEffect(() => () => {
              cancel(postCreateFetch);
            }, []);

            const newPost = await postCreateFetch;
            if (newPost) {
            // Append our post to the end.
              setPosts((previous) => [
                ...previous,
                createPsuedoPost(newPost.id, "comment", props.id, props.id, postTitle, postMessage)
              ]);
            }
          }}>
            Post
        </Button>
      </CardContent>
    </Card>
  </div>;
};
