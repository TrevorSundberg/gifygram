import DeleteIcon from "@material-ui/icons/Delete";
import {Editor} from "./editor";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import InsertPhotoIcon from "@material-ui/icons/InsertPhoto";
import MenuIcon from "@material-ui/icons/Menu";
import React from "react";
import SendIcon from "@material-ui/icons/Send";
import SvgIcon from "@material-ui/core/SvgIcon";
import TextFieldsIcon from "@material-ui/icons/TextFields";
import TheatersIcon from "@material-ui/icons/Theaters";
import Tooltip from "@material-ui/core/Tooltip";
import TrendingUpIcon from "@material-ui/icons/TrendingUp";
import VisibilityIcon from "@material-ui/icons/Visibility";
import {theme} from "../page/style";
import {withStyles} from "@material-ui/core/styles";

interface EditorProps {
  remixId?: string;
  history: import("history").History;
}

const StyledTooltip = withStyles({
  tooltip: {
    fontSize: theme.typography.body1.fontSize
  }
})(Tooltip);

interface EditorButtonProps {
  id: string;
  title: string;
  icon: typeof SvgIcon;
}

const EditorButton: React.FC<EditorButtonProps> = (props) => {
  const Icon = props.icon;
  return <StyledTooltip
    placement="left"
    enterDelay={0}
    enterTouchDelay={0}
    leaveTouchDelay={500}
    title={props.title}>
    <Icon className="button" id={props.id}></Icon>
  </StyledTooltip>;
};

export default ((props) => {
  const div = React.useRef<HTMLDivElement>();

  React.useEffect(() => {
    const editor = new Editor(div.current, props.history, props.remixId);
    return () => {
      editor.destroy();
    };
  }, []);

  return <div ref={div}>
    <div id="buttons">
      <EditorButton id="menu" title="Menu" icon={MenuIcon}/>
      <EditorButton id="sticker" title="Add sticker" icon={InsertPhotoIcon}/>
      <EditorButton id="text" title="Add text" icon={TextFieldsIcon}/>
      <EditorButton id="video" title="Set the background video" icon={TheatersIcon}/>
      <EditorButton id="motion" title="Track motion" icon={TrendingUpIcon}/>
      <EditorButton id="visibility" title="Toggle visibility" icon={VisibilityIcon}/>
      <EditorButton id="delete" title="Delete selection" icon={DeleteIcon}/>
      <EditorButton id="clear" title="Clear selected keyframes" icon={HighlightOffIcon}/>
      <EditorButton id="post" title="Post your animation" icon={SendIcon}/>
    </div>
  </div>;
}) as React.FC<EditorProps>;
