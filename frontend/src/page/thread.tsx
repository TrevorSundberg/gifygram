import {
  API_ALL_THREADS_ID,
  API_AMENDED_LIST,
  API_POST_CREATE,
  API_POST_LIST,
  API_TRENDING_THREADS_ID,
  AmendedQuery,
  ClientPost,
  StoredPost
} from "../../../common/common";
import {
  AbortablePromise,
  Auth,
  abortableJsonFetch,
  cancel,
  intersectAndMergeLists,
  makeLocalUrl
} from "../shared/shared";
import Box from "@material-ui/core/Box";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import {LoginUserIdContext} from "./login";
import {Post} from "./post";
import React from "react";
import {SubmitButton} from "./submitButton";
import TextField from "@material-ui/core/TextField";

interface ThreadProps {
  // If this is set to API_ALL_THREADS_ID then it means we're listing all threads.
  threadId: string;
  history: import("history").History;
}

export const Thread: React.FC<ThreadProps> = (props) => {
  const isThreadList = props.threadId === API_ALL_THREADS_ID || props.threadId === API_TRENDING_THREADS_ID;
  const isSpecificThread = !isThreadList;
  // If we're on a specific thread, create a psuedo post for the first post that includes the video (loads quicker).
  const psuedoPosts: ClientPost[] = [];
  if (isSpecificThread) {
    psuedoPosts.push({
      id: props.threadId,
      isThread: true,
      threadId: props.threadId,
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
      dateMsSinceEpoch: Date.now(),
      likes: 0,
      likesSecondsFromBirthAverage: 0,
      trendingScore: 0,
      views: 0,
      username: "",
      avatarId: null,
      liked: false,
      canDelete: false,
      cached: true
    });
  }
  const [posts, setPosts] = React.useState<ClientPost[]>(psuedoPosts);

  const [storedPostArrays, setStoredPostArrays] = React.useState<StoredPost[][]>([]);

  React.useEffect(() => {
    const postListFetch = abortableJsonFetch(API_POST_LIST, Auth.Optional, {
      threadId: props.threadId
    });
    postListFetch.then((postList) => {
      if (postList) {
        if (isSpecificThread) {
          postList.reverse();
        }
        setPosts(postList.map((storedPost) => ({
          ...storedPost,
          // This is a special space that still takes up room.
          username: "\u3000",
          avatarId: null,
          liked: false,
          canDelete: false
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
    if (typeof loggedInUserId === "undefined" || storedPostArrays.length === 0) {
      return () => 0;
    }
    const fetches = storedPostArrays.map((storedPosts) => {
      const queries: AmendedQuery[] = storedPosts.map((storedPost) => ({
        id: storedPost.id,
        userId: storedPost.userId
      }));
      const amendedListFetch = abortableJsonFetch(API_AMENDED_LIST, Auth.Optional, {queries});
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

  const [postMessage, setPostMessage] = React.useState("");
  const [postCreateFetch, setPostCreateFetch] = React.useState<AbortablePromise<StoredPost>>(null);

  React.useEffect(() => () => {
    cancel(postCreateFetch);
  }, []);

  return <div style={
    isThreadList
      ? {
        columnCount: 3,
        columnWidth: "240px",
        columnGap: "10px"
      }
      : null}>
    {posts.map((post) => <Post
      preview={isThreadList}
      key={post.id}
      post={post}
      cardStyle={
        isThreadList
          ? {
            breakInside: "avoid",
            position: "relative",
            marginBottom: "10px",
            overflow: "visible"
          }
          : {marginBottom: 4}}
      videoProps={
        isThreadList
          ? {
            tabIndex: 0,
            onMouseEnter: (event) => (event.target as HTMLVideoElement).play().catch(() => 0),
            onMouseLeave: (event) => (event.target as HTMLVideoElement).pause(),
            onTouchStart: (event) => {
              const element = event.target as HTMLVideoElement;
              element.focus({preventScroll: true});
              element.play().catch(() => 0);
            },
            onBlur: (event) => (event.target as HTMLVideoElement).pause()
          }
          : {autoPlay: true}}
      onClick={
        isThreadList
          ? () => {
            props.history.push(makeLocalUrl("/thread", {threadId: post.id}));
          }
          : null}
      history={props.history}
      onTrashed={() => {
        if (post.id === post.threadId) {
          // Deleting the entire thread, so go back to home/root and don't keep this entry in history.
          props.history.replace(makeLocalUrl("/"));
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
    {
      isSpecificThread
        ? <Card>
          <CardContent>
            <form style={{display: "flex", flexDirection: "row", alignItems: "flex-end"}}
              onSubmit={async (e) => {
                e.preventDefault();
                const postCreateFetchPromise = abortableJsonFetch(API_POST_CREATE, Auth.Required, {
                  message: postMessage,
                  replyId: props.threadId
                });
                setPostCreateFetch(postCreateFetchPromise);

                const newPost = await postCreateFetchPromise;
                if (newPost) {
                  // Append our post to the end.
                  setPosts((previous) => [
                    ...previous,
                    newPost
                  ]);
                }
                setPostCreateFetch(null);
                setPostMessage("");
              }}>
              <TextField
                fullWidth
                disabled={Boolean(postCreateFetch)}
                label="Comment"
                inputProps={{maxLength: API_POST_CREATE.props.message.maxLength}}
                value={postMessage}
                onChange={(e) => {
                  setPostMessage(e.target.value);
                }}/>
              <Box mt={1} ml={1}>
                <SubmitButton
                  submitting={Boolean(postCreateFetch)}>
                  Post
                </SubmitButton>
              </Box>
            </form>
          </CardContent>
        </Card>
        : null
    }
  </div>;
};
