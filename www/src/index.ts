import {
  API_ANIMATION_CREATE,
  API_ANIMATION_JSON,
  API_ANIMATION_VIDEO,
  API_AUTHTEST,
  API_POST_CREATE,
  API_POST_CREATE_MAX_MESSAGE_LENGTH,
  API_POST_CREATE_MAX_TITLE_LENGTH,
  API_POST_LIST,
  API_THREAD_LIST,
  AUTH_GOOGLE_CLIENT_ID,
  ReturnedPost,
  StoredPost
} from "../../common/common";
import {getAssetFromKV, serveSinglePageApp} from "@cloudflare/kv-asset-handler";

// eslint-disable-next-line no-var,vars-on-top,init-declarations
declare var global: any;
// eslint-disable-next-line no-var,vars-on-top,init-declarations
var window: any = {};
global.window = window;
import {Jose} from "jose-jwe-jws";
(Jose as any).crypto = crypto;

import {uuid} from "uuidv4";

const CONTENT_TYPE_APPLICATION_JSON = "application/json";
const CONTENT_TYPE_VIDEO_MP4 = "video/mp4";

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
const createAccessHeaders = (mimeType: string) => new Headers({
  "Access-Control-Allow-Origin": "*",
  "Content-Type": mimeType || "application/octet-stream"
});
const responseOptions = (mimeType: string) => ({headers: createAccessHeaders(mimeType)});

const expect = <T>(value: T | null | undefined) => {
  if (!value) {
    throw new Error(`Expected value but got ${value}`);
  }
  return value;
};

const expectUuid = (name: string, id: string | null | undefined) => {
  if (!id || !(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u).test(id)) {
    throw new Error(`Invalid uuid ${name}, got ${id}`);
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

const videoMp4Header = new Uint8Array([
  0x00,
  0x00,
  0x00,
  0x18,
  0x66,
  0x74,
  0x79,
  0x70,
  0x6d,
  0x70,
  0x34,
  0x32,
  0x00,
  0x00,
  0x00,
  0x00,
  0x6d,
  0x70,
  0x34,
  0x32,
  0x69,
  0x73,
  0x6f,
  0x6d
]);

const expectFileHeader = async (name: string, buffer: ArrayBuffer, expectedHeader: Uint8Array) => {
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < expectedHeader.length; ++i) {
    if (bytes[i] !== expectedHeader[i]) {
      throw new Error(`File ${name} was not the correct type`);
    }
  }
};

interface User {
  id: string;
  username: string;
}

const validateJwtGoogle = async (input: RequestInput): Promise<User> => {
  const token = expectString("authorization", input.request.headers.get("authorization"), 4096);

  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  const jwks: {keys: JWKRSA[]} = await response.json();

  const cryptographer = new Jose.WebCryptographer();
  const verifier = new Jose.JoseJWS.Verifier(cryptographer, token);

  await Promise.all([jwks.keys.map((key) => verifier.addRecipient(key, key.kid, key.alg as SignAlgorithm))]);

  const results = await verifier.verify();
  const verified = results.filter((result) => result.verified);
  if (verified.length === 0) {
    throw new Error("JWT was not verified with any key");
  }

  const content = JSON.parse(verified[0].payload as string);
  if (content.iss !== "accounts.google.com") {
    throw new Error(`Invalid issuer ${content.iss}`);
  }
  if (content.aud !== AUTH_GOOGLE_CLIENT_ID) {
    throw new Error(`Invalid audience ${content.aud}`);
  }
  if (content.exp <= Math.ceil(Date.now() / 1000)) {
    throw new Error(`JWT expired ${content.exp}`);
  }
  const user: User = {
    id: content.sub,
    username: content.given_name
  };
  await db.put(`user:${user.id}`, JSON.stringify(user));
  return user;
};

const postCreate = async (input: RequestInput, createThread: boolean, userdata: any) => {
  const user = await validateJwtGoogle(input);
  const title = expectStringParam(input, "title", API_POST_CREATE_MAX_TITLE_LENGTH);
  const message = expectStringParam(input, "message", API_POST_CREATE_MAX_MESSAGE_LENGTH);
  const id = uuid();

  const replyId = input.url.searchParams.has("replyId") ? expectUuidParam(input, "replyId") : null;

  const newToOld = sortKeyNewToOld();
  const threadId = await (async () => {
    if (createThread && !replyId) {
      await db.put(`thread:${newToOld}|${id}`, id);
      return id;
    }
    const replyPost = await db.get<StoredPost>(`post:${expectUuid("replyId", replyId)}`, "json");
    const replyThreadId = replyPost!.id;
    return expectUuid("replyThreadId", replyThreadId);
  })();

  const post: StoredPost = {
    id,
    threadId,
    title,
    message,
    userdata,
    userId: user.id,
    replyId
  };

  await Promise.all([
    db.put(`thread/post:${threadId}:${newToOld}|${id}`, id),
    db.put(`post:${id}`, JSON.stringify(post))
  ]);
  return {
    response: new Response(JSON.stringify({id, threadId}), responseOptions(CONTENT_TYPE_APPLICATION_JSON)),
    threadId,
    id
  };
};

handlers[API_POST_CREATE] = async (input) => postCreate(input, false, "comment");

const getBarIds = (list: {keys: { name: string }[]}) =>
  list.keys.map((key) => key.name.split("|")[1]);

const getPostsFromIds = async (ids: string[]): Promise<ReturnedPost[]> => {
  const posts = await Promise.all(ids.map(async (id) => expect(await db.get<StoredPost>(`post:${id}`, "json"))));
  return Promise.all(posts.map(async (post) => {
    const user = await db.get<User>(`user:${post.userId}`, "json");
    return {...post, username: user!.username};
  }));
};

handlers[API_THREAD_LIST] = async () => {
  const list = await db.list({prefix: "thread:"});
  const threads = await getPostsFromIds(getBarIds(list));
  return {response: new Response(JSON.stringify(threads), responseOptions(CONTENT_TYPE_APPLICATION_JSON))};
};

handlers[API_POST_LIST] = async (input) => {
  const threadId = expectUuidParam(input, "threadId");
  const list = await db.list({prefix: `thread/post:${threadId}:`});
  const posts = await getPostsFromIds(getBarIds(list));
  return {response: new Response(JSON.stringify(posts), responseOptions(CONTENT_TYPE_APPLICATION_JSON))};
};

handlers[API_ANIMATION_CREATE] = async (input) => {
  const [
    jsonBinary,
    video
  ] = parseBinaryChunks(await input.request.arrayBuffer());

  const json: string = new TextDecoder().decode(jsonBinary);
  // TODO(trevor): Use ajv to validate, for now it just checks that it's json.
  JSON.parse(json);

  await expectFileHeader("video:video/mp4", video, videoMp4Header);

  const output = await postCreate(input, true, "animation");

  const {id} = output;
  await Promise.all([
    db.put(`animation/json:${id}`, json),
    db.put(`animation/video:${id}`, video)
  ]);
  return output;
};

handlers[API_ANIMATION_JSON] = async (input) => {
  const result = await db.get(`animation/json:${expectUuidParam(input, "id")}`, "text");
  return {response: new Response(result, responseOptions(CONTENT_TYPE_APPLICATION_JSON))};
};

handlers[API_ANIMATION_VIDEO] = async (input) => {
  const result = await db.get(`animation/video:${expectUuidParam(input, "id")}`, "arrayBuffer");
  return {response: new Response(result, responseOptions(CONTENT_TYPE_VIDEO_MP4))};
};

handlers[API_AUTHTEST] = async (input) => {
  const content = await validateJwtGoogle(input);
  return {
    response: new Response(
      JSON.stringify({authorized: true, content}),
      responseOptions(CONTENT_TYPE_APPLICATION_JSON)
    )
  };
};

const handleRequest = async (event: FetchEvent): Promise<Response> => {
  const url = new URL(decodeURI(event.request.url));
  try {
    const handler = handlers[url.pathname];
    if (handler) {
      return (await handler({request: event.request, url, event})).response;
    }
    return await getAssetFromKV(event, {mapRequestToAsset: serveSinglePageApp});
  } catch (err) {
    return new Response(
      JSON.stringify({
        err: `${err}`,
        pathname: url.pathname
      }),
      {
        headers: createAccessHeaders(CONTENT_TYPE_APPLICATION_JSON),
        status: 500
      }
    );
  }
};

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});
