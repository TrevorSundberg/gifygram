import {StoredUser} from "../../common/common";

export type UserId = string;
export type JWKS = {keys: JWKRSA[]};

const KEY_AUTH_GOOGLE = "auth:google";
const dbkeyUser = (userId: UserId) => `user:${userId}`;

export const dbGetCachedJwksGoogle = async (): Promise<JWKS | null> =>
  db.get<JWKS>(KEY_AUTH_GOOGLE, "json");

export const dbPutCachedJwksGoogle = async (jwks: JWKS, expiration: number): Promise<void> =>
  db.put(KEY_AUTH_GOOGLE, JSON.stringify(jwks), {expiration});

export const dbGetUser = async (userId: UserId): Promise<StoredUser | null> =>
  db.get<StoredUser>(dbkeyUser(userId), "json");

export const dbPutUser = async (user: StoredUser): Promise<void> =>
  db.put(dbkeyUser(user.id), JSON.stringify(user));
