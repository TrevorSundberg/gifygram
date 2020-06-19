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
    <div>
      <form>
        <div>
          <TextField
            fullWidth
            label="Username"
            value={user.username}
            onChange={(e) => {
              setUser(user);
            }}/>
        </div>
        <div>
          <TextField
            fullWidth
            label="Bio"
            value={user.bio}
            onChange={(e) => {
              setUser(user);
            }}/>
        </div>
        <Button
          type="submit"
          onClick={async () => {
            const profileUpdateFetchPromise = abortableJsonFetch<StoredUser>(
              API_PROFILE_UPDATE,
              Auth.Required,
              user
            );

            await profileUpdateFetchPromise;
          }}>
          Update
        </Button>
      </form>
    </div>);
};
