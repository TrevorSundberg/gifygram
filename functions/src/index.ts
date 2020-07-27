import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
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
  API_PROFILE_AVATAR,
  API_PROFILE_AVATAR_UPDATE,
  API_PROFILE_UPDATE,
  API_TRENDING_THREADS_ID,
  AmendedPost,
  AmendedQuery,
  AnimationData,
  Api,
  AttributedSource,
  COLLECTION_AVATARS,
  COLLECTION_USERS,
  ClientPost,
  PostData,
  PostList,
  StoredPost,
  StoredUser,
  padInteger
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

type KeyValue<Value> = Promise<Value | null>

export interface KeyValueStore {
  get(key: string): KeyValue<string>;
  get<ExpectedValue = unknown>(key: string, type: "json"): KeyValue<ExpectedValue>;
  get(key: string, type: "arrayBuffer"): KeyValue<ArrayBuffer>;

  put(
    key: string,
    value: string | ArrayBuffer,
    options?: {
      expiration?: string | number;
      expirationTtl?: string | number;
    },
  ): Promise<void>;

  delete(key: string): Promise<void>;

  list(options: {
    prefix?: string;
    limit?: number;
  }): Promise<{
    keys: { name: string; expiration?: number }[];
  }>;
}

let db: KeyValueStore = undefined as any;
export const setKeyValueStore = (kvStore: KeyValueStore) => {
  db = kvStore;
};

export type AvatarId = string;
export type UserId = string;
export type PostId = string;
export type IP = string;
export type SortKey = string;

export const docUser = (userId: UserId) => store.collection(COLLECTION_USERS).doc(userId);
const dbkeyPost = (postId: PostId) =>
  `post:${postId}`;
const dbkeyPostDeleted = (postId: PostId) =>
  `post.deleted:${postId}`;
const dbprefixThreadPost = (threadId: PostId) =>
  `thread.post:${threadId}:`;
const dbkeyThreadPost = (threadId: PostId, sortKey: SortKey, postId: PostId) =>
  `thread.post:${threadId}:${sortKey}|${postId}`;
const dbkeyPostLiked = (userId: UserId, postId: PostId) =>
  `post.liked:${userId}:${postId}`;
const dbkeyPostLikes = (postId: PostId) =>
  `post.likes:${postId}`;
const dbkeyThreadViews = (threadId: PostId) =>
  `thread.views:${threadId}`;
const dbkeyThreadView = (threadId: PostId, ip: IP) =>
  `thread.view:${threadId}:${ip}`;
const dbkeyAnimationJson = (postId: PostId) =>
  `animation.json:${postId}`;
const dbkeyAnimationVideo = (postId: PostId) =>
  `animation.video:${postId}`;

const TRUE_VALUE = "1";
const SECONDS_PER_DAY = 86400;

export const dbUserHasPermission = (actingUser: StoredUser | null, owningUserId: string) =>
  actingUser
    ? owningUserId === actingUser.id || actingUser.role === "admin"
    : false;

export const dbGetUser = async (userId: UserId): Promise<StoredUser | null> => {
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

export const dbPutUser = async (user: StoredUser, allowNameNumbers: boolean): Promise<void> => {
  await store.runTransaction(async (transaction) => {
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
        throw new Error(`The username ${user.username} was already taken`);
      }
    }
    await transaction.set(docUser(user.id), user);
  });
};

export const dbGetPost = async (postId: PostId): Promise<StoredPost | null> =>
  db.get<StoredPost>(dbkeyPost(postId), "json");

export const dbExpectPost = async (postId: PostId): Promise<StoredPost> => {
  const post = await dbGetPost(postId);
  if (!post) {
    throw new Error(`Attempting to get a post by id ${postId} returned null`);
  }
  return post;
};

export const dbCreatePost = async (post: StoredPost): Promise<void> => {
  await Promise.all([
    // If this post is creating a thread...
    post.threadId === post.id
      ? db.put(dbkeyThreadPost(API_ALL_THREADS_ID, post.sortKey, post.id), TRUE_VALUE)
      : null,
    db.put(dbkeyThreadPost(post.threadId, post.sortKey, post.id), TRUE_VALUE),
    db.put(dbkeyPost(post.id), JSON.stringify(post))
  ]);
};

export const dbDeletePost = async (post: StoredPost): Promise<void> => {
  // We don't delete the individual views/likes/replies, just the counts (unbounded operations).
  const postId = post.id;
  await Promise.all([
    db.delete(dbkeyPost(postId)),
    db.delete(dbkeyPostLikes(postId)),
    db.delete(dbkeyThreadViews(postId)),

    db.delete(dbkeyAnimationJson(postId)),
    db.delete(dbkeyAnimationVideo(postId)),

    db.delete(dbkeyThreadPost(API_ALL_THREADS_ID, post.sortKey, postId)),
    db.delete(dbkeyThreadPost(post.threadId, post.sortKey, postId)),

    // In case we want to cleanup views/likes/replies in the future, put a key in that says we deleted this.
    db.put(dbkeyPostDeleted(postId), TRUE_VALUE)
  ]);
};

// We use a custom epoch to avoid massive floating point numbers, especially when averaging.
const BIRTH_MS = 1593820800000;

interface LikesInfo {
  likes: number;
  secondsFromBirthAverage: number;
}

interface UserLikedInfo {
  secondsFromBirth: number;
}

export const dbGetPostLiked = async (userId: UserId, postId: PostId): Promise<boolean> =>
  await db.get(dbkeyPostLiked(userId, postId)) !== null;

export const dbGetPostLikes = async (postId: PostId): Promise<number> => {
  const likesInfo = await db.get<LikesInfo>(dbkeyPostLikes(postId), "json");
  return likesInfo ? likesInfo.likes : 0;
};

const map0To1Asymptote = (x: number) => -1 / (Math.max(x, 0) + 1) ** 2 + 1;

const computeTrendingScore = (likesInfo: LikesInfo) => {
  const secondsAddedPerLike = 100;
  const likeSeconds = likesInfo.likes * secondsAddedPerLike;
  const addedSeconds = map0To1Asymptote(likeSeconds / SECONDS_PER_DAY) * SECONDS_PER_DAY;
  // The || 0 is to protect against NaN for any reason
  return likesInfo.secondsFromBirthAverage + addedSeconds || 0;
};

const computeTrendingSortKey = (likesInfo: LikesInfo) =>
  padInteger(Number.MAX_SAFE_INTEGER - computeTrendingScore(likesInfo));

export const dbModifyPostLiked = async (userId: UserId, postId: PostId, newValue: boolean): Promise<number> => {
  const likedKey = dbkeyPostLiked(userId, postId);
  const userLikedInfo = await db.get<UserLikedInfo>(likedKey, "json");
  const oldValue = Boolean(userLikedInfo);

  const likesKey = dbkeyPostLikes(postId);
  const likesInfo: LikesInfo =
    await db.get<LikesInfo>(likesKey, "json") ||
    {likes: 0, secondsFromBirthAverage: 0};
  if (newValue !== oldValue) {
    if (newValue) {
      const secondsFromBirth = (Date.now() - BIRTH_MS) / 1000;
      const newUserLikedInfo = {secondsFromBirth};
      likesInfo.secondsFromBirthAverage =
        (likesInfo.secondsFromBirthAverage * likesInfo.likes + secondsFromBirth) / (likesInfo.likes + 1);
      ++likesInfo.likes;
      const trendingSortKey = computeTrendingSortKey(likesInfo);
      await Promise.all([
        db.put(likedKey, JSON.stringify(newUserLikedInfo)),
        db.put(likesKey, JSON.stringify(likesInfo)),
        db.put(
          dbkeyThreadPost(API_TRENDING_THREADS_ID, trendingSortKey, postId),
          TRUE_VALUE,
          {expirationTtl: SECONDS_PER_DAY}
        )
      ]);
    } else {
      likesInfo.likes = Math.max(0, likesInfo.likes - 1);
      if (likesInfo.likes === 0) {
        likesInfo.secondsFromBirthAverage = 0;
      } else {
        const secondsFromBirthAverageNew =
          (likesInfo.secondsFromBirthAverage * (likesInfo.likes + 1) - userLikedInfo!.secondsFromBirth) /
           likesInfo.likes;
        likesInfo.secondsFromBirthAverage = Math.max(0, secondsFromBirthAverageNew);
      }
      await Promise.all([
        db.delete(likedKey),
        db.put(likesKey, JSON.stringify(likesInfo))
      ]);
    }
  }
  return likesInfo.likes;
};

export const dbGetThreadViews = async (threadId: PostId): Promise<number> =>
  parseInt(await db.get(dbkeyThreadViews(threadId)) || "0", 10);

export const dbAddView = async (threadId: PostId, ip: IP): Promise<void> => {
  const viewKey = dbkeyThreadView(threadId, ip);
  const hasViewed = Boolean(await db.get(viewKey));
  if (!hasViewed) {
    await db.put(viewKey, TRUE_VALUE);
    const viewsKey = dbkeyThreadViews(threadId);
    const prevLikes = parseInt(await db.get(viewsKey) || "0", 10);
    await db.put(viewsKey, `${prevLikes + 1}`);
  }
};

const getBarIds = (list: {keys: { name: string }[]}) => {
  const ids = list.keys.map((key) => key.name.split("|")[1]);
  // Prevent duplicate ids.
  const seenIds: Record<string, boolean> = {};
  return ids.filter((id) => {
    if (seenIds[id]) {
      return false;
    }
    seenIds[id] = true;
    return true;
  });
};

const getStoredPostsFromIds = async (ids: string[]): Promise<StoredPost[]> => {
  const posts = await Promise.all(ids.map(dbGetPost));
  return posts.filter((post): post is StoredPost => Boolean(post));
};

export const dbListPosts = async (postList: PostList): Promise<StoredPost[]> =>
  getStoredPostsFromIds(getBarIds(await db.list({
    prefix: dbprefixThreadPost(postList.threadId),
    limit: postList.threadId === API_ALL_THREADS_ID ? 20 : undefined
  })).slice(0, postList.threadId === API_TRENDING_THREADS_ID ? 4 : undefined));

export const dbListAmendedPosts =
  async (authedUserOptional: StoredUser | null, queries: AmendedQuery[]): Promise<AmendedPost[]> =>
    Promise.all(queries.map(async (query) => {
      const user = await dbGetUser(query.userId);
      return {
        id: query.id,
        username: user ? user.username : "",
        avatarId: user ? user.avatarId : null,
        liked: authedUserOptional
          ? await dbGetPostLiked(authedUserOptional.id, query.id)
          : false,
        likes: await dbGetPostLikes(query.id),
        views: query.requestViews
          ? await dbGetThreadViews(query.id)
          : null,
        canDelete: dbUserHasPermission(authedUserOptional, query.userId)
      };
    }));

export const dbPutAnimation = async (postId: PostId, json: string, video: ArrayBuffer): Promise<void> => {
  await Promise.all([
    db.put(dbkeyAnimationJson(postId), json),
    db.put(dbkeyAnimationVideo(postId), video)
  ]);
};

export const dbGetAnimationJson = async (postId: PostId): Promise<string | null> =>
  db.get(dbkeyAnimationJson(postId));

export const dbGetAnimationVideo = async (postId: PostId): Promise<ArrayBuffer | null> =>
  db.get(dbkeyAnimationVideo(postId), "arrayBuffer");

export const isDevEnvironment = () => process.env.FUNCTIONS_EMULATOR === "true";

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
      await transaction.delete(docAvatar(storedUser.avatarId));
    }
    const newAvatar = store.collection(COLLECTION_AVATARS).doc();
    await transaction.create(newAvatar, {
      buffer: Buffer.from(imageData)
    });
    await transaction.update(userRef, {avatarId: newAvatar.id});
    return newAvatar.id;
  });
  return {result: {...user, avatarId}};
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
  const {title} = input.json;
  const response = await fetch("https://api.github.com/repos/TrevorSundberg/madeitforfun/issues", {
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

export const handle = async (request: RawRequest): Promise<RequestOutput<any>> => {
  const output = await handleErrors(request);
  output.headers = output.headers || {};

  if (output.result instanceof ArrayBuffer || output.result instanceof Buffer) {
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

setKeyValueStore({
  delete: (() => 0) as any,
  get: async (key: string, type?: "json" | "arrayBuffer"): Promise<string | null | ArrayBuffer | any> => {
    const document = await store.collection("collection").doc(key).
      get();
    const data = document.data() as {buffer: Buffer} | undefined;
    if (!data) {
      return null;
    }
    const {buffer} = data;
    if (type === "arrayBuffer") {
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    const string = buffer.toString();
    if (type === "json") {
      return JSON.parse(string);
    }
    return string;
  },
  list: async (options: {prefix?: string;limit?: number}):
  Promise<{keys: { name: string; expiration?: number }[]}> => {
    const prefix = options && options.prefix || "";
    const limit = options && options.limit || 1000;
    const documents = await store.collection("collection").listDocuments();
    return {
      keys: documents.map((document) => ({
        name: document.id
      })).filter((value) => value.name.startsWith(prefix)).
        slice(0, limit)
    };
  },
  put: async (key, value) => {
    await store.collection("collection").doc(key).
      set({buffer: Buffer.from(value)});
  }
});

export const requests = functions.https.onRequest(async (request, response) => {
  const apiIndex = request.originalUrl.indexOf("/api/");
  const output = await handle({
    ip: request.ip || "127.0.0.1",
    authorization: request.headers.authorization || null,
    body: request.rawBody
      ? request.rawBody.slice().buffer
      : new ArrayBuffer(0),
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
  response.send(output.result instanceof ArrayBuffer
    ? Buffer.from(output.result)
    : output.result);
});
