import {PreviewVideo} from "./previewVideo";
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
    this.setState({posts: json.map((id) => ({id}))});
  }

  public render () {
    return <div>{
      this.state.posts.map((post) => <PreviewVideo key={post.id} id={post.id}/>)
    }</div>;
  }
}
