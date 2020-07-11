const KEY_AUTH_GOOGLE = "auth:google";

export type JWKS = {keys: JWKRSA[]};

export const dbGetCachedJwksGoogle = async (): Promise<JWKS | null> => db.get<JWKS>(KEY_AUTH_GOOGLE, "json");

export const dbPutCachedJwksGoogle = async (jwks: JWKS, expiration: number): Promise<void> =>
  db.put(KEY_AUTH_GOOGLE, JSON.stringify(jwks), {expiration});
