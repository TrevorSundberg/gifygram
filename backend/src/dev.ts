import {KVNamespace} from "@cloudflare/workers-types";

const LIST_MAX_LIMIT = 1000;

export const isDevEnvironment = () => typeof production === "undefined" || !production;

// @dollarshaveclub/cloudworker does not implement KVNamespace.list so we patch it in.
export const patchDevKv = (kv: KVNamespace) => {
  if (!isDevEnvironment()) {
    return;
  }
  if (typeof (kv as any).store === "undefined") {
    throw new Error("Expected this to be an emulated KVNamespace");
  }
  // eslint-disable-next-line func-names
  kv.list = async function (
    this,
    {
      limit = LIST_MAX_LIMIT,
      prefix = "",
      cursor = "-1"
    }: {
      prefix?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
      keys: {
        name: string;
        expiration?: number;
      }[];
      list_complete: boolean;
      cursor: string;
    }> {
    const clampedLimit = Math.max(0, Math.min(limit, LIST_MAX_LIMIT));

    // https://github.com/dollarshaveclub/cloudworker/blob/4976f88c3d2629fbbd4ca49da88b9c8bf048ce0f/lib/kv.js#L6
    const keyStore = (this as any).store as Map<string, Buffer>;

    const allKeys = Array.from(keyStore.keys());
    allKeys.sort();

    let keys = allKeys.filter((key) => key.startsWith(prefix));

    keys = keys.slice(Number(cursor) + 1);

    const list_complete = keys.length <= clampedLimit;

    keys = keys.slice(0, clampedLimit);

    const nextCursor = (Number(cursor) + (list_complete ? keys.length : clampedLimit)).toString();

    return Promise.resolve({
      keys: keys.map((key) => ({
        name: key
      })),
      list_complete,
      cursor: nextCursor
    });
  };
};
