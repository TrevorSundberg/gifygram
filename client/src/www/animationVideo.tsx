import {API_ANIMATION_VIDEO} from "../../../common/common";
import React from "react";
import {makeUrl} from "../shared/shared";
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
    className={classes.videoAspectRatioWrapper}
    style={{
      paddingBottom: `${props.height / props.width * 100}%`
    }}>
    <video
      width={props.width}
      height={props.height}
      className={classes.video}
      muted
      loop
      src={makeUrl(API_ANIMATION_VIDEO, {id: props.id})}
      {...props}>
    </video>
  </div>;
};
