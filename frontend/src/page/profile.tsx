import {API_PROFILE, StoredUser} from "../../../common/common";
import {AbortablePromise, Auth, abortableJsonFetch, cancel} from "../shared/shared";
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
        Username: <input type="text" value={user.username}/>
    </div>);
};
