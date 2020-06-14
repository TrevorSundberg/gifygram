import {AUTH_GOOGLE_CLIENT_ID} from "../../../common/common";

// Assume we're in dev if the protocol is http: (not https:)
export const isDevEnvironment = () => window.location.protocol === "http:";

type GoogleAuth = Omit<gapi.auth2.GoogleAuth, "then">;

const auth2Promise = new Promise<GoogleAuth>((resolve, reject) => {
  if (isDevEnvironment()) {
    resolve(null);
    return;
  }
  const script = document.createElement("script");
  script.onload = () => {
    window.gapi.load("auth2", () => {
      gapi.auth2.init({
        client_id: AUTH_GOOGLE_CLIENT_ID
      }).then((auth2) => {
        delete auth2.then;
        resolve(auth2);
      }, reject);
    });
  };
  script.src = "https://apis.google.com/js/api.js";
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
});

export const getAuthIfSignedIn = async (): Promise<string | null> => {
  if (isDevEnvironment()) {
    const devUser = "devUser";
    // eslint-disable-next-line no-alert
    const username = localStorage.getItem(devUser) || prompt("Pick a unique dev username");
    if (!username) {
      throw new Error("Dev username was empty");
    }
    localStorage.setItem(devUser, username);
    return username;
  }
  const auth2 = await auth2Promise;
  if (auth2.isSignedIn.get()) {
    return auth2.currentUser.get().getAuthResponse().id_token;
  }
  return null;
};

export const signInIfNeeded = async () => {
  const auth = await getAuthIfSignedIn();
  if (!auth) {
    const auth2 = await auth2Promise;
    await auth2.signIn();
  }
};

export const makeServerUrl = (path: string, params?: Record<string, any>) => {
  const url = new URL(window.location.origin);
  if (isDevEnvironment()) {
    url.port = "3000";
  }
  url.pathname = path;
  if (params) {
    for (const key of Object.keys(params)) {
      url.searchParams.set(key, params[key]);
    }
  }
  return url.href;
};

export interface ResponseJson {
  err?: string;
}

export const checkResponseJson = <T extends ResponseJson>(json: T) => {
  if (json.err) {
    console.warn(json);
    throw new Error(json.err);
  }
  return json;
};

const abortableJsonFetchInternal = async <T>(
  controller: AbortController,
  path: string,
  params?: Record<string, any>,
  options?: RequestInit): Promise<T | null> => {
  try {
    const response = await fetch(makeServerUrl(path, params), {signal: controller.signal, ...options});
    return checkResponseJson(await response.json());
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return null;
    }
    throw err;
  }
};

export type AbortablePromise<T> = Promise<T | null> & {controller: AbortController};

export enum Auth {
  Optional,
  Required,
}

export const abortableJsonFetch = <T>(
  path: string,
  auth: Auth = Auth.Optional,
  params?: Record<string, any>,
  options?: RequestInit): AbortablePromise<T> => {
  const controller = new AbortController();
  const promise = (async () => {
    if (auth === Auth.Required) {
      await signInIfNeeded();
    }
    return abortableJsonFetchInternal<T>(controller, path, params, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: await getAuthIfSignedIn()
      }
    });
  })();
  const abortable = promise as AbortablePromise<T>;
  abortable.controller = controller;
  return abortable;
};

export const cancel = <T>(abortable: AbortablePromise<T>) => abortable && abortable.controller.abort();
