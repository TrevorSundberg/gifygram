import {getAssetFromKV, serveSinglePageApp} from "@cloudflare/kv-asset-handler";
import {handle} from "./handlers";

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
