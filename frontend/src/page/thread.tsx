import {API_POST_CREATE, API_POST_CREATE_MAX_MESSAGE_LENGTH, API_POST_LIST, ReturnedPost} from "../../../common/common";
import {AbortablePromise, Auth, abortableJsonFetch, cancel} from "../shared/shared";
import {cacheAdd, cacheGetArrayOrNull, cacheMergeIntoArray} from "../shared/cache";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import {LoginUserIdContext} from "./login";
import {Post} from "./post";
import React from "react";
import TextField from "@material-ui/core/TextField";

interface ThreadProps {
  id: string;
  history: import("history").History;
}

export const Thread: React.FC<ThreadProps> = (props) => {
  // Try to load the first posts from the cache, or create a psuedo post that includes the video to load it quicker.
  const [posts, setPosts] = React.useState<ReturnedPost[]>(cacheGetArrayOrNull<ReturnedPost>(props.id) || [
    {
      id: props.id,
      threadId: props.id,
      title: "",
      message: "",
      userdata: {
        type: "animation",
        attribution: [],
        width: 0,
        height: 0
      },
      replyId: null,
      userId: "",
      username: "",
      liked: false,
      likes: 0,
      views: 0,
      cached: true,
      sortKey: ""
    }
  ]);
  const [postMessage, setPostMessage] = React.useState("");
  const [postCreateFetch, setPostCreateFetch] = React.useState<AbortablePromise<ReturnedPost>>(null);

  const loggedInUserId = React.useContext(LoginUserIdContext);

  React.useEffect(() => {
    const postListFetch = abortableJsonFetch<ReturnedPost[]>(API_POST_LIST, Auth.Optional, {threadId: props.id});
    postListFetch.then((postList) => {
      if (postList) {
        cacheMergeIntoArray(props.id, postList);
        postList.reverse();
        setPosts(postList);
      }
    });

    return () => {
      cancel(postListFetch);
    };
  }, [loggedInUserId]);


  React.useEffect(() => () => {
    cancel(postCreateFetch);
  }, []);

  return <div>
    {posts.map((post) => <Post
      preview={false}
      key={post.id}
      post={post}
      cardStyle={{marginBottom: 4}}
      videoProps={{autoPlay: true}}
      history={props.history}
      onTrashed={() => {
        if (post.id === post.threadId) {
          // Deleting the entire thread, so go back to home/root and don't keep this entry in history.
          props.history.replace("/");
        } else {
          // Remove the post from the list.
          setPosts((previous) => {
            const newPosts = [...previous];
            const index = newPosts.indexOf(post);
            newPosts.splice(index, 1);
            return newPosts;
          });
        }
      }}/>)}
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
              const postCreateFetchPromise = abortableJsonFetch<ReturnedPost>(API_POST_CREATE, Auth.Required, {
                message: postMessage,
                replyId: props.id
              });
              setPostCreateFetch(postCreateFetchPromise);

              const newPost = await postCreateFetchPromise;
              if (newPost) {
                cacheAdd(newPost.threadId, newPost);
                // Append our post to the end.
                setPosts((previous) => [
                  ...previous,
                  newPost
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
