import React from "react";
import {makeUrl} from "../shared/shared";

interface Post {
  id: string;
}

interface PostsState {
  posts: Post[];
}

export class Posts extends React.Component<{}, PostsState> {
  public state: PostsState = {
    posts: []
  }

  public async componentDidMount () {
    const response = await fetch(makeUrl("/api/post/list"));
    const json: string[] = await response.json();
    const posts: Post[] = json.map((id) => ({id}));
    this.setState({posts});
  }

  public render () {
    return (
      <div style={{
        columnCount: 4,
        columnWidth: "150px",
        columnGap: "10px"
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
          <video
            style={{width: "100%"}}
            muted
            loop
            onMouseEnter={(event) => (event.target as HTMLVideoElement).play().catch(() => 0)}
            onMouseLeave={(event) => (event.target as HTMLVideoElement).pause()}
            onTouchStart={(event) => (event.target as HTMLVideoElement).play().catch(() => 0)}
            onTouchEnd={(event) => (event.target as HTMLVideoElement).pause()}
            src={makeUrl("/api/post/video", {id: post.id})}
            poster={makeUrl("/api/post/thumbnail", {id: post.id})}>
          </video>
          <div
            style={{padding: "6px", paddingTop: "0px"}}>
            test
          </div>
        </div>)}
      </div>);
  }
}
