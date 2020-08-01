import {
  API_PROFILE_AVATAR_UPDATE,
  API_PROFILE_UPDATE,
  COLLECTION_USERS,
  StoredUser
} from "../../../common/common";
import {AbortablePromise, Auth, abortable, abortableJsonFetch, cancel} from "../shared/shared";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import {LoginUserIdContext} from "./login";
import React from "react";
import {SubmitButton} from "./submitButton";
import TextField from "@material-ui/core/TextField";
import {UserAvatar} from "./userAvatar";
import {store} from "../shared/firebase";

export const Profile: React.FC = () => {
  const [user, setUser] = React.useState<StoredUser>(null);
  const [profileUpdateFetch, setProfileUpdateFetch] = React.useState<AbortablePromise<StoredUser>>(null);
  const [userAvatar, setUserAvatar] = React.useState<File>(null);

  const loggedInUserId = React.useContext(LoginUserIdContext);
  React.useEffect(() => {
    if (loggedInUserId) {
      const profilePromise = abortable(store.collection(COLLECTION_USERS).doc(loggedInUserId).get());
      (async () => {
        const profileDoc = await profilePromise;
        if (profileDoc) {
          setUser(profileDoc.data() as StoredUser);
        }
      })();
      return () => {
        cancel(profilePromise);
      };
    }
    return () => 0;
  }, [loggedInUserId]);

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
    return <Box display="flex" justifyContent="center">
      <CircularProgress />
    </Box>;
  }
  const {minLength, maxLength} = API_PROFILE_UPDATE.props.username;
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

            try {
              const updatedUser = await profileUpdateFetchPromise;
              if (updatedUser) {
                setUser(updatedUser);
              }
            } finally {
              setProfileUpdateFetch(null);
            }
          }}>
          <TextField
            fullWidth
            label="Username"
            helperText={`Between ${minLength} and ${maxLength} letters, numbers, and dots '.'`}
            disabled={Boolean(profileUpdateFetch)}
            inputProps={{
              minLength,
              maxLength,
              pattern: API_PROFILE_UPDATE.props.username.pattern
            }}
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
