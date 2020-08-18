import * as admin from "firebase-admin";
import * as betterAjvErrors from "better-ajv-errors";
import * as crypto from "crypto";
import * as firestore from "@google-cloud/firestore";
import * as functions from "firebase-functions";
import {
  API_ANIMATION_CREATE,
  API_ANIMATION_JSON,
  API_ANIMATION_VIDEO,
  API_FEEDBACK,
  API_HEALTH,
  API_POST_CREATE,
  API_POST_DELETE,
  API_POST_LIKE,
  API_PROFILE_AVATAR,
  API_PROFILE_AVATAR_UPDATE,
  API_PROFILE_UPDATE,
  API_VIEWED_THREAD,
  AnimationData,
  Api,
  AttributedSource,
  COLLECTION_ANIMATIONS,
  COLLECTION_AVATARS,
  COLLECTION_LIKED,
  COLLECTION_POSTS,
  COLLECTION_USERS,
  COLLECTION_VIDEOS,
  COLLECTION_VIEWED,
  ClientPost,
  PostData,
  PostType,
  SchemaValidator,
  StoredPost,
  StoredUser,
  makeLikedKey,
  userHasPermission
} from "../../common/common";
import {TEST_EMAIL} from "../../common/test";
import {TextDecoder} from "util";
import fetch from "node-fetch";
import {uuid} from "uuidv4";

admin.initializeApp(functions.config().firebase);
const store = admin.firestore();

const expect = <T>(name: string, value: T | null | undefined | false) => {
  if (!value) {
    throw new Error(`Expected ${name} but got ${value}`);
  }
  return value;
};

const ajvErrorsToString = (validator: SchemaValidator, json: Record<string, any>) => {
  const errors = betterAjvErrors(
    validator.schema,
    json,
    validator.errors,
    {format: "js", indent: null}
  );
  if (!errors || errors.length === 0) {
    return JSON.stringify(validator.errors);
  }
  return errors.map((error) => error.error + (error.suggestion ? `\n${error.suggestion}` : "")).join("\n");
};

type UserId = string;
type PostId = string;
type IPHash = string;

const SECONDS_PER_DAY = 86400;

const docUser = (userId: UserId) => store.collection(COLLECTION_USERS).doc(userId);
const dbGetUser = async (userId: UserId): Promise<StoredUser | null> => {
  const userDoc = await docUser(userId).get();
  return userDoc.data() as StoredUser;
};

const addRandomNumbersToEnd = (text: string) => `${text}${Math.floor(Math.random() * 90000) + 10000}`;

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
    ? addRandomNumbersToEnd(pickedUsername)
    : pickedUsername;

  return username.slice(0, usernameMaxLength);
};

const dbPutUser = async (user: StoredUser, allowNameNumbers: boolean): Promise<void> => {
  const success = await store.runTransaction(async (transaction) => {
    for (;;) {
      const result = await transaction.get(store.collection(COLLECTION_USERS).where("username", "==", user.username));
      if (result.size > 1) {
        throw new Error("More than one user with the same username");
      }
      if (result.size === 0) {
        break;
      }
      if (result.size === 1) {
        const foundUser = result.docs[0].data() as StoredUser;
        if (foundUser.id === user.id) {
          break;
        }
      }
      if (allowNameNumbers) {
        user.username = addRandomNumbersToEnd(user.username);
      } else {
        return false;
      }
    }
    transaction.set(docUser(user.id), user);
    return true;
  });
  if (!success) {
    throw new Error(`The username ${user.username} was already taken`);
  }
};

const docPost = (postId: PostId) => store.collection(COLLECTION_POSTS).doc(postId);
const dbGetPost = async (postId: PostId): Promise<StoredPost | undefined> => {
  const postDoc = await docPost(postId).get();
  return postDoc.data() as StoredPost | undefined;
};

const dbExpectPost = async (postId: PostId): Promise<StoredPost> => {
  const post = await dbGetPost(postId);
  if (!post) {
    throw new Error(`Attempting to get a post by id ${postId} returned null`);
  }
  return post;
};

interface StoredVideo {
  buffer: Buffer;
}
const docVideo = (postId: PostId) => store.collection(COLLECTION_VIDEOS).doc(postId);
const docAnimation = (postId: PostId) => store.collection(COLLECTION_ANIMATIONS).doc(postId);

const dbDeletePost = async (post: StoredPost): Promise<void> => {
  const postId = post.id;

  await store.runTransaction(async (transaction) => {
    const postDoc = await transaction.get(docPost(postId));
    const storedPost = postDoc.data() as StoredPost | undefined;
    if (!storedPost) {
      return;
    }

    const likedDocs = await store.collection(COLLECTION_LIKED).where("postId", "==", postId).get();
    for (const doc of likedDocs.docs) {
      transaction.delete(doc.ref);
    }
    const viewedDocs = await store.collection(COLLECTION_VIEWED).where("threadId", "==", postId).get();
    for (const doc of viewedDocs.docs) {
      transaction.delete(doc.ref);
    }
    if (storedPost.type === "thread") {
      const threadPostDocs = await store.collection(COLLECTION_POSTS).where("threadId", "==", postId).get();
      for (const doc of threadPostDocs.docs) {
        transaction.delete(doc.ref);
      }
    }

    transaction.delete(docPost(postId));
    transaction.delete(docAnimation(postId));
    transaction.delete(docVideo(postId));
  });

  // TODO(Trevor): Need to remove viewed and liked entries for this post (and child posts if this is a thread).
  await Promise.all([
    docPost(postId).delete(),
    docAnimation(postId).delete(),
    docVideo(postId).delete()
  ]);
};

// We use a custom epoch to avoid massive floating point numbers, especially when averaging.
const BIRTH_MS = 1593820800000;

interface UserLikedInfo {
  postId: PostId;
  userId: UserId;
  secondsFromBirth: number;
}

interface UserViewedInfo {
  threadId: PostId;
  ipHash: UserId;
}

const map0To1Asymptote = (x: number) => -1 / (Math.max(x, 0) + 1) ** 2 + 1;

const computeTrendingScore = (post: StoredPost) => {
  const secondsAddedPerLike = 100;
  const likeSeconds = post.likes * secondsAddedPerLike;
  const addedSeconds = map0To1Asymptote(likeSeconds / SECONDS_PER_DAY) * SECONDS_PER_DAY;
  // The || 0 is to protect against NaN for any reason
  return post.likesSecondsFromBirthAverage + addedSeconds || 0;
};

const dbAddView = async (threadId: PostId, ipHash: IPHash): Promise<void> => {
  const userViewedInfo: UserViewedInfo = {
    threadId,
    ipHash
  };
  try {
    await store.runTransaction(async (transaction) => {
      transaction.create(store.collection(COLLECTION_VIEWED).doc(`${threadId}_${ipHash}`), userViewedInfo);
      transaction.update(docPost(threadId), {views: admin.firestore.FieldValue.increment(1)});
    });
  } catch (err) {
    if (err.code !== firestore.GrpcStatus.ALREADY_EXISTS) {
      throw err;
    }
  }
};

const isDevEnvironment = () => process.env.FUNCTIONS_EMULATOR === "true";

const CONTENT_TYPE_APPLICATION_JSON = "application/json";
const CONTENT_TYPE_APPLICATION_OCTET_STREAM = "application/octet-stream";
const CONTENT_TYPE_VIDEO_MP4 = "video/mp4";
const CONTENT_TYPE_IMAGE_JPEG = "image/jpeg";

const CACHE_CONTROL_IMMUTABLE = "public,max-age=31536000,immutable";

const parseBinaryChunks = (buffer: Buffer) => {
  const result: Buffer[] = [];
  for (let index = 0; index < buffer.byteLength;) {
    const size = buffer.readUInt32LE(index);
    const start = index + 4;
    const data = buffer.slice(start, start + size);
    result.push(data);
    index = start + size;
  }
  return result;
};

interface RawRequest {
  // All methods are uppercase.
  method: string;

  url: URL;

  ipHash: string;

  authorization: string | null;

  range: string | null;

  body: Buffer;

  onHandlerNotFound: () => Promise<RequestOutput<any>>;
}

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
    const idToken = expect("authorization", this.request.authorization);
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (!isDevEnvironment() && decodedToken.email === TEST_EMAIL) {
      throw new Error("Attempting to login as test user in production");
    }

    const firebaseUser = await admin.auth().getUser(decodedToken.uid);
    if (firebaseUser.disabled) {
      throw new Error("The account has been disabled");
    }

    const existingUser = await dbGetUser(decodedToken.uid);
    if (existingUser) {
      return existingUser;
    }

    const unsanitizedName = decodedToken.email
      ? decodedToken.email.split("@")[0]
      : decodedToken.given_name || decodedToken.name || "";

    const storedUsed: StoredUser = {
      id: decodedToken.uid,
      avatarId: null,
      username: sanitizeOrGenerateUsername(unsanitizedName),
      bio: "",
      role: "user"
    };
    await dbPutUser(storedUsed, true);
    return storedUsed;
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

const videoMp4Header = Buffer.from([
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
const imageGifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38]);
const imageJpegHeader = Buffer.from([0xFF, 0xD8]);
const imagePngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

const expectFileHeader = (name: string, types: string, buffer: Buffer, possibleHeaders: Buffer[]) => {
  for (const possibleHeader of possibleHeaders) {
    if (buffer.compare(possibleHeader, 0, possibleHeader.byteLength, 0, possibleHeader.byteLength) === 0) {
      return;
    }
  }
  throw new Error(`File ${name} was not the correct type. Expected ${types}`);
};

interface PostCreateGeneric {
  message: string;
  title?: string;
  threadId?: string;
  replyId?: string | null | undefined;
}

const postCreate = async (
  input: RequestInput<PostCreateGeneric>,
  allowCreateThread: boolean,
  hasTitle: boolean,
  userdata: PostData) => {
  const user = await input.requireAuthedUser();

  const title = hasTitle ? input.json.title || null : null;
  const replyId = input.json.replyId || null;
  const {message} = input.json;
  const id = uuid();

  const threadId = await (async () => {
    if (allowCreateThread && !input.json.threadId && !replyId) {
      return id;
    }
    if (input.json.threadId) {
      if (replyId) {
        const replyPost = await dbExpectPost(replyId);
        if (replyPost.threadId !== input.json.threadId) {
          throw new Error("Attempting to reply to a post that was in the wrong thread");
        }
      }
      return input.json.threadId;
    }
    const replyPost = await dbExpectPost(expect("replyId", replyId));
    return replyPost.threadId;
  })();

  const type: PostType = (() => {
    if (threadId === id) {
      return "thread";
    }
    if (userdata.type === "animation") {
      return "remix";
    }
    return "comment";
  })();

  const post: StoredPost = {
    id,
    type,
    threadId,
    title,
    message,
    userdata,
    userId: user.id,
    replyId,
    dateMsSinceEpoch: Date.now(),
    likes: 0,
    likesSecondsFromBirthAverage: 0,
    trendingScore: 0,
    views: 0
  };

  await docPost(post.id).create(post);

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

addHandler(API_VIEWED_THREAD, async (input) => {
  await dbAddView(input.json.threadId, input.request.ipHash);
  return {result: {}};
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
    throw new Error(`AnimationData was invalid:\n${ajvErrorsToString(validator, animationData)}`);
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

  const storedVideo: StoredVideo = {
    buffer: Buffer.from(video)
  };

  await Promise.all([
    docVideo(id).create(storedVideo),
    docAnimation(id).create(animationData)
  ]);
  return output;
});

addHandler(API_ANIMATION_JSON, async (input) => {
  const animationDoc = await docAnimation(input.json.id).get();
  const result = animationDoc.data() as AnimationData;
  return {result, immutable: true};
});

addHandler(API_ANIMATION_VIDEO, async (input) => {
  const videoDoc = await docVideo(input.json.id).get();
  const storedVideo = videoDoc.data() as StoredVideo;
  const result = storedVideo.buffer;
  return {
    result,
    immutable: true,
    contentType: CONTENT_TYPE_VIDEO_MP4
  };
});

addHandler(API_PROFILE_UPDATE, async (input) => {
  const user = await input.requireAuthedUser();
  user.username = input.json.username;
  user.bio = input.json.bio;
  await dbPutUser(user, false);
  return {result: user};
});

interface StoredAvatar {
  buffer: Buffer;
}
const docAvatar = (avatarId: string) => store.collection(COLLECTION_AVATARS).doc(avatarId);

addHandler(API_PROFILE_AVATAR, async (input) => {
  const avatarDoc = await docAvatar(input.json.avatarId).get();
  const avatarData = expect("avatar", avatarDoc.data()) as StoredAvatar;
  return {
    result: avatarData.buffer,
    immutable: true,
    contentType: CONTENT_TYPE_IMAGE_JPEG
  };
});

addHandler(API_PROFILE_AVATAR_UPDATE, async (input) => {
  const imageData = input.request.body;
  const avatarMaxSizeKB = 256;
  if (imageData.byteLength > avatarMaxSizeKB * 1024) {
    throw new Error(`The size of the avatar must not be larger than ${avatarMaxSizeKB}KB`);
  }
  expectFileHeader("avatar", "gif, jpeg, png", imageData, [imageGifHeader, imageJpegHeader, imagePngHeader]);

  const user = await input.requireAuthedUser();
  const avatarId = await store.runTransaction(async (transaction) => {
    const userRef = docUser(user.id);
    const userDoc = await transaction.get(userRef);
    const storedUser = userDoc.data() as StoredUser;
    if (storedUser.avatarId) {
      transaction.delete(docAvatar(storedUser.avatarId));
    }
    const newAvatar = store.collection(COLLECTION_AVATARS).doc();
    transaction.create(newAvatar, {
      buffer: Buffer.from(imageData)
    });
    transaction.update(userRef, {avatarId: newAvatar.id});
    return newAvatar.id;
  });
  return {result: {...user, avatarId}};
});

addHandler(API_POST_LIKE, async (input) => {
  const postId = input.json.id;
  const newValue = input.json.liked;
  const user = await input.requireAuthedUser();

  const doc = store.collection(COLLECTION_LIKED).doc(makeLikedKey(postId, user.id));
  const likes = await store.runTransaction(async (transaction) => {
    const postLikedDoc = await transaction.get(doc);
    const oldValue = postLikedDoc.exists;
    const post = expect("post", (await transaction.get(docPost(postId))).data()) as StoredPost;
    if (newValue !== oldValue) {
      if (newValue) {
        const secondsFromBirth = (Date.now() - BIRTH_MS) / 1000;
        const newUserLikedInfo: UserLikedInfo = {
          postId,
          userId: user.id,
          secondsFromBirth
        };
        post.likesSecondsFromBirthAverage =
        (post.likesSecondsFromBirthAverage * post.likes + secondsFromBirth) / (post.likes + 1);
        ++post.likes;
        transaction.create(doc, newUserLikedInfo);
      } else {
        --post.likes;
        if (post.likes === 0) {
          post.likesSecondsFromBirthAverage = 0;
        } else {
          const userLikedInfo = postLikedDoc.data() as UserLikedInfo;
          const likesSecondsFromBirthAverageNew =
          (post.likesSecondsFromBirthAverage * (post.likes + 1) - userLikedInfo!.secondsFromBirth) /
           post.likes;
          post.likesSecondsFromBirthAverage = Math.max(0, likesSecondsFromBirthAverageNew);
        }
        transaction.delete(doc);
      }
      post.trendingScore = computeTrendingScore(post);
      transaction.update(docPost(postId), post);
    }
    return post.likes;
  });
  return {result: {likes}};
});

addHandler(API_FEEDBACK, async (input) => {
  const {title} = input.json;
  const response = await fetch("https://api.github.com/repos/TrevorSundberg/gifygram/issues", {
    method: "POST",
    body: JSON.stringify({title}),
    headers: {
      accept: "application/vnd.github.v3+json",
      authorization: `token ${process.env.GITHUB_TOKEN}`
    }
  });
  await response.json();
  return {result: {}};
});

addHandler(API_HEALTH, async () => {
  await store.collection(COLLECTION_VIDEOS).doc("health").get();
  return {result: {}};
});

addHandler(API_POST_DELETE, async (input) => {
  const user = await input.requireAuthedUser();
  const postId = input.json.id;

  const post = await dbExpectPost(postId);
  if (!userHasPermission(user, post.userId)) {
    throw new Error("Attempting to delete post that did not belong to the user");
  }

  await dbDeletePost(post);
  return {result: {}};
});

const handleRequest = async (request: RawRequest): Promise<RequestOutput<any>> => {
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
      throw new Error(ajvErrorsToString(handler.api.validator, jsonInput));
    }

    const input = new RequestInput<any>(request, jsonInput);
    const output = await handler.callback(input);
    return output;
  }
  return request.onHandlerNotFound();
};

const handleRanges = async (request: RawRequest): Promise<RequestOutput<any>> => {
  const response = await handleRequest(request);
  if (response.result instanceof Buffer) {
    response.headers = response.headers || {};
    response.headers["accept-ranges"] = "bytes";

    const rangeHeader = request.range;

    if (request.method === "GET" && rangeHeader) {
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

const handle = async (request: RawRequest): Promise<RequestOutput<any>> => {
  const output = await handleErrors(request);
  output.headers = output.headers || {};

  if (output.result instanceof Buffer) {
    output.contentType = output.contentType || CONTENT_TYPE_APPLICATION_OCTET_STREAM;
  } else {
    output.contentType = output.contentType || CONTENT_TYPE_APPLICATION_JSON;
    output.result = JSON.stringify(output.result);
  }

  output.headers = {
    ...output.headers,
    "content-type": output.contentType || CONTENT_TYPE_APPLICATION_JSON,
    ...output.immutable ? {"cache-control": CACHE_CONTROL_IMMUTABLE} : {}
  };
  return output;
};

// See firebase/functions/node_modules/@google-cloud/firestore/build/src/v1/firestore_client.js isBrowser checks
delete (global as any).window;

export const api = functions.https.onRequest(async (request, response) => {
  const apiIndex = request.originalUrl.lastIndexOf("/api/");
  const ipHasher = crypto.createHash("sha256");
  const ipOrHost = request.ip || request.header("x-forwarded-host") || "";
  ipHasher.update(ipOrHost);
  const output = await handle({
    ipHash: ipHasher.digest("hex"),
    authorization: request.headers.authorization || null,
    body: request.rawBody || Buffer.alloc(0),
    method: request.method,
    range: (request.headers.range as string | undefined) || null,
    url: new URL(`${request.protocol}://${request.get("host")}${request.originalUrl.substr(apiIndex)}`),
    onHandlerNotFound: async () => {
      throw new Error("The onHandlerNotFound is not implemented");
    }
  });
  if (output.headers) {
    for (const headerKey of Object.keys(output.headers)) {
      response.header(headerKey, output.headers[headerKey]);
    }
  }
  response.status(output.status || 200);
  response.send(output.result);
});

export const scheduledFunction = functions.pubsub.schedule("every 1 minutes").onRun(async () => {
  console.log("Start warmup");
  const response = await fetch("https://gifygram.com/api/health");
  console.log("End warmup", await response.json());
  return null;
});
