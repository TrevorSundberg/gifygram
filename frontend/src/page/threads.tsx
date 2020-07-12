import {
  API_AMENDED_LIST,
  API_THREAD_LIST,
  AmendedPost,
  AmendedQuery,
  ClientThread,
  StoredThread
} from "../../../common/common";
import {Auth, THREADS_CACHE_KEY, abortableJsonFetch, cancel} from "../shared/shared";
import {cacheGetArrayOrNull, cacheMergeIntoArray, intersectAndMergeLists} from "../shared/cache";
import {LoginUserIdContext} from "./login";
import {Post} from "./post";
import React from "react";

interface ThreadsProps {
  history: import("history").History;
}

export const Threads: React.FC<ThreadsProps> = (props) => {
  const [
    threads,
    setThreads
  ] = React.useState<ClientThread[]>(cacheGetArrayOrNull<ClientThread>(THREADS_CACHE_KEY) || []);

  const [storedPostArrays, setStoredPostArrays] = React.useState<StoredThread[][]>([]);

  React.useEffect(() => {
    const threadListFetch = abortableJsonFetch<StoredThread[]>(API_THREAD_LIST);
    threadListFetch.then((threadList) => {
      if (threadList) {
        cacheMergeIntoArray(THREADS_CACHE_KEY, threadList);
        setThreads(threadList.map((storedPost) => ({
          ...storedPost,
          username: "",
          liked: false,
          likes: 0,
          views: 0
        })));
        setStoredPostArrays([...storedPostArrays, threadList]);
      }
    });

    return () => {
      cancel(threadListFetch);
    };
  }, []);

  const loggedInUserId = React.useContext(LoginUserIdContext);

  React.useEffect(() => {
    const fetches = storedPostArrays.map((storedPosts) => {
      const queries: AmendedQuery[] = storedPosts.map((storedPost) => ({
        id: storedPost.id,
        userId: storedPost.userId,
        requestViews: storedPost.id === storedPost.threadId
      }));
      const amendedListFetch = abortableJsonFetch<AmendedPost[]>(API_AMENDED_LIST, Auth.Optional, {queries});
      amendedListFetch.then((amendedList) => {
        if (amendedList) {
          setThreads(intersectAndMergeLists(threads, amendedList));
        }
      });
      return amendedListFetch;
    });

    return () => {
      fetches.forEach(cancel);
    };
  }, [loggedInUserId, storedPostArrays]);

  return (
    <div style={{
      columnCount: 4,
      columnWidth: "175px",
      columnGap: "10px"
    }}>
      {threads.map((thread) => <Post
        preview={true}
        key={thread.id}
        post={thread}
        history={props.history}
        cardStyle={{
          breakInside: "avoid",
          position: "relative",
          marginBottom: "10px",
          overflow: "visible"
        }}
        onClick={() => {
          props.history.push(`/thread?threadId=${thread.id}`);
        }}
        videoProps={{
          tabIndex: 0,
          onMouseEnter: (event) => (event.target as HTMLVideoElement).play().catch(() => 0),
          onMouseLeave: (event) => (event.target as HTMLVideoElement).pause(),
          onTouchStart: (event) => {
            const element = event.target as HTMLVideoElement;
            element.focus({preventScroll: true});
            element.play().catch(() => 0);
          },
          onBlur: (event) => (event.target as HTMLVideoElement).pause()
        }}
      />)}
    </div>);
};
