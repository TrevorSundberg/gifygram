/* eslint-disable init-declarations */
import {KVNamespace} from "@cloudflare/workers-types";

declare global {
  const db: KVNamespace;
  const production: boolean | undefined;
  const GITHUB_TOKEN: string;
}
