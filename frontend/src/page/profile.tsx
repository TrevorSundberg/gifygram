import {API_PROFILE, API_PROFILE_UPDATE, API_PROFILE_AVATAR_CREATE, StoredUser, StoredUserAvatar} from "../../../common/common";
import {AbortablePromise, Auth, abortableJsonFetch, cancel} from "../shared/shared";
import Button from "@material-ui/core/Button";
import React from "react";
import TextField from "@material-ui/core/TextField";
import {UserAvatar} from "./userAvatar";

export const Profile: React.FC = () => {
  const [user, setUser] = React.useState<StoredUser>(null);
  const [profileUpdateFetch, setProfileUpdateFetch] = React.useState<AbortablePromise<StoredUser>>(null);
  const [userAvatar, setUserAvatar] = React.useState<StoredUserAvatar>(null);

  React.useEffect(() => {
    let profileFetch: AbortablePromise<StoredUser> = null;
    (async () => {
      profileFetch = abortableJsonFetch<StoredUser>(API_PROFILE, Auth.Required);
      const profile = await profileFetch;
      if (profile) {
        setUser(profile);
      }
    })();

    return () => {
      cancel(profileFetch);
    };
  }, []);

  React.useEffect(() => () => {
    cancel(profileUpdateFetch);
  }, []);

  React.useEffect(() => {
    if (userAvatar) {
      const avatarCreatePromise = abortableJsonFetch<StoredUserAvatar>(
        API_PROFILE_AVATAR_CREATE,
        Auth.Required,
        {},
        {
          body: userAvatar.file,
          method: "POST"
        }
      );
      (async () => {
        const updatedUserAvatar = await avatarCreatePromise;
        if (updatedUserAvatar) {
          setUser({...user, avatarId: updatedUserAvatar.id});
        }
      })();
    }
  }, [userAvatar]);

  if (!user) {
    return <div>Loading</div>;
  }
  return (
    <form>
      <TextField
        fullWidth
        label="Username"
        value={user.username}
        onChange={(e) => {
          setUser({...user, username: e.target.value});
        }}/>
      <TextField
        fullWidth
        label="Bio"
        value={user.bio}
        onChange={(e) => {
          setUser({...user, bio: e.target.value});
        }}/>
      <input
        accept="image/*"
        style={{display: 'none'}}
        id="raised-button-file"
        multiple
        type="file"
        onChange={async (e) => {
          const [file] = e.target.files;
          setUserAvatar({...userAvatar, file});
        }}
      />
      <label htmlFor="raised-button-file">
        <Button component="span">
          Upload
        </Button>
      </label>
      <UserAvatar
        user={user}
      />
      <Button
        type="submit"
        onClick={async (e) => {
          e.preventDefault();
          const profileUpdateFetchPromise = abortableJsonFetch<StoredUser>(
            API_PROFILE_UPDATE,
            Auth.Required,
            user,
            {method: "POST"}
          );
          setProfileUpdateFetch(profileUpdateFetchPromise);

          const updatedUser = await profileUpdateFetchPromise;
          if (updatedUser) {
            setUser(updatedUser);
          }
        }}>
        Update
      </Button>
    </form>);
};
