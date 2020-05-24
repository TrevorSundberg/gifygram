import {Editor} from "./editor";
import React from "react";
import ReactDOM from "react-dom";

export interface EditorProps {
  remixId?: string;
  history: import("history").History;
}

export class EditorComponent extends React.Component<EditorProps> {
  private editor: Editor;

  public componentDidMount () {
    // eslint-disable-next-line react/no-find-dom-node
    this.editor = new Editor(ReactDOM.findDOMNode(this) as HTMLElement, this.props.history, this.props.remixId);
  }

  public componentWillUnmount () {
    this.editor.destroy();
  }

  public render () {
    return <div></div>;
  }
}
