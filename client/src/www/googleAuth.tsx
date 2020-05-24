import {AUTH_GOOGLE_CLIENT_ID} from "../../../common/common";

type GoogleAuth = Omit<gapi.auth2.GoogleAuth, "then">;

const auth2Promise = new Promise<GoogleAuth>((resolve, reject) => {
  window.gapi.load("auth2", () => {
    gapi.auth2.init({
      client_id: AUTH_GOOGLE_CLIENT_ID
    }).then((auth2) => {
      delete auth2.then;
      resolve(auth2);
    }, reject);
  });
});

export const signInIfNeeded = async () => {
  const auth2 = await auth2Promise;
  if (auth2.isSignedIn.get()) {
    return {
      Authorization: auth2.currentUser.get().getAuthResponse().id_token
    };
  }
  const result = await auth2.signIn();
  return {
    Authorization: result.getAuthResponse().id_token
  };
};

export const isSignedIn = async () => {
  const auth2 = await auth2Promise;
  return auth2.isSignedIn.get();
};

