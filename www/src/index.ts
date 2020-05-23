import {
  API_ANIMATION_CREATE,
  API_ANIMATION_JSON,
  API_ANIMATION_THUMBNAIL,
  API_ANIMATION_VIDEO,
  API_POST_CREATE,
  API_POST_CREATE_MAX_MESSAGE_LENGTH,
  API_POST_CREATE_MAX_TITLE_LENGTH,
  API_POST_LIST,
  API_THREAD_LIST
} from "../../common/common";
import FileType from "file-type";
import {getAssetFromKV} from "@cloudflare/kv-asset-handler";
import {uuid} from "uuidv4";

interface RequestInput {
  request: Request;
  url: URL;
  event: FetchEvent;
}

interface RequestOutput {
  response: Response;
}

const handlers: Record<string, (input: RequestInput) => Promise<RequestOutput>> = {};

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

export const expect = <T>(value: T | null | undefined) => {
  if (!value) {
    throw new Error(`Expected value but got ${value}`);
  }
  return value;
};

const expectUuid = (name: string, id: string | null | undefined) => {
  if (!id || !(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u).test(id)) {
    throw new Error(`Invalid uuid, got ${id}`);
  }
  return id;
};

const expectString = (name: string, value: string | null | undefined, maxLength: number): string => {
  if (typeof value !== "string") {
    throw new Error(`Expected ${name} to be a string but got ${value}`);
  }
  if (value.length > maxLength) {
    throw new Error(`String ${name} was longer than ${maxLength}: ${JSON.stringify(value)}`);
  }
  return value;
};

const expectStringParam = (input: RequestInput, name: string, maxLength: number) =>
  expectString(name, input.url.searchParams.get(name), maxLength);

const expectUuidParam = (input: RequestInput, name: string) =>
  expectUuid(name, input.url.searchParams.get(name));

const expectMimeType = async (buffer: ArrayBuffer, mimeType: string) => {
  const type = (await FileType.fromBuffer(buffer)) as FileType.FileTypeResult;
  if (type.mime !== mimeType) {
    throw new Error("Expected thumbnail: image/png");
  }
};

const postCreate = async (input: RequestInput, createThread: boolean) => {
  const title = expectStringParam(input, "title", API_POST_CREATE_MAX_TITLE_LENGTH);
  const message = expectStringParam(input, "message", API_POST_CREATE_MAX_MESSAGE_LENGTH);
  const id = uuid();

  const threadId = await (async () => {
    if (createThread && !input.url.searchParams.has("threadId")) {
      await db.put(`thread:${sortKeyNewToOld()}|${id}`, id);
      return id;
    }
    return expectUuidParam(input, "threadId");
  })();

  await Promise.all([
    db.put(`thread/post:${threadId}:${sortKeyNewToOld()}|${id}`, id),
    db.put(`post/title:${id}`, title),
    db.put(`post/message:${id}`, message)
  ]);
  return {
    response: new Response(JSON.stringify({id}), responseOptions()),
    threadId,
    id
  };
};

handlers[API_POST_CREATE] = async (input) => postCreate(input, false);

handlers[API_THREAD_LIST] = async () => {
  // TODO(trevor): Parse the id from the key '|' rather than using gets (same for API_POST_LIST).
  const list = await db.list({prefix: "thread:"});
  const ids = await Promise.all(list.keys.map((key) => db.get(key.name)));

  const threads = await Promise.all(ids.map(async (id) =>
    ({
      id,
      title: await db.get(`post/title:${id}`, "text")
    })));

  return {response: new Response(JSON.stringify(threads), responseOptions())};
};

handlers[API_POST_LIST] = async (input) => {
  const threadId = expectUuidParam(input, "threadId");
  const list = await db.list({prefix: `thread/post:${threadId}:`});
  const ids = await Promise.all(list.keys.map((key) => db.get(key.name)));
  return {response: new Response(JSON.stringify(ids), responseOptions())};
};

handlers[API_ANIMATION_CREATE] = async (input) => {
  const output = await postCreate(input, true);

  const [
    jsonBinary,
    video,
    thumbnail
  ] = parseBinaryChunks(await input.request.arrayBuffer());

  const json: string = new TextDecoder().decode(jsonBinary);
  // TODO(trevor): Use ajv to validate, for now it just checks that it's json.
  JSON.parse(json);

  await Promise.all([
    expectMimeType(video, "video/mp4"),
    expectMimeType(thumbnail, "image/png")
  ]);

  const {id} = output;
  await Promise.all([
    db.put(`animation/json:${id}`, json),
    db.put(`animation/thumbnail:${id}`, thumbnail),
    db.put(`animation/video:${id}`, video)
  ]);
  return output;
};

handlers[API_ANIMATION_JSON] = async (input) => {
  const result = await db.get(`animation/json:${expectUuidParam(input, "id")}`, "text");
  return {response: new Response(result, responseOptions())};
};

handlers[API_ANIMATION_THUMBNAIL] = async (input) => {
  const result = await db.get(`animation/thumbnail:${expectUuidParam(input, "id")}`, "arrayBuffer");
  return {response: new Response(result, responseOptions())};
};

handlers[API_ANIMATION_VIDEO] = async (input) => {
  const result = await db.get(`animation/video:${expectUuidParam(input, "id")}`, "arrayBuffer");
  return {response: new Response(result, responseOptions())};
};

const handleRequest = async (event: FetchEvent): Promise<Response> => {
  const url = new URL(decodeURI(event.request.url));
  try {
    const handler = handlers[url.pathname];
    if (handler) {
      return (await handler({request: event.request, url, event})).response;
    }
    return await getAssetFromKV(event);
  } catch (err) {
    return new Response(
      JSON.stringify({
        err: `${err}`,
        pathname: url.pathname
      }),
      {
        headers: createAccessHeaders(),
        status: 500
      }
    );
  }
};

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});
