import {API_THREAD_LIST, ReturnedPost} from "../../../common/common";
import {Card, CardMedia} from "@material-ui/core";
import React, {useEffect, useState} from "react";
import {abortableJsonFetch, cancel, makeUrl} from "../shared/shared";

interface ThreadsProps {
  history: import("history").History;
}

export const Threads: React.FC<ThreadsProps> = ({history}: ThreadsProps) => {
  const [
    threads,
    setThreads
  ] = useState<ReturnedPost[]>([]);

  useEffect(() => {
    const threadListFetch = abortableJsonFetch<ReturnedPost[]>(API_THREAD_LIST);
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
      {threads.map((thread) => <Card
        key={thread.id}
        style={{
          breakInside: "avoid"
        }}
        onClick={() => {
          history.push(`/thread?threadId=${thread.id}`);
        }}>
        {thread.username}
        <CardMedia
          component="video"
          src={makeUrl("/api/animation/video", {id: thread.id})}
          title="Contemplative Reptile"
        />
        <video
          style={{width: "100%"}}
          muted
          loop
          onMouseEnter={(event) => (event.target as HTMLVideoElement).play().catch(() => 0)}
          onMouseLeave={(event) => (event.target as HTMLVideoElement).pause()}
          onTouchStart={(event) => (event.target as HTMLVideoElement).play().catch(() => 0)}
          onTouchEnd={(event) => (event.target as HTMLVideoElement).pause()}
          src={makeUrl("/api/animation/video", {id: thread.id})}>
        </video>
        <div
          style={{padding: "6px", paddingTop: "0px"}}>
          TITLE: {thread.title}
        </div>
      </Card>)}
    </div>);
};
