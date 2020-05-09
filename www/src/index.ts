const handlers: Record<string, (request: Request) => Promise<Response>> = {};

handlers["/post"] = async (request) => {
  // TODO(trevor): Remove this once it's all hosted in the same place.
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*"
  });

  const form = await request.formData();
  const json = form.get("json") as string;
  return new Response(`request method: ${json}`, {
    headers
  });
};

const handleRequest = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  return handlers[url.pathname](request);
};

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
