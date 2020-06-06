import {Editor} from "./editor";
import React from "react";

export interface EditorProps {
  remixId?: string;
  history: import("history").History;
}

export const EditorComponent: React.FC<EditorProps> = (props) => {
  let editor: Editor = null;

  React.useEffect(() => () => {
    editor.destroy();
  }, []);

  return <div ref={(div) => {
    editor = new Editor(div, props.history, props.remixId);
  }}></div>;
};
