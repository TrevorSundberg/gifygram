import {API_PROFILE, API_PROFILE_UPDATE, StoredUser} from "../../../common/common";
import {AbortablePromise, Auth, abortableJsonFetch, cancel} from "../shared/shared";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import React from "react";

export const Profile: React.FC = () => {
  const [user, setUser] = React.useState<StoredUser>(null);

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
          user.username = e.target.value;
          setUser(user);
        }}/>
      <TextField
        fullWidth
        label="Bio"
        value={user.bio}
        onChange={(e) => {
          user.bio = e.target.value;
          setUser(user);
        }}/>
      <Button
        type="submit"
        onClick={async (e) => {
          e.preventDefault();
          const profileUpdateFetchPromise = abortableJsonFetch<StoredUser>(
            API_PROFILE_UPDATE,
            Auth.Required,
            user
          );

          const updatedUser = await profileUpdateFetchPromise;
          if (updatedUser) {
            setUser(updatedUser);
          }
        }}>
        Update
      </Button>
    </form>);
};
