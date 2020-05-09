const handleRequest = async (request: Request): Promise<Response> => new Response(`request method: ${request.method}`);

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
