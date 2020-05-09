import React from "react";
import {makeUrl} from "../shared/shared";

export interface PreviewVideoProps {
  id: string;
}

interface PreviewVideoState {
  isPlaying: boolean;
}

export class PreviewVideo extends React.Component<PreviewVideoProps, PreviewVideoState> {
  public state: PreviewVideoState = {
    isPlaying: false
  }

  public render () {
    return <video
      muted
      loop
      onMouseEnter={(event) => (event.target as HTMLVideoElement).play()}
      onMouseLeave={(event) => (event.target as HTMLVideoElement).pause()}
      onTouchStart={(event) => (event.target as HTMLVideoElement).play()}
      onTouchEnd={(event) => (event.target as HTMLVideoElement).pause()}
      src={makeUrl("/api/post/video", {id: this.props.id})}
      poster={makeUrl("/api/post/thumbnail", {id: this.props.id})}>
    </video>;
  }
}
