import {API_ANIMATION_VIDEO} from "../../../common/common";
import React from "react";
import {makeServerUrl} from "../shared/shared";
import {useStyles} from "./style";

export interface AnimationVideoProps extends
  React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> {
  id: string;
  width: number;
  height: number;
}

export const AnimationVideo: React.FC<AnimationVideoProps> = (props) => {
  const classes = useStyles();
  return <div
    // If this is a pseudo post, then we don't know width/height but the video may be loaded.
    style={props.width === 0
      ? null
      : {
        position: "relative",
        height: 0,
        paddingBottom: `${props.height / props.width * 100}%`
      }}>
    <video
      width={props.width}
      height={props.height}
      className={classes.video}
      muted
      loop
      src={makeServerUrl(API_ANIMATION_VIDEO, {id: props.id})}
      {...props}>
    </video>
  </div>;
};
