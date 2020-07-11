import {ReturnedPost, StoredPost, StoredUser} from "../../common/common";

export type UserId = string;
export type PostId = string;
export type SortKey = string;
export type JWKS = {keys: JWKRSA[]};

const DBKEY_AUTH_GOOGLE =
  "auth:google";
const dbkeyUser = (userId: UserId) =>
  `user:${userId}`;
const dbkeyPost = (postId: PostId) =>
  `post:${postId}`;
const dbprefixThreadPost = (threadId: PostId) =>
  `thread/post:${threadId}:`;
const dbkeyThreadPost = (threadId: PostId, sortKey: SortKey, postId: PostId) =>
  `thread/post:${threadId}:${sortKey}|${postId}`;
const DBPREFIX_THREAD = "thread:";
const dbkeyThread = (sortKey: SortKey, postId: PostId) =>
  `thread:${sortKey}|${postId}`;
const dbkeyPostLiked = (userId: UserId, postId: PostId) =>
  `post/liked:${userId}:${postId}`;
const dbkeyPostLikes = (postId: PostId) =>
  `post/likes:${postId}`;
const dbkeyPostViews = (postId: PostId) =>
  `post/views:${postId}`;

const TRUE_VALUE = "1";

export const dbGetCachedJwksGoogle = async (): Promise<JWKS | null> =>
  db.get<JWKS>(DBKEY_AUTH_GOOGLE, "json");

export const dbPutCachedJwksGoogle = async (jwks: JWKS, expiration: number): Promise<void> =>
  db.put(DBKEY_AUTH_GOOGLE, JSON.stringify(jwks), {expiration});

export const dbGetUser = async (userId: UserId): Promise<StoredUser | null> =>
  db.get<StoredUser>(dbkeyUser(userId), "json");

export const dbPutUser = async (user: StoredUser): Promise<void> =>
  db.put(dbkeyUser(user.id), JSON.stringify(user));

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
      ? db.put(dbkeyThread(post.sortKey, post.id), TRUE_VALUE)
      : null,
    db.put(dbkeyThreadPost(post.threadId, post.sortKey, post.id), TRUE_VALUE),
    db.put(dbkeyPost(post.id), JSON.stringify(post))
  ]);
};

export const dbGetPostLiked = async (userId: UserId, postId: PostId): Promise<boolean> =>
  await db.get(dbkeyPostLiked(userId, postId)) !== null;

export const dbGetPostLikes = async (postId: PostId): Promise<number> =>
  parseInt(await db.get(dbkeyPostLikes(postId)) || "0", 10);

export const dbModifyPostLiked = async (userId: UserId, postId: PostId, newValue: boolean): Promise<number> => {
  const likedKey = dbkeyPostLiked(userId, postId);
  const oldValue = Boolean(await db.get(likedKey));

  const likesKey = dbkeyPostLikes(postId);
  const prevLikes = parseInt(await db.get(likesKey) || "0", 10);
  if (newValue !== oldValue) {
    if (newValue) {
      const newLikes = prevLikes + 1;
      await Promise.all([
        db.put(likedKey, TRUE_VALUE),
        db.put(likesKey, `${newLikes}`)
      ]);
      return newLikes;
    }
    const newLikes = prevLikes - 1;
    await Promise.all([
      db.delete(likedKey),
      db.put(likesKey, `${Math.max(newLikes, 0)}`)
    ]);
    return newLikes;
  }
  return prevLikes;
};

export const dbGetPostViews = async (postId: PostId): Promise<number> =>
  parseInt(await db.get(dbkeyPostViews(postId)) || "0", 10);

const getBarIds = (list: {keys: { name: string }[]}) =>
  list.keys.map((key) => key.name.split("|")[1]);

const getPostsFromIds = async (authedUserOptional: StoredUser | null, ids: string[]): Promise<ReturnedPost[]> => {
  const posts = await Promise.all(ids.map(dbExpectPost));
  return Promise.all(posts.map(async (post) => {
    const user = await dbGetUser(post.userId);
    return {
      ...post,
      username: user!.username,
      liked: authedUserOptional
        ? await dbGetPostLiked(authedUserOptional.id, post.id)
        : false,
      likes: await dbGetPostLikes(post.id),
      views: await dbGetPostViews(post.id)
    };
  }));
};

export const dbListThreads = async (authedUserOptional: StoredUser | null): Promise<ReturnedPost[]> =>
  getPostsFromIds(authedUserOptional, getBarIds(await db.list({prefix: DBPREFIX_THREAD})));

export const dbListThreadPosts =
  async (authedUserOptional: StoredUser | null, threadId: PostId): Promise<ReturnedPost[]> =>
    getPostsFromIds(authedUserOptional, getBarIds(await db.list({prefix: dbprefixThreadPost(threadId)})));
