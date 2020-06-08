import {API_PROFILE, StoredUser} from "../../../common/common";
import {AbortablePromise, abortableJsonFetch, cancel} from "../shared/shared";
import React from "react";
import {signInIfNeeded} from "../shared/auth";

export const Profile: React.FC = () => {
  const [user, setUser] = React.useState<StoredUser>(null);

  React.useEffect(() => {
    let profileFetch: AbortablePromise<StoredUser> = null;
    (async () => {
      const headers = await signInIfNeeded();
      profileFetch = abortableJsonFetch<StoredUser>(API_PROFILE, null, {headers});
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
