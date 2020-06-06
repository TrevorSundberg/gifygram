import {API_POST_CREATE, API_POST_LIST, ReturnedPost} from "../../../common/common";
import {abortableJsonFetch, cancel, makeUrl} from "../shared/shared";
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

interface ThreadState {
  posts: ReturnedPost[];
  postTitle: string;
  postMessage: string;
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
  return <div
    style={{
      borderRadius: "3px",
      backgroundColor: "white"
    }}>
    {posts.map((post) => <div
      key={post.id}
      id={post.id}
      style={{
        borderRadius: "3px",
        overflow: "hidden",
        backgroundColor: "white",
        marginBottom: "10px"
      }}>
      {
        post.userdata === "animation"
          ? <div>
            <video
              style={{width: "100%"}}
              muted
              loop
              autoPlay
              src={makeUrl("/api/animation/video", {id: post.id})}>
            </video>
            <button
              className="btn btn-primary"
              onClick={() => {
                props.history.push(`/?remixId=${post.id}`);
              }}>
                Remix
            </button>
          </div>
          : null
      }
      {post.username}
      <div
        style={{padding: "6px", paddingTop: "0px"}}>
        {post.replyId ? <div><a href={`#${post.replyId}`}>IN REPLY TO</a><br/></div> : null}
            TITLE: {post.title}
        <br/>
            MESSAGE: {post.message}
      </div>
    </div>)}
    <div>
          Title:<br/>
      <textarea
        id="title"
        className="md-textarea form-control"
        onChange={(value) => setPostTitle(value.target.value)}
        value={postTitle}/>
          Message:<br/>
      <textarea
        id="message"
        className="md-textarea form-control"
        value={postMessage}
        onChange={(value) => setPostMessage(value.target.value)}/>
      <button
        className="btn btn-primary"
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
      </button>
    </div>
  </div>;
};
