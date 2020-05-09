import {uuid} from "uuidv4";

const handlers: Record<string, (request: Request) => Promise<Response>> = {};

const sortableDate = () => Date.now().toString().
  padStart(20, "0");

handlers["/post"] = async (request) => {
  // TODO(trevor): Remove this once it's all hosted in the same place.
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*"
  });

  const form = await request.formData();
  const json = form.get("json") as string;
  const id = uuid();
  await db.put(`post:${sortableDate()}`, id);
  await db.put(`post.json:${id}`, json);
  return new Response(`${id}: ${json}`, {
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
