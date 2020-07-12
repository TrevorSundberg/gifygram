import {
  API_AMENDED_LIST,
  API_POST_CREATE,
  API_POST_CREATE_MAX_MESSAGE_LENGTH,
  API_POST_LIST,
  AmendedPost,
  AmendedQuery,
  ClientPost,
  StoredPost
} from "../../../common/common";
import {AbortablePromise, Auth, abortableJsonFetch, cancel} from "../shared/shared";
import {cacheAdd, cacheGetArrayOrNull, cacheMergeIntoArray, intersectAndMergeLists} from "../shared/cache";
import Box from "@material-ui/core/Box";
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
  const [posts, setPosts] = React.useState<ClientPost[]>(cacheGetArrayOrNull<ClientPost>(props.id) || [
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
      userId: "",
      replyId: null,
      sortKey: "",
      username: "",
      liked: false,
      likes: 0,
      views: 0,
      cached: true
    }
  ]);

  const [postMessage, setPostMessage] = React.useState("");
  const [postCreateFetch, setPostCreateFetch] = React.useState<AbortablePromise<StoredPost>>(null);

  const [storedPostArrays, setStoredPostArrays] = React.useState<StoredPost[][]>([]);

  React.useEffect(() => {
    const postListFetch = abortableJsonFetch<StoredPost[]>(API_POST_LIST, Auth.Optional, {threadId: props.id});
    postListFetch.then((postList) => {
      if (postList) {
        cacheMergeIntoArray(props.id, postList);
        postList.reverse();
        setPosts(postList.map((storedPost) => ({
          ...storedPost,
          username: "",
          liked: false,
          likes: 0,
          views: 0
        })));
        setStoredPostArrays([...storedPostArrays, postList]);
      }
    });

    return () => {
      cancel(postListFetch);
    };
  }, []);

  const loggedInUserId = React.useContext(LoginUserIdContext);

  React.useEffect(() => {
    const fetches = storedPostArrays.map((storedPosts) => {
      const queries: AmendedQuery[] = storedPosts.map((storedPost) => ({
        id: storedPost.id,
        userId: storedPost.userId
      }));
      const amendedListFetch = abortableJsonFetch<AmendedPost[]>(API_AMENDED_LIST, Auth.Optional, {queries});
      amendedListFetch.then((amendedList) => {
        if (amendedList) {
          setPosts(intersectAndMergeLists(posts, amendedList));
        }
      });
      return amendedListFetch;
    });

    return () => {
      fetches.forEach(cancel);
    };
  }, [loggedInUserId, storedPostArrays]);

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
        <form style={{display: "flex", flexDirection: "row", alignItems: "flex-end"}}>
          <TextField
            fullWidth
            disabled={Boolean(postCreateFetch)}
            label="Comment"
            inputProps={{maxLength: API_POST_CREATE_MAX_MESSAGE_LENGTH}}
            value={postMessage}
            onChange={(e) => {
              setPostMessage(e.target.value);
            }}/>
          <Box mt={1} ml={1}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={Boolean(postCreateFetch)}
              onClick={async () => {
                const postCreateFetchPromise = abortableJsonFetch<ClientPost>(API_POST_CREATE, Auth.Required, {
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
          </Box>
        </form>
      </CardContent>
    </Card>
  </div>;
};
