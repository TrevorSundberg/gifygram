import {
  API_ALL_THREADS_ID,
  API_POST_CREATE,
  API_REMIXED_THREADS_ID,
  API_THREAD_LIST_ENDING,
  API_TRENDING_THREADS_ID,
  API_VIEWED_THREAD,
  COLLECTION_LIKED,
  COLLECTION_POSTS,
  COLLECTION_USERS,
  ClientPost,
  StoredPost,
  StoredUser,
  makeLikedKey,
  userHasPermission
} from "../../../common/common";
import {
  AbortablePromise,
  Auth,
  abortable,
  abortableJsonFetch,
  cancel,
  makeLocalUrl
} from "../shared/shared";
import {PAGE_WIDTH, theme, useStyles} from "./style";
import Box from "@material-ui/core/Box";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import {LoginUserIdState} from "./login";
import Masonry from "react-masonry-css";
import {Post} from "./post";
import React from "react";
import {SubmitButton} from "./submitButton";
import TextField from "@material-ui/core/TextField";
import {store} from "../shared/firebase";

interface ThreadProps {
  // If this is set to API_ALL_THREADS_ID then it means we're listing all threads.
  threadId: string;
  history: import("history").History;
  loggedInUserId: LoginUserIdState;
}

const EMPTY_USERNAME = "\u3000";

export const Thread: React.FC<ThreadProps> = (props) => {
  const isThreadList = props.threadId.endsWith(API_THREAD_LIST_ENDING);
  const isSpecificThread = !isThreadList;
  // If we're on a specific thread, create a psuedo post for the first post that includes the video (loads quicker).
  const psuedoPosts: ClientPost[] = [];
  if (isSpecificThread) {
    psuedoPosts.push({
      id: props.threadId,
      type: "thread",
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
      username: EMPTY_USERNAME,
      avatarId: null,
      liked: false,
      canDelete: false
    });
  }
  const [posts, setPosts] = React.useState<ClientPost[]>(psuedoPosts);

  const [storedPosts, setStoredPosts] = React.useState<StoredPost[]>([]);

  React.useEffect(() => {
    if (isSpecificThread) {
      // Let the server know that we viewed this thread or remix (don't need to do anything with the result).
      const threadId = location.hash ? location.hash.slice(1) : props.threadId;
      abortableJsonFetch(API_VIEWED_THREAD, Auth.Optional, {threadId});
    }
    const postCollection = store.collection(COLLECTION_POSTS);

    const postQueries = (() => {
      switch (props.threadId) {
        case API_ALL_THREADS_ID:
          return postCollection.
            where("type", "==", "thread").
            orderBy("dateMsSinceEpoch", "desc").
            limit(20);
        case API_TRENDING_THREADS_ID:
          return postCollection.
            where("type", "==", "thread").
            orderBy("trendingScore", "desc").
            limit(6);
        case API_REMIXED_THREADS_ID:
          return postCollection.
            where("type", "==", "remix").
            orderBy("dateMsSinceEpoch", "desc").
            limit(20);
        default:
          return postCollection.
            where("threadId", "==", props.threadId).
            orderBy("dateMsSinceEpoch", "desc");
      }
    })();

    const postListPromise = abortable(postQueries.get());
    postListPromise.then((postDocs) => {
      if (postDocs) {
        const postList = postDocs.docs.map((snapshot) => snapshot.data()) as StoredPost[];
        if (isSpecificThread) {
          postList.reverse();
        }
        setPosts(postList.map((storedPost) => ({
          ...storedPost,
          // This is a special space that still takes up room.
          username: EMPTY_USERNAME,
          avatarId: null,
          liked: false,
          canDelete: storedPost.userId === props.loggedInUserId
        })));
        setStoredPosts(postList);
      }
    });

    return () => {
      cancel(postListPromise);
    };
  }, []);

  React.useEffect(() => {
    if (typeof props.loggedInUserId === "undefined" || storedPosts.length === 0) {
      return () => 0;
    }
    const amendedPostPromise = abortable((async () => {
      const loggedInUser = props.loggedInUserId
        ? (await store.collection(COLLECTION_USERS).doc(props.loggedInUserId).get()).data() as StoredUser
        : null;

      const clientPosts: ClientPost[] = await Promise.all(storedPosts.map(async (storedPost) => {
        const userDoc = await store.collection(COLLECTION_USERS).doc(storedPost.userId).get();
        const user = userDoc.data() as StoredUser | undefined;
        return {
          ...storedPost,
          username: user ? user.username : "",
          avatarId: user ? user.avatarId : null,
          liked: props.loggedInUserId
            ? (await store.collection(COLLECTION_LIKED).doc(makeLikedKey(
              storedPost.id,
              props.loggedInUserId
            )).get()).exists
            : false,
          canDelete: userHasPermission(loggedInUser, storedPost.userId)
        };
      }));
      return clientPosts;
    })());

    amendedPostPromise.then((clientPosts) => {
      if (clientPosts) {
        setPosts(clientPosts);
      }
    });

    return () => {
      cancel(amendedPostPromise);
    };
  }, [props.loggedInUserId, storedPosts]);

  const [postMessage, setPostMessage] = React.useState("");
  const [postCreateFetch, setPostCreateFetch] = React.useState<AbortablePromise<StoredPost>>(null);

  React.useEffect(() => () => {
    cancel(postCreateFetch);
  }, []);

  const classes = useStyles();

  const breakpointCols = (() => {
    if (isThreadList) {
      const maxColumns = 3;
      const columnFixedSize = PAGE_WIDTH / maxColumns;
      const columns: { default: number; [key: number]: number } = {default: maxColumns};
      for (let i = maxColumns - 1; i >= 1; --i) {
        columns[(i + 1) * columnFixedSize] = i;
      }
      return columns;
    }
    return 1;
  })();

  return <div>
    <Masonry
      breakpointCols={breakpointCols}
      className={classes.masonryGrid}
      columnClassName={classes.masonryGridColumn}>
      {posts.map((post) => <Post
        preview={isThreadList}
        key={post.id}
        post={post}
        cardStyle={{marginBottom: theme.spacing()}}
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
              const hash = post.type === "remix" ? post.id : undefined;
              props.history.push(makeLocalUrl("/thread", {threadId: post.threadId}, hash));
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
    </Masonry>
    {
      isSpecificThread
        ? <Card>
          <CardContent>
            <form style={{display: "flex", flexDirection: "row", alignItems: "flex-end"}}
              onSubmit={async (e) => {
                e.preventDefault();
                const postCreateFetchPromise = abortableJsonFetch(API_POST_CREATE, Auth.Required, {
                  message: postMessage,
                  threadId: props.threadId
                });
                setPostCreateFetch(postCreateFetchPromise);

                try {
                  const newPost = await postCreateFetchPromise;
                  if (newPost) {
                  // Append our post to the end.
                    setPosts((previous) => [
                      ...previous,
                      newPost
                    ]);
                  }
                } finally {
                  setPostCreateFetch(null);
                }
                setPostMessage("");
              }}>
              <TextField
                fullWidth
                disabled={Boolean(postCreateFetch)}
                label="Comment"
                inputProps={{
                  minLength: API_POST_CREATE.props.message.minLength,
                  maxLength: API_POST_CREATE.props.message.maxLength
                }}
                required
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
