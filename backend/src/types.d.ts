/* eslint-disable init-declarations */
import {KVNamespace} from "@cloudflare/workers-types";

declare global {
  const database: KVNamespace;
}
