import {API_THREAD_LIST, ReturnedThread} from "../../../common/common";
import {THREADS_CACHE_KEY, abortableJsonFetch, cancel} from "../shared/shared";
import {cacheGetArrayOrNull, cacheMergeIntoArray} from "../shared/cache";
import {LoginContext} from "./login";
import {Post} from "./post";
import React from "react";

interface ThreadsProps {
  history: import("history").History;
}

export const Threads: React.FC<ThreadsProps> = (props) => {
  const [
    threads,
    setThreads
  ] = React.useState<ReturnedThread[]>(cacheGetArrayOrNull<ReturnedThread>(THREADS_CACHE_KEY) || []);

  const loggedIn = React.useContext(LoginContext);

  React.useEffect(() => {
    const threadListFetch = abortableJsonFetch<ReturnedThread[]>(API_THREAD_LIST);
    threadListFetch.then((threadList) => {
      if (threadList) {
        cacheMergeIntoArray(THREADS_CACHE_KEY, threadList);
        setThreads(threadList);
      }
    });

    return () => {
      cancel(threadListFetch);
    };
  }, [loggedIn]);

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
