import {API_POST_CREATE, API_POST_LIST} from "../../../common/common";
import {checkResponseJson, makeUrl} from "../shared/shared";
import React from "react";
import {signInIfNeeded} from "../shared/auth";

interface ThreadProps {
  id: string;
}

interface Post {
  id: string;
  title: string;
  message: string;
  userdata: "comment" | "animation";
  replyId: string | null;
}

interface ThreadState {
  posts: Post[];
  postTitle: string;
  postMessage: string;
}

export class Thread extends React.Component<ThreadProps, ThreadState> {
  public state: ThreadState = {
    posts: [],
    postTitle: "",
    postMessage: ""
  }

  public constructor (props: ThreadProps) {
    super(props);
    // We make a fake first post that includes the video to load it quicker.
    this.state.posts = [
      {
        id: props.id,
        message: "",
        title: "",
        userdata: "animation",
        replyId: null
      }
    ];
  }

  public async componentDidMount () {
    const response = await fetch(makeUrl(API_POST_LIST, {threadId: this.props.id}));
    const posts: Post[] = checkResponseJson(await response.json());
    posts.reverse();
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
          id={post.id}
          style={{
            borderRadius: "3px",
            overflow: "hidden",
            backgroundColor: "white",
            marginBottom: "10px",
            breakInside: "avoid"
          }}>
          {
            post.userdata === "animation"
              ? <div>
                <video
                  style={{width: "100%"}}
                  muted
                  loop
                  autoPlay
                  src={makeUrl("/api/animation/video", {id: post.id})}>
                </video>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    window.location.href = `?remixId=${post.id}`;
                  }}>
                    Remix
                </button>
              </div>
              : null
          }
          <div
            style={{padding: "6px", paddingTop: "0px"}}>
            {post.replyId ? <div><a href={`#${post.replyId}`}>IN REPLY TO</a><br/></div> : null}
            TITLE: {post.title}
            <br/>
            MESSAGE: {post.message}
          </div>
        </div>)}
        <div>
          Title:<br/>
          <textarea
            id="title"
            className="md-textarea form-control"
            onChange={(value) => this.setState({postTitle: value.target.value})}
            value={this.state.postTitle}
            autoFocus/>
          Message:<br/>
          <textarea
            id="message"
            className="md-textarea form-control"
            value={this.state.postMessage}
            onChange={(value) => this.setState({postMessage: value.target.value})}/>
          <button
            className="btn btn-primary"
            onClick={async () => {
              const headers = await signInIfNeeded();
              const title = this.state.postTitle;
              const message = this.state.postMessage;
              this.setState({postTitle: "", postMessage: ""});

              const response = await fetch(makeUrl(API_POST_CREATE, {
                title,
                message,
                replyId: this.props.id
              }), {headers});
              const newPost: {id: string} = checkResponseJson(await response.json());
              // Append our post to the end.
              this.setState((previous) => ({
                posts: [
                  ...previous.posts,
                  {
                    id: newPost.id,
                    title,
                    message,
                    userdata: "comment",
                    replyId: this.props.id
                  }
                ]
              }));
            }}>
            Post
          </button>
        </div>
      </div>);
  }
}
