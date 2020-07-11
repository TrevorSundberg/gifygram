import {StoredPost, StoredUser} from "../../common/common";

export type UserId = string;
export type PostId = string;
export type SortKey = string;
export type JWKS = {keys: JWKRSA[]};

const KEY_AUTH_GOOGLE = "auth:google";
const dbkeyUser = (userId: UserId) => `user:${userId}`;
const dbkeyPost = (postId: PostId) => `post:${postId}`;
const dbkeyThreadPost = (threadId: PostId, postId: PostId, sortKey: SortKey) =>
  `thread/post:${threadId}:${sortKey}|${postId}`;

const TRUE_VALUE = "1";

export const dbGetCachedJwksGoogle = async (): Promise<JWKS | null> =>
  db.get<JWKS>(KEY_AUTH_GOOGLE, "json");

export const dbPutCachedJwksGoogle = async (jwks: JWKS, expiration: number): Promise<void> =>
  db.put(KEY_AUTH_GOOGLE, JSON.stringify(jwks), {expiration});

export const dbGetUser = async (userId: UserId): Promise<StoredUser | null> =>
  db.get<StoredUser>(dbkeyUser(userId), "json");

export const dbPutUser = async (user: StoredUser): Promise<void> =>
  db.put(dbkeyUser(user.id), JSON.stringify(user));

export const dbGetPost = async (postId: PostId): Promise<StoredPost | null> =>
  db.get<StoredPost>(dbkeyPost(postId), "json");

export const dbCreatePost = async (post: StoredPost): Promise<void> => {
  await Promise.all([
    db.put(dbkeyThreadPost(post.threadId, post.id, post.sortKey), TRUE_VALUE),
    db.put(dbkeyPost(post.id), JSON.stringify(post))
  ]);
};
