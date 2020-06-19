import {API_PROFILE, StoredUser} from "../../../common/common";
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
          Username: <input type="text" value={user.username}/>
        </div>
        <div>
          <TextField
            fullWidth
            label="Bio"
            value={user.bio}
            onChange={(e) => {
            }}/>
        </div>
        <Button
          type="submit"
          onClick={async () => {
            console.log('clicked');
          }}>
          Update
        </Button>
      </form>
    </div>);
};
