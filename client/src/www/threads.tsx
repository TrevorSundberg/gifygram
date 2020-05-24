import {API_THREAD_LIST, ReturnedPost} from "../../../common/common";
import {AbortablePromise, abortableJsonFetch, cancel, makeUrl} from "../shared/shared";
import {Card, CardMedia} from "@material-ui/core";
import React from "react";

interface ThreadsProps {
  history: import("history").History;
}

interface ThreadsState {
  threads: ReturnedPost[];
}

export class Threads extends React.Component<ThreadsProps, ThreadsState> {
  public state: ThreadsState = {
    threads: []
  }

  private threadListFetch: AbortablePromise<ReturnedPost[]>;

  public async componentDidMount () {
    this.threadListFetch = abortableJsonFetch<ReturnedPost[]>(API_THREAD_LIST);
    const threads = await this.threadListFetch;
    if (threads) {
      this.setState({threads});
    }
  }

  public componentWillUnmount () {
    cancel(this.threadListFetch);
  }

  public render () {
    return (
      <div style={{
        columnCount: 4,
        columnWidth: "150px",
        columnGap: "10px"
      }}>
        {this.state.threads.map((thread) => <Card
          key={thread.id}
          style={{
            breakInside: "avoid"
          }}
          onClick={() => {
            this.props.history.push(`/thread?threadId=${thread.id}`);
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
  }
}
