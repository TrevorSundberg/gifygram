import {API_THREAD_LIST, ReturnedThread} from "../../../common/common";
import {abortableJsonFetch, cancel} from "../shared/shared";
import {Post} from "./post";
import React from "react";

interface ThreadsProps {
  history: import("history").History;
}

export const Threads: React.FC<ThreadsProps> = (props) => {
  const [
    threads,
    setThreads
  ] = React.useState<ReturnedThread[]>([]);

  React.useEffect(() => {
    const threadListFetch = abortableJsonFetch<ReturnedThread[]>(API_THREAD_LIST);
    threadListFetch.then((threadList) => {
      if (threadList) {
        setThreads(threadList);
      }
    });

    return () => {
      cancel(threadListFetch);
    };
  }, []);

  return (
    <div style={{
      columnCount: 4,
      columnWidth: "150px",
      columnGap: "10px"
    }}>
      {threads.map((thread) => <Post
        key={thread.id}
        post={thread}
        history={props.history}
        cardStyle={{
          breakInside: "avoid",
          position: "relative",
          marginBottom: "10px"
        }}
        onClick={() => {
          props.history.push(`/thread?threadId=${thread.id}`);
        }}
        videoProps={{
          onMouseEnter: (event) => (event.target as HTMLVideoElement).play().catch(() => 0),
          onMouseLeave: (event) => (event.target as HTMLVideoElement).pause(),
          onTouchStart: (event) => (event.target as HTMLVideoElement).play().catch(() => 0),
          onTouchEnd: (event) => (event.target as HTMLVideoElement).pause()
        }}
      />)}
    </div>);
};
