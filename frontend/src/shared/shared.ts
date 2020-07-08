import {AUTH_GOOGLE_CLIENT_ID} from "../../../common/common";

export const EVENT_LOGGED_IN = "loggedIn";
export const EVENT_REQUEST_LOGIN = "requestLogin";

export const THREADS_CACHE_KEY = "threads";

export type NeverAsync<T = void> = T;

export class Deferred<T> implements Promise<T> {
  private resolveSelf;

  private rejectSelf;

  private promise: Promise<T>

  public constructor () {
    this.promise = new Promise((resolve, reject) => {
      this.resolveSelf = resolve;
      this.rejectSelf = reject;
    });
  }

  public then<TResult1 = T, TResult2 = never> (
    onfulfilled?: ((value: T) =>
    TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) =>
    TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  public catch<TResult = never> (onrejected?: ((reason: any) =>
  TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult> {
    return this.promise.then(onrejected);
  }

  public finally (onfinally?: (() => void) | undefined | null): Promise<T> {
    console.log(onfinally);
    throw new Error("Not implemented");
  }

  public resolve (val: T) {
    this.resolveSelf(val);
  }

  public reject (reason: any) {
    this.rejectSelf(reason);
  }

  public [Symbol.toStringTag]: "Promise"
}

export class RequestLoginEvent extends Event {
  public deferredLoginPicked = new Deferred<void>();
}

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
let googleAuth2: GoogleAuth = null;
auth2Promise.then((auth2) => {
  googleAuth2 = auth2;
});

const LOCAL_STORAGE_KEY_DEV_USER = "devUser";

export interface AuthUser {
  jwt: string;
  id: string;
}

export const getAuthIfSignedIn = async (): Promise<AuthUser | null> => {
  if (isDevEnvironment()) {
    const user = localStorage.getItem(LOCAL_STORAGE_KEY_DEV_USER);
    if (user) {
      return {jwt: user, id: user};
    }
    return null;
  }
  const auth2 = await auth2Promise;
  if (auth2.isSignedIn.get()) {
    const userGoogle = auth2.currentUser.get();
    return {jwt: userGoogle.getAuthResponse().id_token, id: userGoogle.getId()};
  }
  return null;
};

export class LoginEvent extends Event {
  public userId: string;

  public constructor (userId: string) {
    super(EVENT_LOGGED_IN);
    this.userId = userId;
  }
}

const triggerLoggedIn = (userId: string) => window.dispatchEvent(new LoginEvent(userId));

export const signInIfNeeded = async () => {
  const auth = await getAuthIfSignedIn();
  if (auth) {
    return;
  }

  const requestLogin = new RequestLoginEvent(EVENT_REQUEST_LOGIN);
  window.dispatchEvent(requestLogin);

  await requestLogin.deferredLoginPicked;
};

// Don't await before here because this creates a popup (needs synchronous trusted click event)
export const signInWithGoogle = (): NeverAsync<Promise<void> | null> => {
  if (isDevEnvironment()) {
    // eslint-disable-next-line no-alert
    const username = prompt("Pick a unique dev username");
    if (!username) {
      throw new Error("Dev username was empty");
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_DEV_USER, username);
    triggerLoggedIn(username);
    return null;
  }

  // We know googleAuth2 is not null because getAuthIfSignedIn should have been called before this.
  return googleAuth2.signIn().then((userGoogle) => {
    triggerLoggedIn(userGoogle.getId());
  });
};

const applyPathAndParams = (url: URL, path: string, params?: Record<string, any>) => {
  url.pathname = path;
  if (params) {
    for (const key of Object.keys(params)) {
      url.searchParams.set(key, params[key]);
    }
  }
};

export const makeServerUrl = (path: string, params?: Record<string, any>) => {
  const url = new URL(window.location.origin);
  if (isDevEnvironment()) {
    url.port = "3000";
  }
  applyPathAndParams(url, path, params);
  return url.href;
};

export const makeLocalUrl = (path: string, params?: Record<string, any>, hash?: string) => {
  const url = new URL(window.location.origin);
  applyPathAndParams(url, path, params);
  if (hash) {
    url.hash = hash;
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
    const authUser = await getAuthIfSignedIn();
    const authHeaders = authUser
      ? {Authorization: authUser.jwt}
      : null;
    try {
      const response = await fetch(makeServerUrl(path, params), {
        signal: controller.signal,
        ...options,
        headers: {
          ...options?.headers,
          ...authHeaders
        }
      });
      return checkResponseJson(await response.json());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }
      throw err;
    }
  })();
  const abortable = promise as AbortablePromise<T>;
  abortable.controller = controller;
  return abortable;
};

export const cancel = <T>(abortable: AbortablePromise<T>) => abortable && abortable.controller.abort();
