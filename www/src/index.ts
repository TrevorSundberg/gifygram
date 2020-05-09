import FileType from "file-type";
import {uuid} from "uuidv4";

const handlers: Record<string, (request: Request, url: URL) => Promise<Response>> = {};

// `${Number.MAX_SAFE_INTEGER}`.length;
const MAX_NUMBER_LENGTH_BASE_10 = 16;

const sortKeyNewToOld = () => (Number.MAX_SAFE_INTEGER - Date.now()).toString().
  padStart(MAX_NUMBER_LENGTH_BASE_10, "0");

const parseBinaryChunks = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer);
  const result: ArrayBuffer[] = [];
  for (let index = 0; index < view.byteLength;) {
    const size = view.getUint32(index, true);
    const start = index + 4;
    const data = buffer.slice(start, start + size);
    result.push(data);
    index = start + size;
  }
  return result;
};

// TODO(trevor): Remove this once it's all hosted in the same place.
const createAccessHeaders = () => new Headers({
  "Access-Control-Allow-Origin": "*"
});
const responseOptions = () => ({headers: createAccessHeaders()});

const expectMimeType = async (buffer: ArrayBuffer, mimeType: string) => {
  const type = (await FileType.fromBuffer(buffer)) as FileType.FileTypeResult;
  if (type.mime !== mimeType) {
    throw new Error("Expected thumbnail: image/png");
  }
};

handlers["/post/create"] = async (request) => {
  const chunks = parseBinaryChunks(await request.arrayBuffer());
  const [
    jsonBinary,
    video,
    thumbnail
  ] = chunks;
  const json: string = new TextDecoder().decode(jsonBinary);

  // TODO(trevor): Use ajv to validate, for now it just checks that it's json.
  JSON.parse(json);

  await Promise.all([
    expectMimeType(video, "video/mp4"),
    expectMimeType(thumbnail, "image/png")
  ]);

  const id = uuid();
  await Promise.all([
    db.put(`post:${sortKeyNewToOld()}`, id),
    db.put(`post/json:${id}`, json),
    db.put(`post/thumbnail:${id}`, thumbnail),
    db.put(`post/video:${id}`, video)
  ]);
  return new Response(JSON.stringify({id}), responseOptions());
};

handlers["/post/list"] = async () => {
  const list = await db.list({prefix: "post:"});
  const ids = await Promise.all(list.keys.map((key) => db.get(key.name)));
  return new Response(JSON.stringify(ids), responseOptions());
};

handlers["/post/json"] = async (request, url) => {
  const result = await db.get(`post.json:${url.searchParams.get("id")}`, "text");
  return new Response(result, responseOptions());
};

handlers["/post/thumbnail"] = async (request, url) => {
  const result = await db.get(`post.thumbnail:${url.searchParams.get("id")}`, "arrayBuffer");
  return new Response(result, responseOptions());
};

handlers["/post/video"] = async (request, url) => {
  const result = await db.get(`post.video:${url.searchParams.get("id")}`, "arrayBuffer");
  return new Response(result, responseOptions());
};

const handleRequest = async (request: Request): Promise<Response> => {
  try {
    const url = new URL(decodeURI(request.url));
    return await handlers[url.pathname](request, url);
  } catch (err) {
    return new Response(JSON.stringify({err: `${err}`}), {headers: createAccessHeaders(), status: 500});
  }
};

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
