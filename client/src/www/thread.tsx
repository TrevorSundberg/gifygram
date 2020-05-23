import {API_POST_LIST} from "../../../common/common";
import React from "react";
import {makeUrl} from "../shared/shared";

interface ThreadProps {
  id: string;
}

interface Post {
  id: string;
  title: string;
  message: string;
  userdata: "comment" | "animation";
}

interface ThreadState {
  posts: Post[];
}

export class Thread extends React.Component<ThreadProps, ThreadState> {
  public state: ThreadState = {
    posts: []
  }

  public constructor (props: ThreadProps) {
    super(props);
    // We make a fake first post that includes the video to load it quicker.
    this.state.posts = [
      {
        id: props.id,
        message: "",
        title: "",
        userdata: "animation"
      }
    ];
  }

  public async componentDidMount () {
    const response = await fetch(makeUrl(API_POST_LIST, {threadId: this.props.id}));
    const posts: Post[] = await response.json();
    this.setState({posts});
  }

  public render () {
    return (
      <div style={{
        borderRadius: "3px",
        backgroundColor: "white"
      }}>
        {this.state.posts.map((post) => <div
          key={post.id}
          style={{
            borderRadius: "3px",
            overflow: "hidden",
            backgroundColor: "white",
            marginBottom: "10px",
            breakInside: "avoid"
          }}>
          {
            post.userdata === "animation"
              ? <video
                style={{width: "100%"}}
                muted
                loop
                autoPlay
                src={makeUrl("/api/animation/video", {id: post.id})}
                poster={makeUrl("/api/animation/thumbnail", {id: post.id})}>
              </video>
              : null
          }
          <div
            style={{padding: "6px", paddingTop: "0px"}}>
            TITLE: {post.title}
            <br/>
            MESSAGE: {post.message}
          </div>
        </div>)}
      </div>);
  }
}
