/**
 * The Cloudflare Workers KV `list` operation can return old data (even when it was added in the same colo)
 * therefore whenever we do an operation that would add to the list, we should cache that operation
 * locally, and if the server does not return our added operation we manually add it (as if it existed).
 * This makes is so that if you add a comment and immediately refresh, the comment will be there even if
 * the backend KV list operation did not update and return the comment. Once the comment is actually
 * added and returned on the backed, our frontend removes it from the cache in `cacheMergeIntoArray`.
 * This is also used when making a brand new video post, both on the threads screen, and when redirected
 * to the page with your thread after it'is posted.
 * We also make sure that all backend API operations that create an object return the exact representation
 * of the object as it was added to the list (see API_POST_CREATE / API_ANIMATION_CREATE).
 * https://community.cloudflare.com/t/listing-items-returns-inconsistent-state/122680/15
 */

// We use a webpack generated guid (each build) to clear the cache (frontend).
// eslint-disable-next-line no-var,init-declarations
declare var CACHE_GUID: string;

console.log("CACHE_GUID", CACHE_GUID);
const SESSION_GUID = "sessionGuid";
if (sessionStorage.getItem(SESSION_GUID) !== CACHE_GUID) {
  sessionStorage.clear();
  sessionStorage.setItem(SESSION_GUID, CACHE_GUID);
  console.log("Clearing cache");
}

export interface CacheItem {
  id: string;
  cached?: true;
}

type CacheArray = CacheItem[];

const cacheStoreArray = (key: string, array: CacheArray) => {
  if (array.length === 0) {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, JSON.stringify(array));
};

export const cacheGetArrayOrNull = <T extends CacheItem>(key: string): T[] | null => {
  const array = JSON.parse(sessionStorage.getItem(key));
  return array;
};

const cacheEnsureArray = (key: string): CacheArray => {
  const array = cacheGetArrayOrNull(key);
  if (array) {
    return array;
  }
  return [];
};

export const cacheAdd = (key: string, value: CacheItem) => {
  const array = cacheEnsureArray(key);
  value.cached = true;
  array.push(value);
  cacheStoreArray(key, array);
};

const deleteInternal = (value: CacheItem, array: CacheArray) => {
  const index = array.findIndex((cacheItem) => cacheItem.id === value.id);
  if (index !== -1) {
    array.splice(index, 1);
  }
};

export const cacheDelete = (key: string, value: CacheItem) => {
  const array = cacheGetArrayOrNull(key);
  if (!array) {
    return;
  }

  deleteInternal(value, array);
};

export const cacheMergeIntoArray = (key: string, response: CacheItem[]) => {
  const array = cacheGetArrayOrNull(key);
  if (!array) {
    return;
  }
  for (const item of response) {
    deleteInternal(item, array);
  }
  for (const cacheItem of array) {
    // We always add to the front since it's always newest first (even with posts in a thread).
    response.unshift(cacheItem);
  }
  cacheStoreArray(key, array);
};
