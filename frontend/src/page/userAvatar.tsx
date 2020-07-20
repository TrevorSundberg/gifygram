import {API_PROFILE_AVATAR} from "../../../common/common";
import Avatar from "@material-ui/core/Avatar";
import React from "react";
import {makeServerUrl} from "../shared/shared";
import {theme} from "./style";

interface UserAvatarProps {
  username: string;
  avatarId: string | null;
}

export const UserAvatar: React.FC<UserAvatarProps> = (props) =>
  <Avatar
    style={{backgroundColor: theme.palette.divider}}
    alt={props.username}
    src={props.avatarId
      ? makeServerUrl(API_PROFILE_AVATAR, {avatarId: props.avatarId})
      : null}>
    {props.username.slice(0, 1).toUpperCase()}
  </Avatar>;
