export const makeUrl = (path: string, params?: Record<string, any>) => {
  const url = new URL("https://www.welderengine.workers.dev");
  url.pathname = path;
  if (params) {
    for (const key of Object.keys(params)) {
      url.searchParams.set(key, params[key]);
    }
  }
  return url.href;
};
