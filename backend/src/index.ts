import {
  API_ANIMATION_CREATE,
  API_ANIMATION_JSON,
  API_ANIMATION_VIDEO,
  API_AUTHTEST,
  API_POST_CREATE,
  API_POST_CREATE_MAX_MESSAGE_LENGTH,
  API_POST_CREATE_MAX_TITLE_LENGTH,
  API_POST_LIKE,
  API_POST_LIST,
  API_PROFILE,
  API_PROFILE_MAX_BIO_LENGTH,
  API_PROFILE_MAX_USERNAME_LENGTH,
  API_PROFILE_UPDATE,
  API_THREAD_LIST,
  AUTH_GOOGLE_CLIENT_ID,
  AUTH_GOOGLE_ISSUER,
  MAX_VIDEO_SIZE_X,
  MAX_VIDEO_SIZE_Y,
  PostData,
  ReturnedPost,
  StoredPost,
  StoredUser
} from "../../common/common";
import {getAssetFromKV, serveSinglePageApp} from "@cloudflare/kv-asset-handler";
import {isDevEnvironment, patchDevKv} from "./dev";

// eslint-disable-next-line no-var,vars-on-top,init-declarations
declare var global: any;
// eslint-disable-next-line no-var,vars-on-top,init-declarations
var window: any = {};
global.window = window;
import {Jose} from "jose-jwe-jws";
(Jose as any).crypto = crypto;

import {uuid} from "uuidv4";

patchDevKv(db);

const CONTENT_TYPE_APPLICATION_JSON = "application/json";
const CONTENT_TYPE_VIDEO_MP4 = "video/mp4";

const AUTHORIZATION_HEADER = "authorization";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// TODO(trevor): Remove this once it's all hosted in the same place.
const createAccessHeaders = (mimeType: string) => new Headers({
  ...corsHeaders,
  "Content-Type": mimeType || "application/octet-stream"
});
const responseOptions = (mimeType: string) => ({headers: createAccessHeaders(mimeType)});

const expect = <T>(name: string, value: T | null | undefined) => {
  if (!value) {
    throw new Error(`Expected ${name} but got ${value}`);
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

const expectInteger = (
  name: string,
  value: string | null | undefined,
  minInclusive: number,
  maxInclusive: number
): number => {
  if (typeof value !== "string") {
    throw new Error(`Expected ${name} to be a string representation of a number but got ${value}`);
  }
  const number = parseInt(value, 10);
  if (number < minInclusive || number > maxInclusive) {
    throw new Error(`Number ${name} was outside range [${minInclusive},${maxInclusive}]: ${value}`);
  }
  if (!isFinite(number)) {
    throw new Error(`Number ${name} was not finite: ${value}`);
  }
  return number;
};

const expectBoolean = (name: string, value: string | null | undefined): boolean => {
  if (value !== "true" && value !== "false") {
    throw new Error(`Expected ${name} to be a string of 'true' or 'false' but got ${value}`);
  }
  return value === "true";
};

class RequestInput {
  public readonly request: Request;

  public readonly url: URL;

  public readonly event: FetchEvent;

  private authedUser?: StoredUser = undefined;

  public constructor (event: FetchEvent) {
    this.request = event.request;
    this.url = new URL(decodeURI(event.request.url));
    this.event = event;
  }

  private async validateJwtAndGetUser (): Promise<StoredUser> {
    const token = expectString("authorization", this.request.headers.get("authorization"), 4096);

    const content = await (async (): Promise<JwtPayload> => {
      if (isDevEnvironment()) {
        return {
          iss: AUTH_GOOGLE_ISSUER,
          aud: AUTH_GOOGLE_CLIENT_ID,
          exp: `${Number.MAX_SAFE_INTEGER}`,
          sub: token,
          given_name: token
        };
      }

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
      return JSON.parse(verified[0].payload as string) as JwtPayload;
    })();

    if (content.iss !== AUTH_GOOGLE_ISSUER) {
      throw new Error(`Invalid issuer ${content.iss}`);
    }
    if (content.aud !== AUTH_GOOGLE_CLIENT_ID) {
      throw new Error(`Invalid audience ${content.aud}`);
    }
    if (parseInt(content.exp, 10) <= Math.ceil(Date.now() / 1000)) {
      throw new Error(`JWT expired ${content.exp}`);
    }
    const userKey = `user:${content.sub}`;
    const existingUser = await db.get<StoredUser>(userKey, "json");
    if (existingUser) {
      return existingUser;
    }
    const user: StoredUser = {
      id: content.sub,
      username: content.given_name,
      bio: ""
    };

    await db.put(userKey, JSON.stringify(user));
    return user;
  }

  public async getAuthedUser (): Promise<StoredUser | null> {
    if (this.authedUser) {
      return this.authedUser;
    }
    if (this.request.headers.has(AUTHORIZATION_HEADER)) {
      this.authedUser = await this.validateJwtAndGetUser();
      return this.authedUser;
    }
    return null;
  }

  public async requireAuthedUser (): Promise<StoredUser> {
    return expect("auth", await this.getAuthedUser());
  }
}

interface RequestOutput {
  response: Response;
}

const handlers: Record<string, (input: RequestInput) => Promise<RequestOutput>> = {};

const expectUuidParam = (input: RequestInput, name: string) =>
  expectUuid(name, input.url.searchParams.get(name));

const expectStringParam = (input: RequestInput, name: string, maxLength: number) =>
  expectString(name, input.url.searchParams.get(name), maxLength);

const expectIntegerParam = (input: RequestInput, name: string, minInclusive: number, maxInclusive: number) =>
  expectInteger(name, input.url.searchParams.get(name), minInclusive, maxInclusive);

const expectBooleanParam = (input: RequestInput, name: string) =>
  expectBoolean(name, input.url.searchParams.get(name));

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

interface JwtPayload {
  iss: string;
  aud: string;
  exp: string;

  sub: string;
  given_name: string;
}

const getPost = async (id: string) => expect("post", await db.get<StoredPost>(`post:${id}`, "json"));

const postCreate = async (input: RequestInput, createThread: boolean, hasTitle: boolean, userdata: PostData) => {
  const user = await input.requireAuthedUser();
  const title = hasTitle ? expectStringParam(input, "title", API_POST_CREATE_MAX_TITLE_LENGTH) : null;
  const message = expectStringParam(input, "message", API_POST_CREATE_MAX_MESSAGE_LENGTH);
  const id = uuid();

  const replyId = input.url.searchParams.has("replyId") ? expectUuidParam(input, "replyId") : null;

  const newToOld = sortKeyNewToOld();
  const threadId = await (async () => {
    if (createThread && !replyId) {
      await db.put(`thread:${newToOld}|${id}`, id);
      return id;
    }
    const replyPost = await getPost(expectUuid("replyId", replyId));
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

handlers[API_POST_CREATE] = async (input) => postCreate(input, false, false, {type: "comment"});

const getBarIds = (list: {keys: { name: string }[]}) =>
  list.keys.map((key) => key.name.split("|")[1]);

const getPostsFromIds = async (input: RequestInput, ids: string[]): Promise<ReturnedPost[]> => {
  const authedUser = await input.getAuthedUser();
  const posts = await Promise.all(ids.map(getPost));
  return Promise.all(posts.map(async (post) => {
    const user = await db.get<StoredUser>(`user:${post.userId}`, "json");
    return {
      ...post,
      username: user!.username,
      liked: authedUser
        ? await db.get(`post/like:${authedUser.id}:${post.id}`) !== null
        : false,
      likes: parseInt(await db.get(`post/likes:${post.id}`) || "0", 10)
    };
  }));
};

handlers[API_THREAD_LIST] = async (input) => {
  const list = await db.list({prefix: "thread:"});
  const threads = await getPostsFromIds(input, getBarIds(list));
  return {response: new Response(JSON.stringify(threads), responseOptions(CONTENT_TYPE_APPLICATION_JSON))};
};

handlers[API_POST_LIST] = async (input) => {
  const threadId = expectUuidParam(input, "threadId");
  const list = await db.list({prefix: `thread/post:${threadId}:`});
  const posts = await getPostsFromIds(input, getBarIds(list));
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

  const output = await postCreate(input, true, true, {
    type: "animation",
    width: expectIntegerParam(input, "width", 1, MAX_VIDEO_SIZE_X),
    height: expectIntegerParam(input, "height", 1, MAX_VIDEO_SIZE_Y)
  });

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

handlers[API_PROFILE] = async (input) => {
  const user = await input.requireAuthedUser();
  return {
    response: new Response(
      JSON.stringify(user),
      responseOptions(CONTENT_TYPE_APPLICATION_JSON)
    )
  };
};

handlers[API_PROFILE_UPDATE] = async (input) => {
  const user = await input.requireAuthedUser();
  user.username = expectStringParam(input, "username", API_PROFILE_MAX_USERNAME_LENGTH);
  user.bio = expectStringParam(input, "bio", API_PROFILE_MAX_BIO_LENGTH);
  await db.put(`user:${user.id}`, JSON.stringify(user));
  return {
    response: new Response(
      JSON.stringify(user),
      responseOptions(CONTENT_TYPE_APPLICATION_JSON)
    )
  };
};

handlers[API_POST_LIKE] = async (input) => {
  const user = await input.requireAuthedUser();
  const id = expectUuidParam(input, "id");
  const newValue = expectBooleanParam(input, "value");
  // Validate that the post exists.
  await getPost(id);

  const oldValue = Boolean(await db.get(`post/like:${user.id}:${id}`));

  if (newValue !== oldValue) {
    const likesKey = `post/likes:${id}`;
    const prevLikes = parseInt(await db.get(likesKey) || "0", 10);
    if (newValue) {
      await db.put(`post/like:${user.id}:${id}`, "1");
      await db.put(`post/likes:${id}`, `${prevLikes + 1}`);
    } else {
      await db.delete(`post/like:${user.id}:${id}`);
      await db.put(`post/likes:${id}`, `${Math.max(prevLikes - 1, 0)}`);
    }
  }

  return {
    response: new Response(
      JSON.stringify({}),
      responseOptions(CONTENT_TYPE_APPLICATION_JSON)
    )
  };
};

handlers[API_AUTHTEST] = async (input) => {
  const content = await input.requireAuthedUser();
  return {
    response: new Response(
      JSON.stringify({authorized: true, content}),
      responseOptions(CONTENT_TYPE_APPLICATION_JSON)
    )
  };
};

const handleOptions = (request: Request) => {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null) {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  return new Response(null, {
    headers: {
      Allow: "GET, HEAD, POST, OPTIONS"
    }
  });
};

const handleRequest = async (event: FetchEvent): Promise<Response> => {
  if (event.request.method === "OPTIONS") {
    return handleOptions(event.request);
  }
  const input = new RequestInput(event);
  const handler = handlers[input.url.pathname];
  if (handler) {
    return (await handler(input)).response;
  }
  return getAssetFromKV(event, {mapRequestToAsset: serveSinglePageApp});
};

const handleRanges = async (event: FetchEvent): Promise<Response> => {
  const response = await handleRequest(event);
  response.headers.append("accept-ranges", "bytes");

  const rangeHeader = event.request.headers.get("range");

  const canHandleRangeRequest =
    !isDevEnvironment() &&
    event.request.method === "GET" &&
    response.status === 200 &&
    response.body;

  if (canHandleRangeRequest && rangeHeader) {
    const rangeResults = (/bytes=([0-9]+)-([0-9]+)?/u).exec(rangeHeader);
    if (!rangeResults) {
      throw new Error(`Invalid range header: ${rangeHeader}`);
    }
    const buffer = await response.arrayBuffer();
    const begin = parseInt(rangeResults[1], 10);
    const end = parseInt(rangeResults[2], 10) || buffer.byteLength - 1;
    const slice = buffer.slice(begin, end + 1);
    response.headers.append("content-range", `bytes ${begin}-${end}/${buffer.byteLength}`);
    return new Response(slice, {
      status: 206,
      headers: response.headers
    });
  }
  return response;
};

const handleErrors = async (event: FetchEvent): Promise<Response> => {
  try {
    return await handleRanges(event);
  } catch (err) {
    const fullError = err && err.stack || err;
    console.error(fullError);
    return new Response(
      JSON.stringify({
        err: `${fullError}`,
        url: event.request.url,
        headers: event.request.headers
      }),
      {
        headers: createAccessHeaders(CONTENT_TYPE_APPLICATION_JSON),
        status: 500
      }
    );
  }
};

addEventListener("fetch", (event) => {
  event.respondWith(handleErrors(event));
});
