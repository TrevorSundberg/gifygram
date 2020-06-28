export const API_POST_CREATE_MAX_MESSAGE_LENGTH = 1000;
export const API_POST_CREATE_MAX_TITLE_LENGTH = 26;
export const API_PROFILE_MAX_USERNAME_LENGTH = 26;
export const API_PROFILE_MAX_BIO_LENGTH = 1000;

export const API_POST_CREATE = "/api/post/create";
export const API_THREAD_LIST = "/api/thread/list";
export const API_POST_LIST = "/api/post/list";
export const API_POST_LIKE = "/api/post/like";
export const API_ANIMATION_CREATE = "/api/animation/create";
export const API_ANIMATION_JSON = "/api/animation/json";
export const API_ANIMATION_VIDEO = "/api/animation/video";
export const API_AUTHTEST = "/api/authtest";
export const API_PROFILE = "/api/profile";
export const API_PROFILE_UPDATE = "/api/profile/update";

export const AUTH_GOOGLE_ISSUER = "accounts.google.com";
export const AUTH_GOOGLE_CLIENT_ID = "608893334527-510lc0vbk5pd6ag7jdl6aka2hhhp9f69.apps.googleusercontent.com";

/** Mark that we're doing something only to be backwards compatable with the database */
export const oldVersion = <T>(value: T) => value;

export type PostComment = {
  type: "comment";
}

export interface AttributedSource {
  originUrl: string;
  title: string;
  previewGifUrl: string;
  src: string;
}

export type PostAnimation = {
  type: "animation";
  attribution: AttributedSource[];
  width: number;
  height: number;
}

export type PostData = PostComment | PostAnimation;

export interface StoredPost {
  id: string;
  threadId: string;
  title: string | null;
  message: string;
  userdata: PostData;
  userId: string;
  replyId: string | null;
}

export interface ReturnedPost extends StoredPost {
  username: string;
  liked: boolean;
  likes: number;
  views: number;
  cached?: true;
}

export interface ReturnedThread extends ReturnedPost {
  userdata: PostAnimation;
}

export interface StoredUser {
  id: string;
  username: string;
  bio: string;
}

export interface PostLike {
  likes: number;
}

export interface WidgetData {
  attributedSource: AttributedSource;
}

export interface AnimationData {
  videoAttributedSource: AttributedSource;
  widgets: WidgetData[];
}

export const MAX_VIDEO_SIZE = 720;
