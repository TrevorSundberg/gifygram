import {
  API_PROFILE,
  API_PROFILE_AVATAR_UPDATE,
  API_PROFILE_UPDATE,
  ProfileUser
} from "../../../common/common";
import {AbortablePromise, Auth, abortableJsonFetch, cancel} from "../shared/shared";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import React from "react";
import {SubmitButton} from "./submitButton";
import TextField from "@material-ui/core/TextField";
import {UserAvatar} from "./userAvatar";

export const Profile: React.FC = () => {
  const [user, setUser] = React.useState<ProfileUser>(null);
  const [profileUpdateFetch, setProfileUpdateFetch] = React.useState<AbortablePromise<ProfileUser>>(null);
  const [userAvatar, setUserAvatar] = React.useState<File>(null);

  React.useEffect(() => {
    const profileFetch = abortableJsonFetch(API_PROFILE, Auth.Required);
    (async () => {
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
      const avatarCreatePromise = abortableJsonFetch(
        API_PROFILE_AVATAR_UPDATE,
        Auth.Required,
        {},
        userAvatar
      );
      (async () => {
        const updatedUser = await avatarCreatePromise;
        if (updatedUser) {
          setUser(updatedUser);
        }
      })();
      return () => cancel(avatarCreatePromise);
    }
    return () => 0;
  }, [userAvatar]);

  if (!user) {
    return <div>Loading</div>;
  }
  return (
    <div>
      <Box display="flex" mb={1}>
        <Box mr={1}>
          <UserAvatar
            username={user.username}
            avatarId={user.avatarId}
          />
        </Box>
        <Button component="label" variant="contained" color="primary">
          Upload Avatar
          <input
            accept="image/gif, image/jpeg, image/png"
            style={{display: "none"}}
            type="file"
            onChange={async (e) => {
              const [file] = e.target.files;
              if (file) {
                setUserAvatar(file);
              }
            }}
          />
        </Button>
      </Box>
      <Divider variant="fullWidth" />
      <Box mt={1}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const profileUpdateFetchPromise = abortableJsonFetch(
              API_PROFILE_UPDATE,
              Auth.Required,
              {
                bio: user.bio,
                username: user.username
              }
            );
            setProfileUpdateFetch(profileUpdateFetchPromise);

            const updatedUser = await profileUpdateFetchPromise;
            if (updatedUser) {
              setUser(updatedUser);
            }
            setProfileUpdateFetch(null);
          }}>
          <TextField
            fullWidth
            label="Username"
            error={!user.ownsUsername}
            helperText={user.ownsUsername ? null
              : "Another user owns this username. You may use it, but you won't be " +
                "able to give out links to your profile until you pick a unique username."}
            disabled={Boolean(profileUpdateFetch)}
            inputProps={{maxLength: API_PROFILE_UPDATE.props.username.maxLength}}
            value={user.username}
            onChange={(e) => {
              setUser({...user, username: e.target.value});
            }}/>
          <TextField
            fullWidth
            label="Bio"
            disabled={Boolean(profileUpdateFetch)}
            inputProps={{maxLength: API_PROFILE_UPDATE.props.bio.maxLength}}
            value={user.bio}
            onChange={(e) => {
              setUser({...user, bio: e.target.value});
            }}/>
          <SubmitButton submitting={Boolean(profileUpdateFetch)}>
            Update Profile
          </SubmitButton>
        </form>
      </Box>
    </div>);
};
