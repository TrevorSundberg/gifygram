import {
  API_ALL_THREADS_ID,
  API_TRENDING_THREADS_ID,
  AmendedPost,
  AmendedQuery,
  PostList,
  ProfileUser,
  StoredPost,
  StoredUser,
  padInteger
} from "../../common/common";
import {patchDevKv} from "./dev";

patchDevKv(db);

export type AvatarId = string;
export type UserId = string;
export type PostId = string;
export type IP = string;
export type SortKey = string;
export type JWKS = {keys: JWKRSA[]};

const dbkeyCachedJwksGoogle = () =>
  "jwks:google";
const dbkeyUser = (userId: UserId) =>
  `user:${userId}`;
const dbkeyUsernameToUserId = (username: string) =>
  `username:${username.toLowerCase()}`;
const dbkeyPost = (postId: PostId) =>
  `post:${postId}`;
const dbkeyPostDeleted = (postId: PostId) =>
  `post/deleted:${postId}`;
const dbprefixThreadPost = (threadId: PostId) =>
  `thread/post:${threadId}:`;
const dbkeyThreadPost = (threadId: PostId, sortKey: SortKey, postId: PostId) =>
  `thread/post:${threadId}:${sortKey}|${postId}`;
const dbkeyPostLiked = (userId: UserId, postId: PostId) =>
  `post/liked:${userId}:${postId}`;
const dbkeyPostLikes = (postId: PostId) =>
  `post/likes:${postId}`;
const dbkeyThreadViews = (threadId: PostId) =>
  `thread/views:${threadId}`;
const dbkeyThreadView = (threadId: PostId, ip: IP) =>
  `thread/view:${threadId}:${ip}`;
const dbkeyAnimationJson = (postId: PostId) =>
  `animation/json:${postId}`;
const dbkeyAnimationVideo = (postId: PostId) =>
  `animation/video:${postId}`;
const dbkeyAvatar = (avatarId: UserId) =>
  `avatar:${avatarId}`;

const TRUE_VALUE = "1";
const SECONDS_PER_DAY = 86400;

export const dbUserHasPermission = (actingUser: StoredUser | null, owningUserId: string) =>
  actingUser
    ? owningUserId === actingUser.id || actingUser.role === "admin"
    : false;

export const dbGetCachedJwksGoogle = async (): Promise<JWKS | null> =>
  db.get<JWKS>(dbkeyCachedJwksGoogle(), "json");

export const dbPutCachedJwksGoogle = async (jwks: JWKS, expiration: number): Promise<void> =>
  db.put(dbkeyCachedJwksGoogle(), JSON.stringify(jwks), {expiration});

export const dbGetUsernameToUserId = async (username: string): Promise<string | null> =>
  db.get<string>(dbkeyUsernameToUserId(username), "json");

export const dbGetUser = async (userId: UserId): Promise<StoredUser | null> =>
  db.get<StoredUser>(dbkeyUser(userId), "json");

export const dbPutUser = async (user: StoredUser): Promise<ProfileUser> => {
  const oldUser = await dbGetUser(user.id);
  await db.put(dbkeyUser(user.id), JSON.stringify(user));

  // If we already had a user in the database, and we're changing usernames...
  if (oldUser && oldUser.username !== user.username) {
    // If we owned the old username then remove its ownership.
    const oldUsernameOwnerUserId = await dbGetUsernameToUserId(oldUser.username);
    if (oldUsernameOwnerUserId === oldUser.id) {
      await db.delete(dbkeyUsernameToUserId(oldUser.username));
    }
  }

  const usernameOwnerUserId = await dbGetUsernameToUserId(user.username);
  if (!usernameOwnerUserId) {
    await db.put(dbkeyUsernameToUserId(user.username), JSON.stringify(user.id));
    return {...user, ownsUsername: true};
  }
  return {...user, ownsUsername: usernameOwnerUserId === user.id};
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

export const dbGetAvatar = async (avatarId: AvatarId): Promise<ArrayBuffer | null> =>
  db.get(dbkeyAvatar(avatarId), "arrayBuffer");

export const dbPutAvatar = async (avatarId: AvatarId, avatar: ArrayBuffer): Promise<void> =>
  db.put(dbkeyAvatar(avatarId), avatar);

export const dbDeleteAvatar = async (avatarId: AvatarId): Promise<void> =>
  db.delete(dbkeyAvatar(avatarId));

export const dbGetAnimationJson = async (postId: PostId): Promise<string | null> =>
  db.get(dbkeyAnimationJson(postId), "text");

export const dbGetAnimationVideo = async (postId: PostId): Promise<ArrayBuffer | null> =>
  db.get(dbkeyAnimationVideo(postId), "arrayBuffer");
