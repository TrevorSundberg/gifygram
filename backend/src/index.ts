import {KeyValueStore, setKeyValueStore} from "./database";
import {getAssetFromKV, serveSinglePageApp} from "@cloudflare/kv-asset-handler";
import {handle, isDevEnvironment} from "./handlers";
import {KVNamespace} from "@cloudflare/workers-types";

const LIST_MAX_LIMIT = 1000;

// @dollarshaveclub/cloudworker does not implement KVNamespace.list so we patch it in.
export const patchDevKv = (kv: KVNamespace): KeyValueStore => {
  if (!isDevEnvironment()) {
    return kv;
  }
  if (typeof (kv as any).store === "undefined") {
    throw new Error("Expected this to be an emulated KVNamespace");
  }
  if (!(kv as any).hasCorrectDelete) {
    const del = kv.delete;
    // eslint-disable-next-line func-names
    kv.delete = async function (key: string): Promise<void> {
      try {
        await del.call(this, key);
      // eslint-disable-next-line no-empty
      } catch {
      }
    };

    (kv as any).hasCorrectDelete = true;
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
  return kv;
};

setKeyValueStore(patchDevKv(database));

addEventListener("fetch", (event) => {
  const responsePromise = (async () => {
    const output = await handle({
      ip: event.request.headers.get("cf-connecting-ip") || "0.0.0.0",
      url: new URL(decodeURI(event.request.url)),
      body: await event.request.arrayBuffer(),
      authorization: event.request.headers.get("authorization"),
      range: event.request.headers.get("range"),
      method: event.request.method,
      onHandlerNotFound: async () => {
        let isHtml = false;
        const response = await getAssetFromKV(event, {
          mapRequestToAsset: (request: Request): Request => {
            const spaRequest = serveSinglePageApp(request);
            if (new URL(spaRequest.url).pathname.endsWith(".html")) {
              isHtml = true;
            }
            return spaRequest;
          }
        });

        // We use content based hashes with webpack, but index.html (or any other .html) is not hashed.
        const immutable = !isHtml;
        return {
          result: await response.arrayBuffer(),
          contentType: response.headers.get("content-type") || undefined,
          immutable
        };
      }
    });

    return new Response(output.result, {
      headers: output.headers,
      status: output.status
    });
  })();
  event.respondWith(responsePromise);
});
