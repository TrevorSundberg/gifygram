import {Editor} from "./editor";
import React from "react";

interface EditorProps {
  remixId?: string;
  history: import("history").History;
}

export default ((props) => {
  const div = React.useRef<HTMLDivElement>();

  React.useEffect(() => {
    const editor = new Editor(div.current, props.history, props.remixId);
    return () => {
      editor.destroy();
    };
  }, []);

  return <div ref={div}></div>;
}) as React.FC<EditorProps>;
