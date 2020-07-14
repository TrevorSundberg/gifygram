import {API_PROFILE_AVATAR, StoredUser} from "../../../common/common";
import Avatar from "@material-ui/core/Avatar";
import React from "react";
import {makeServerUrl} from "../shared/shared";

interface UserAvatarProps {
  user: StoredUser;
}

export const UserAvatar: React.FC<UserAvatarProps> = (props) => {
  const {user} = props;
  if (user.avatarId) {
    return (
      <img
        width="300"
        src={makeServerUrl(API_PROFILE_AVATAR, {id: user.avatarId, userId: user.id})}
      />
    );
  }
  return (
    <Avatar>
      {user.username.slice(0, 1).toUpperCase()}
    </Avatar>
  );
}
