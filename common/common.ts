export const API_POST_CREATE_MAX_MESSAGE_LENGTH = 1000;
export const API_POST_CREATE_MAX_TITLE_LENGTH = 100;

export const API_POST_CREATE = "/api/post/create";
export const API_THREAD_LIST = "/api/thread/list";
export const API_POST_LIST = "/api/post/list";
export const API_ANIMATION_CREATE = "/api/animation/create";
export const API_ANIMATION_JSON = "/api/animation/json";
export const API_ANIMATION_VIDEO = "/api/animation/video";
export const API_AUTHTEST = "/api/authtest";

export const AUTH_GOOGLE_CLIENT_ID = "608893334527-510lc0vbk5pd6ag7jdl6aka2hhhp9f69.apps.googleusercontent.com";

/** Mark that we're doing something only to be backwards compatable with the database */
export const oldVersion = <T>(value: T) => value;
