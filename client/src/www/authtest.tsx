import {checkResponseJson, makeUrl} from "../shared/shared";
import {API_AUTHTEST} from "../../../common/common";
import React from "react";
import {signInIfNeeded} from "./googleAuth";

export const AuthTest = () => <button
  onClick={async () => {
    const headers = await signInIfNeeded();
    const response = await fetch(makeUrl(API_AUTHTEST), {
      headers
    });
    console.log(checkResponseJson(await response.json()));
  }}>
    hello
</button>;
