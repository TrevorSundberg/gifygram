import React from "react";
import {makeUrl} from "../shared/shared";

interface Post {
  id: string;
}

interface PostsState {
  posts: Post[];
}

export class Posts extends React.Component<{}, PostsState> {
  public state = {
    posts: []
  }

  public async componentDidMount () {
    const response = await fetch(makeUrl("/api/post/list"));
    const json: string[] = await response.json();
    this.setState({posts: json.map((id) => ({id}))});
  }

  public render () {
    return <div>{this.state.posts.map((post) => <div key={post.id}>
      <video
        src={makeUrl("/api/post/video", {id: post.id})}
        poster={makeUrl("/api/post/thumbnail", {id: post.id})}>
      </video>
      {post.id}
    </div>)}</div>;
  }
}
