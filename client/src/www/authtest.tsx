import {API_AUTHTEST, AUTH_GOOGLE_CLIENT_ID} from "../../../common/common";
import GoogleLogin, {GoogleLoginResponse} from "react-google-login";
import {checkResponseJson, makeUrl} from "../shared/shared";
import React from "react";

export const AuthTest = () => <GoogleLogin
  clientId={AUTH_GOOGLE_CLIENT_ID}
  buttonText="Login"
  onSuccess={async (event: GoogleLoginResponse) => {
    console.log("success", event);
    const response = await fetch(makeUrl(API_AUTHTEST), {
      headers: {Authorization: event.tokenId}
    });
    console.log(checkResponseJson(await response.json()));
  }}
  onFailure={(event) => console.log("fail", event)}
  isSignedIn={true}
/>;
