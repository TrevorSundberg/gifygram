import {API_PROFILE_AVATAR} from "../../../common/common";
import Avatar from "@material-ui/core/Avatar";
import React from "react";
import {makeServerUrl} from "../shared/shared";
import "./userAvatar.css"

interface UserAvatarProps {
  username: string;
  userId: string;
  avatarId: string | null;
}

export const UserAvatar: React.FC<UserAvatarProps> = (props) => {
  const {username, userId, avatarId} = props;
  if (avatarId) {
    return (
      <img
        className="customAvatar"
        width="300"
        src={makeServerUrl(API_PROFILE_AVATAR, {id: avatarId, userId})}
      />
    );
  }
  return (
    <Avatar>
      {username.slice(0, 1).toUpperCase()}
    </Avatar>
  );
}
