import {API_PROFILE, API_PROFILE_UPDATE, StoredUser} from "../../../common/common";
import {AbortablePromise, Auth, abortableJsonFetch, cancel} from "../shared/shared";
import Button from "@material-ui/core/Button";
import React from "react";
import TextField from "@material-ui/core/TextField";

export const Profile: React.FC = () => {
  const [user, setUser] = React.useState<StoredUser>(null);
  const [profileUpdateFetch, setProfileUpdateFetch] = React.useState<AbortablePromise<StoredUser>>(null);

  React.useEffect(() => {
    let profileFetch: AbortablePromise<StoredUser> = null;
    (async () => {
      profileFetch = abortableJsonFetch(API_PROFILE, Auth.Required);
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
      <Button
        type="submit"
        onClick={async (e) => {
          e.preventDefault();
          const profileUpdateFetchPromise = abortableJsonFetch(
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
