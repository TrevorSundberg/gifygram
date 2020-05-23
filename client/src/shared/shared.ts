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
