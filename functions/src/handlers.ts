import {
  API_ALL_THREADS_ID,
  API_AMENDED_LIST,
  API_ANIMATION_CREATE,
  API_ANIMATION_JSON,
  API_ANIMATION_VIDEO,
  API_FEEDBACK,
  API_HEALTH,
  API_POST_CREATE,
  API_POST_DELETE,
  API_POST_LIKE,
  API_POST_LIST,
  API_PROFILE,
  API_PROFILE_AVATAR,
  API_PROFILE_AVATAR_UPDATE,
  API_PROFILE_UPDATE,
  AUTH_GOOGLE_CLIENT_ID,
  AUTH_GOOGLE_ISSUER,
  AnimationData,
  Api,
  AttributedSource,
  ClientPost,
  PostData,
  ProfileUser,
  StoredPost,
  StoredUser,
  padInteger
} from "../../common/common";
import {
  JWKS,
  dbAddView,
  dbCreatePost,
  dbDeleteAvatar,
  dbDeletePost,
  dbExpectPost,
  dbGetAnimationJson,
  dbGetAnimationVideo,
  dbGetAvatar,
  dbGetCachedJwksGoogle,
  dbGetUser,
  dbGetUsernameToUserId,
  dbListAmendedPosts,
  dbListPosts,
  dbModifyPostLiked,
  dbPutAnimation,
  dbPutAvatar,
  dbPutCachedJwksGoogle,
  dbPutUser,
  dbUserHasPermission
} from "./database";

// eslint-disable-next-line no-var,vars-on-top,init-declarations
declare var global: any;
// eslint-disable-next-line no-var,vars-on-top,init-declarations
var window: any = {};
global.window = window;
import {Jose} from "jose-jwe-jws";
import {TextDecoder} from "util";
(Jose as any).crypto = crypto;
import {uuid} from "uuidv4";

// eslint-disable-next-line init-declarations,no-var,vars-on-top
declare var production: boolean | undefined;
// eslint-disable-next-line init-declarations,no-var,vars-on-top
declare var GITHUB_TOKEN: string;

export const isDevEnvironment = () => typeof production === "undefined" || !production;

const CONTENT_TYPE_APPLICATION_JSON = "application/json";
const CONTENT_TYPE_APPLICATION_OCTET_STREAM = "application/octet-stream";
const CONTENT_TYPE_VIDEO_MP4 = "video/mp4";
const CONTENT_TYPE_IMAGE_JPEG = "image/jpeg";

const CACHE_CONTROL_IMMUTABLE = "public,max-age=31536000,immutable";

const sortKeyNewToOld = () => padInteger(Number.MAX_SAFE_INTEGER - Date.now());

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

export interface RawRequest {
  // All methods are uppercase.
  method: string;

  url: URL;

  ip: string;

  authorization: string | null;

  range: string | null;

  body: ArrayBuffer;

  onHandlerNotFound: () => Promise<RequestOutput<any>>;
}

const expect = <T>(name: string, value: T | null | undefined) => {
  if (!value) {
    throw new Error(`Expected ${name} but got ${value}`);
  }
  return value;
};

const sanitizeOrGenerateUsername = (unsantizedUsername: string) => {
  // The output of this must be valid according to the regex in API_PROFILE_UPDATE.
  const invalidReplaceCharacter = ".";

  // Replace all invalid characters with "." and don't allow multiple in a row.
  const sanitizedUsername = unsantizedUsername.
    replace(/[^a-zA-Z0-9.]/gu, invalidReplaceCharacter).
    replace(/\.+/gu, invalidReplaceCharacter);

  // If the username is empty or just the invalid character then pick a generic name.
  const pickedUsername = !sanitizedUsername || sanitizedUsername === invalidReplaceCharacter
    ? "user"
    : sanitizedUsername;

  // If the username is too short, append random digits;
  const usernameMinLength = expect("username.minLength", API_PROFILE_UPDATE.props.username.minLength);
  const usernameMaxLength = expect("username.maxLength", API_PROFILE_UPDATE.props.username.maxLength);
  const username = pickedUsername.length < usernameMinLength
    ? `${pickedUsername}${Math.floor(Math.random() * 90000) + 10000}`
    : pickedUsername;

  return username.slice(0, usernameMaxLength);
};

class RequestInput<T> {
  public readonly request: RawRequest;

  public readonly url: URL;

  public readonly json: T;

  private authedUser?: StoredUser = undefined;

  public constructor (request: RawRequest, json: T) {
    this.request = request;
    this.url = request.url;
    this.json = json;
  }

  private async validateJwtAndGetUser (): Promise<StoredUser> {
    const token = expect("authorization", this.request.authorization);

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

      const jwks = await (async () => {
        const cachedJwks = await dbGetCachedJwksGoogle();
        if (cachedJwks) {
          return cachedJwks;
        }
        const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
        const newJwks: JWKS = await response.json();

        const expiration = Math.floor(Date.parse(expect("expires", response.headers.get("expires"))) / 1000);
        await dbPutCachedJwksGoogle(newJwks, expiration);
        return newJwks;
      })();

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
    const existingUser = await dbGetUser(content.sub);
    if (existingUser) {
      return existingUser;
    }
    const user: StoredUser = {
      id: content.sub,
      avatarId: null,
      username: sanitizeOrGenerateUsername(content.given_name),
      bio: "",
      role: isDevEnvironment() && content.sub === "admin"
        ? "admin"
        : "user"
    };

    await dbPutUser(user);
    return user;
  }

  public async getAuthedUser (): Promise<StoredUser | null> {
    if (this.authedUser) {
      return this.authedUser;
    }
    if (this.request.authorization) {
      this.authedUser = await this.validateJwtAndGetUser();
      return this.authedUser;
    }
    return null;
  }

  public async requireAuthedUser (): Promise<StoredUser> {
    return expect("auth", await this.getAuthedUser());
  }
}

interface RequestOutput<OutputType> {
  result: OutputType;
  contentType?: string;
  immutable?: boolean;
  headers?: Record<string, string>;

  // Any RequestOutput is assumed to be 200 or this status value (null means 404, and throw is 500).
  status?: number;
}

type HandlerCallback<InputType, OutputType> = (input: RequestInput<InputType>) =>
Promise<RequestOutput<OutputType>>;

interface Handler {
  api: Api<any, any>;
  callback: HandlerCallback<any, any>;
}
const handlers: Record<string, Handler> = {};

const addHandler = <InputType, OutputType>(
  api: Api<InputType, OutputType>,
  // It's bizarre that we use Omit here, however we're forcing the template inference to only work on Api.
  callback: HandlerCallback<Omit<InputType, "">, Omit<OutputType, "">>) => {
  handlers[api.pathname] = {
    api,
    callback
  };
};

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

const imageGifHeader = new Uint8Array([0x47, 0x49, 0x46, 0x38]);
const imageJpegHeader = new Uint8Array([0xFF, 0xD8]);
const imagePngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

const startsWithBytes = (buffer: ArrayBuffer, startsWith: Uint8Array) => {
  if (buffer.byteLength < startsWith.byteLength) {
    return false;
  }
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < startsWith.length; ++i) {
    if (bytes[i] !== startsWith[i]) {
      return false;
    }
  }
  return true;
};

const expectFileHeader = (name: string, types: string, buffer: ArrayBuffer, possibleHeaders: Uint8Array[]) => {
  for (const possibleHeader of possibleHeaders) {
    if (startsWithBytes(buffer, possibleHeader)) {
      return;
    }
  }
  throw new Error(`File ${name} was not the correct type. Expected ${types}`);
};

interface JwtPayload {
  iss: string;
  aud: string;
  exp: string;

  sub: string;
  given_name: string;
}

interface PostCreateGeneric {
  message: string;
  title?: string;
  replyId: string | null;
}

const postCreate = async (
  input: RequestInput<PostCreateGeneric>,
  createThread: boolean,
  hasTitle: boolean,
  userdata: PostData) => {
  const user = await input.requireAuthedUser();

  const title = hasTitle ? input.json.title || null : null;
  const {message, replyId} = input.json;
  const id = uuid();

  const newToOld = sortKeyNewToOld();
  const threadId = await (async () => {
    if (createThread && !replyId) {
      return id;
    }
    const replyPost = await dbExpectPost(expect("replyId", replyId));
    return replyPost.threadId;
  })();

  const post: StoredPost = {
    id,
    threadId,
    title,
    message,
    userdata,
    userId: user.id,
    replyId,
    sortKey: newToOld,
    dateMsSinceEpoch: Date.now()
  };

  await dbCreatePost(post);

  // We return what the post would actually look like if it were listed (for quick display in React).
  const result: ClientPost = {
    ...post,
    username: user!.username,
    avatarId: user!.avatarId,
    liked: false,
    likes: 0,
    views: 0,
    canDelete: true
  };

  return {
    result,
    threadId,
    id
  };
};

addHandler(API_POST_CREATE, async (input) => postCreate(input, false, false, {type: "comment"}));

addHandler(API_POST_LIST, async (input) => {
  const {threadId} = input.json;

  // If this is a specific thread, then track views for it.
  if (threadId !== API_ALL_THREADS_ID) {
    await dbAddView(threadId, input.request.ip);
  }

  const result = await dbListPosts(input.json);
  return {result};
});

addHandler(API_AMENDED_LIST, async (input) => {
  const result = await dbListAmendedPosts(await input.getAuthedUser(), input.json.queries);
  return {result};
});

addHandler(API_ANIMATION_CREATE, async (input) => {
  const [
    jsonBinary,
    video
  ] = parseBinaryChunks(input.request.body);

  const json: string = new TextDecoder().decode(jsonBinary);
  const animationData: AnimationData = JSON.parse(json);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const validator = require("../../ts-schema-loader/dist/main.js!../../common/common.ts?AnimationData");
  if (!validator(animationData)) {
    throw new Error(`AnimationData was invalid:\n${JSON.stringify(validator.errors)}`);
  }

  const attribution: AttributedSource[] = [
    animationData.videoAttributedSource,
    ...animationData.widgets.map((widget) => widget.attributedSource)
  ];

  expectFileHeader("video", "mp4", video, [videoMp4Header]);

  const output = await postCreate(input, true, true, {
    type: "animation",
    attribution: attribution.filter((attribute) => Boolean(attribute.originUrl)),
    width: input.json.width,
    height: input.json.height
  });

  const {id} = output;
  await dbPutAnimation(id, JSON.stringify(animationData), video);
  return output;
});

addHandler(API_ANIMATION_JSON, async (input) => {
  const result: AnimationData = JSON.parse(expect(
    "animationJson",
    await dbGetAnimationJson(input.json.id)
  ));
  return {result, immutable: true};
});

addHandler(API_ANIMATION_VIDEO, async (input) => {
  const result = expect("video", await dbGetAnimationVideo(input.json.id));
  return {
    result,
    immutable: true,
    contentType: CONTENT_TYPE_VIDEO_MP4
  };
});

const getProfileUser = async (input: RequestInput<any>): Promise<ProfileUser> => {
  const user = await input.requireAuthedUser();
  return {
    ...user,
    ownsUsername: await dbGetUsernameToUserId(user.username) === user.id
  };
};

addHandler(API_PROFILE, async (input) => {
  const user = await getProfileUser(input);
  return {result: user};
});

addHandler(API_PROFILE_UPDATE, async (input) => {
  const user = await input.requireAuthedUser();
  user.username = input.json.username;
  user.bio = input.json.bio;
  const profileUser = await dbPutUser(user);
  return {result: profileUser};
});

addHandler(API_PROFILE_AVATAR, async (input) => {
  const result = expect("avatar", await dbGetAvatar(input.json.avatarId));
  return {
    result,
    immutable: true,
    contentType: CONTENT_TYPE_IMAGE_JPEG
  };
});

addHandler(API_PROFILE_AVATAR_UPDATE, async (input) => {
  const user = await input.requireAuthedUser();
  if (user.avatarId) {
    await dbDeleteAvatar(user.avatarId);
  }
  user.avatarId = uuid();
  const imageData = input.request.body;
  const avatarMaxSizeKB = 256;
  if (imageData.byteLength > avatarMaxSizeKB * 1024) {
    throw new Error(`The size of the avatar must not be larger than ${avatarMaxSizeKB}KB`);
  }
  expectFileHeader("avatar", "gif, jpeg, png", imageData, [imageGifHeader, imageJpegHeader, imagePngHeader]);
  await dbPutAvatar(user.avatarId, imageData);
  const profileUser = await dbPutUser(user);
  return {result: profileUser};
});

addHandler(API_POST_LIKE, async (input) => {
  const postId = input.json.id;
  const newValue = input.json.liked;
  const [user] = await Promise.all([
    input.requireAuthedUser(),
    // Validate that the post exists (we don't use the result however).
    dbExpectPost(postId)
  ]);

  const likes = await dbModifyPostLiked(user.id, postId, newValue);
  return {result: {likes}};
});

addHandler(API_FEEDBACK, async (input) => {
  if (!isDevEnvironment()) {
    const {title} = input.json;
    const response = await fetch("https://api.github.com/repos/TrevorSundberg/madeitforfun/issues", {
      method: "POST",
      body: JSON.stringify({title}),
      headers: {
        accept: "application/vnd.github.v3+json",
        authorization: `token ${GITHUB_TOKEN}`
      }
    });
    await response.json();
  }
  return {result: {}};
});

addHandler(API_HEALTH, async () => ({result: {}}));

addHandler(API_POST_DELETE, async (input) => {
  const user = await input.requireAuthedUser();
  const postId = input.json.id;

  const post = await dbExpectPost(postId);
  if (!dbUserHasPermission(user, post.userId)) {
    throw new Error("Attempting to delete post that did not belong to the user");
  }

  await dbDeletePost(post);
  return {result: {}};
});

const handleRequest = async (request: RawRequest): Promise<RequestOutput<any>> => {
  if (request.method === "OPTIONS") {
    return {
      result: undefined,
      headers: {
        allow: "GET, HEAD, POST, OPTIONS"
      }
    };
  }

  const {url} = request;
  const handler = handlers[url.pathname];
  if (handler) {
    // Convert the url parameters back to json so we can validate it.
    const jsonInput: Record<string, any> = {};
    const decodeUriValue = (input: string) => decodeURIComponent(input.replace(/\+/gu, "%20"));
    const searchParamsRegex = /(?:\?|&|;)([^=]+)=([^&|;]+)/gu;
    for (;;) {
      // Unfortunately CF workers does not have url.searchParams.forEach
      const result = searchParamsRegex.exec(url.search);
      if (!result) {
        break;
      }
      jsonInput[decodeUriValue(result[1])] = JSON.parse(decodeUriValue(result[2]));
    }
    const result = handler.api.validator(jsonInput);
    if (!result) {
      throw new Error(JSON.stringify(handler.api.validator.errors));
    }

    const input = new RequestInput<any>(request, jsonInput);
    const output = await handler.callback(input);
    return output;
  }
  return request.onHandlerNotFound();
};

const handleRanges = async (request: RawRequest): Promise<RequestOutput<any>> => {
  const response = await handleRequest(request);
  if (response.result instanceof ArrayBuffer) {
    response.headers = response.headers || {};
    response.headers["accept-ranges"] = "bytes";

    const rangeHeader = request.range;

    const canHandleRangeRequest =
      !isDevEnvironment() &&
      request.method === "GET";

    if (canHandleRangeRequest && rangeHeader) {
      const rangeResults = (/bytes=([0-9]+)-([0-9]+)?/u).exec(rangeHeader);
      if (!rangeResults) {
        throw new Error(`Invalid range header: ${rangeHeader}`);
      }
      const buffer = response.result;
      const begin = parseInt(rangeResults[1], 10);
      const end = parseInt(rangeResults[2], 10) || buffer.byteLength - 1;
      response.result = buffer.slice(begin, end + 1);
      response.headers["content-range"] = `bytes ${begin}-${end}/${buffer.byteLength}`;
      response.status = 206;
      return response;
    }
  }
  return response;
};

const handleErrors = async (request: RawRequest): Promise<RequestOutput<any>> => {
  try {
    return await handleRanges(request);
  } catch (err) {
    const stack = err && err.stack || err;
    console.error(stack);
    return {
      result: {
        err: `${err && err.message || err}`,
        stack,
        url: request.url.href
      },
      status: 500
    };
  }
};

export const handle = async (request: RawRequest): Promise<RequestOutput<any>> => {
  const output = await handleErrors(request);
  output.headers = output.headers || {};

  if (output.result instanceof ArrayBuffer) {
    output.contentType = output.contentType || CONTENT_TYPE_APPLICATION_OCTET_STREAM;
  } else {
    output.contentType = output.contentType || CONTENT_TYPE_APPLICATION_JSON;
    output.result = JSON.stringify(output.result);
  }

  output.headers = {
    ...output.headers,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "content-type": output.contentType || CONTENT_TYPE_APPLICATION_JSON,
    ...output.immutable ? {"cache-control": CACHE_CONTROL_IMMUTABLE} : {}
  };
  return output;
};
