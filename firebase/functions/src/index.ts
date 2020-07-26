(global as any).atob = require("atob");
(global as any).btoa = require("btoa");
(global as any).crypto = require("crypto");

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {handle} from "../../../backend/src/handlers";
import {setKeyValueStore} from "../../../backend/src/database";

admin.initializeApp(functions.config().firebase);
const firestore = admin.firestore();

// See firebase/functions/node_modules/@google-cloud/firestore/build/src/v1/firestore_client.js isBrowser checks
delete (global as any).window;

setKeyValueStore({
  delete: (() => 0) as any,
  get: async (key: string, type?: "json" | "arrayBuffer"): Promise<string | null | ArrayBuffer | any> => {
    const document = await firestore.collection("collection").doc(key).
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
    const documents = await firestore.collection("collection").listDocuments();
    return {
      keys: documents.map((document) => ({
        name: document.id
      })).filter((value) => value.name.startsWith(prefix)).
        slice(0, limit)
    };
  },
  put: async (key, value) => {
    await firestore.collection("collection").doc(key).
      set({buffer: Buffer.from(value)});
  }
});

export const requests = functions.https.onRequest(async (request, response) => {
  const apiIndex = request.originalUrl.indexOf("/api/");
  const output = await handle({
    ip: request.ip,
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
