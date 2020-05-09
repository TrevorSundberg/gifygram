const handlers: Record<string, (request: Request) => Promise<Response>> = {};

handlers["/post"] = async (request) => {
  const form = await request.formData();
  const json = form.get("json") as string;
  return new Response(`request method: ${json}`);
};

const handleRequest = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  return handlers[url.pathname](request);
};

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
