import {Auth, abortableJsonFetch} from "../shared/shared";
import {API_AUTHTEST} from "../../../common/common";
import React from "react";

export const AuthTest = () => <button
  onClick={async () => {
    console.log(await abortableJsonFetch(API_AUTHTEST, Auth.Required));
  }}>
    hello
</button>;
