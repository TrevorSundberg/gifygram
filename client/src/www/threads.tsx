import {checkResponseJson, makeUrl} from "../shared/shared";
import {API_THREAD_LIST} from "../../../common/common";
import React from "react";

interface Thread {
  id: string;
  title: string;
}

interface ThreadsState {
  threads: Thread[];
}

export class Threads extends React.Component<{}, ThreadsState> {
  public state: ThreadsState = {
    threads: []
  }

  public async componentDidMount () {
    const response = await fetch(makeUrl(API_THREAD_LIST));
    const threads: Thread[] = checkResponseJson(await response.json());
    this.setState({threads});
  }

  public render () {
    return (
      <div style={{
        columnCount: 4,
        columnWidth: "150px",
        columnGap: "10px"
      }}>
        {this.state.threads.map((thread) => <div
          key={thread.id}
          style={{
            borderRadius: "3px",
            overflow: "hidden",
            backgroundColor: "white",
            marginBottom: "10px",
            breakInside: "avoid"
          }}
          onClick={() => {
            window.location.href = `?threadId=${thread.id}`;
          }}>
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
        </div>)}
      </div>);
  }
}
