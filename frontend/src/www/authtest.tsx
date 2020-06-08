import {checkResponseJson, makeServerUrl} from "../shared/shared";
import {API_AUTHTEST} from "../../../common/common";
import React from "react";
import {signInIfNeeded} from "../shared/auth";

export const AuthTest = () => <button
  onClick={async () => {
    const headers = await signInIfNeeded();
    const response = await fetch(makeServerUrl(API_AUTHTEST), {
      headers
    });
    console.log(checkResponseJson(await response.json()));
  }}>
    hello
</button>;
