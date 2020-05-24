import {API_PROFILE, StoredUser} from "../../../common/common";
import {AbortablePromise, abortableJsonFetch, cancel} from "../shared/shared";
import React from "react";
import {signInIfNeeded} from "../shared/auth";

interface ProfileProps {
  history: import("history").History;
}

interface ProfileState {
  user: StoredUser;
}

export class Profile extends React.Component<ProfileProps, ProfileState> {
  public state: ProfileState = {
    user: null
  }

  private profileFetch: AbortablePromise<StoredUser>;

  public async componentDidMount () {
    const headers = await signInIfNeeded();
    this.profileFetch = abortableJsonFetch<StoredUser>(API_PROFILE, null, {headers});
    const user = await this.profileFetch;
    if (user) {
      this.setState({user});
    }
  }

  public componentWillUnmount () {
    cancel(this.profileFetch);
  }

  public render () {
    if (!this.state.user) {
      return <div>Loading</div>;
    }
    return (
      <div>
        Username: <input type="text" value={this.state.user.username}/>
      </div>);
  }
}
