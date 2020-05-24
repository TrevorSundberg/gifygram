export const makeUrl = (path: string, params?: Record<string, any>) => {
  const current = new URL(window.location.href);
  const url = new URL(current.hostname === "0.0.0.0"
    ? "https://www.welderengine.workers.dev"
    : current.origin);
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
    const response = await fetch(makeUrl(path, params), {signal: controller.signal, ...options});
    return checkResponseJson(await response.json());
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return null;
    }
    throw err;
  }
};

export type AbortablePromise<T> = Promise<T | null> & {controller: AbortController};

export const abortableJsonFetch = <T>(
  path: string,
  params?: Record<string, any>,
  options?: RequestInit): AbortablePromise<T> => {
  const controller = new AbortController();
  const promise = abortableJsonFetchInternal<T>(controller, path, params, options);
  const abortable = promise as AbortablePromise<T>;
  abortable.controller = controller;
  return abortable;
};

export const cancel = <T>(abortable: AbortablePromise<T>) => abortable && abortable.controller.abort();
