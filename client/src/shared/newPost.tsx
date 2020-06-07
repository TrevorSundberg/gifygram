import {API_POST_CREATE_MAX_MESSAGE_LENGTH, API_POST_CREATE_MAX_TITLE_LENGTH} from "../../../common/common";
import React from "react";
import TextField from "@material-ui/core/TextField";

export interface NewPostProps {
  autoFocusTitle: boolean;
  onChange: (title: string, message: string) => unknown;
}

export const NewPost: React.FC<NewPostProps> = (props) => {
  const [postTitle, setPostTitle] = React.useState("");
  const [postMessage, setPostMessage] = React.useState("");

  return <div>
    <div>
      <TextField
        label="Title"
        inputProps={{maxLength: API_POST_CREATE_MAX_TITLE_LENGTH}}
        autoFocus={props.autoFocusTitle}
        value={postTitle}
        onChange={(e) => {
          setPostTitle(e.target.value);
          props.onChange(e.target.value, postMessage);
        }}/>
    </div>
    <div>
      <TextField
        label="Message"
        multiline={true}
        inputProps={{maxLength: API_POST_CREATE_MAX_MESSAGE_LENGTH}}
        value={postMessage}
        onChange={(e) => {
          setPostMessage(e.target.value);
          props.onChange(postTitle, e.target.value);
        }}/>
    </div>
  </div>;
};
