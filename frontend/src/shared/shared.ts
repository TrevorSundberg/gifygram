import {Api} from "../../../common/common";
import firebase from "firebase/app";

export const EVENT_REQUEST_LOGIN = "requestLogin";
export const EVENT_MENU_OPEN = "menuOpen";

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

export interface AuthUser {
  jwt: string;
  id: string;
}

export const signInIfNeeded = async () => {
  if (firebase.auth().currentUser) {
    return;
  }

  const requestLogin = new RequestLoginEvent(EVENT_REQUEST_LOGIN);
  window.dispatchEvent(requestLogin);

  await requestLogin.deferredLoginPicked;
};

const applyPathAndParams = (url: URL, path: string, params?: Record<string, any>) => {
  url.pathname = path;
  if (params) {
    for (const key of Object.keys(params)) {
      const value = params[key];
      if (typeof value !== "undefined") {
        url.searchParams.set(key, JSON.stringify(value));
      }
    }
  }
};

export const makeServerUrl = <InputType>(api: Api<InputType, any>, params: InputType = null) => {
  const url = new URL(window.location.origin);
  applyPathAndParams(url, api.pathname, params);
  return url.href;
};

export const makeFullLocalUrl = (path: string, params?: Record<string, any>, hash?: string) => {
  const url = new URL(window.location.origin);
  applyPathAndParams(url, path, params);
  if (hash) {
    url.hash = hash;
  }
  return url.href;
};

export const makeLocalUrl = (path: string, params?: Record<string, any>, hash?: string) => {
  // Always return a rooted url without the origin: /something
  const url = new URL(makeFullLocalUrl(path, params, hash));
  return url.href.substr(url.origin.length);
};

export interface MergableItem {
  id: string;
}

export const intersectAndMergeLists = <A extends MergableItem, B extends MergableItem>(a: A[], b: B[]): (A & B)[] => {
  const result: (A & B)[] = [];
  for (const aItem of a) {
    const bItem = b.find((bTest) => bTest.id === aItem.id);
    if (bItem) {
      result.push({...aItem, ...bItem});
    }
  }
  return result;
};

export class NonAlertingError extends Error {}

export interface ResponseJson {
  err?: string;
  stack?: string;
}

export const checkResponseJson = <T extends ResponseJson>(json: T) => {
  if (json.err) {
    console.warn(json);
    const error = new Error(json.err);
    error.stack = json.stack;
    throw error;
  }
  return json;
};

export type AbortablePromise<T> = Promise<T | null> & {controller: AbortController};

export enum Auth {
  Optional,
  Required,
}

export const abortable = <T>(promise: Promise<T>, abortController?: AbortController): AbortablePromise<T> => {
  const controller = abortController || new AbortController();
  const abortablePromise = new Promise((resolve, reject) => {
    promise.then((value) => {
      if (controller.signal.aborted) {
        resolve(null);
      } else {
        resolve(value);
      }
    }, reject);
  }) as AbortablePromise<T>;
  abortablePromise.controller = controller;
  return abortablePromise;
};

let fetchQueue: Promise<any> = Promise.resolve();

export const abortableJsonFetch = <InputType, OutputType>(
  api: Api<InputType, OutputType>,
  auth: Auth = Auth.Optional,
  params: InputType = null,
  body: BodyInit = null): AbortablePromise<OutputType> => {
  const controller = new AbortController();
  const promise = (async () => {
    if (isDevEnvironment()) {
      // Serialize fetch in dev because Firestore transactions fail if more than one is going on the emulator.
      try {
        await fetchQueue;
      // eslint-disable-next-line no-empty
      } catch {}
    }
    if (auth === Auth.Required) {
      await signInIfNeeded();
    }
    const authHeaders = firebase.auth().currentUser
      ? {Authorization: await firebase.auth().currentUser.getIdToken()}
      : null;
    try {
      const response = await fetch(makeServerUrl(api, params), {
        signal: controller.signal,
        method: "POST",
        body,
        headers: {
          ...authHeaders,
          "content-type": "application/octet-stream"
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
  fetchQueue = promise;
  return abortable(promise, controller);
};

export const cancel = <T>(promise: AbortablePromise<T>) => promise && promise.controller.abort();
