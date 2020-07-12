export const API_POST_CREATE_MAX_MESSAGE_LENGTH = 1000;
export const API_POST_CREATE_MAX_TITLE_LENGTH = 26;
export const API_PROFILE_MAX_USERNAME_LENGTH = 26;
export const API_PROFILE_MAX_BIO_LENGTH = 1000;

export const API_ALL_THREADS_ID = "00000000-0000-4000-8000-000000000000";

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
  sortKey: string;
}

export interface ThreadPost {
  userdata: PostAnimation;
}

export type StoredThread = StoredPost & ThreadPost;

export interface AmendedQuery {
  id: string;
  userId: string;
  requestViews: boolean;
}

export interface AmendedPost {
  id: string;
  username: string;
  liked: boolean;
  likes: number;
  views: number | null;
}
export interface ClientPost extends StoredPost, AmendedPost {
  cached?: true;
}

export type ClientThread = ClientPost & ThreadPost;

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

export class Api<ResultType> {
  public readonly pathname: string;

  private _: ResultType | undefined = undefined;

  public constructor (pathname: string) {
    this.pathname = pathname;
  }
}

export const API_POST_CREATE = new Api<ClientPost>("/api/post/create");
export const API_POST_LIST = new Api<StoredPost[]>("/api/post/list");
export const API_AMENDED_LIST = new Api<AmendedPost[]>("/api/amended/list");
export const API_POST_LIKE = new Api<PostLike>("/api/post/like");
export const API_POST_DELETE = new Api<{}>("/api/post/delete");
export const API_ANIMATION_CREATE = new Api<ClientPost>("/api/animation/create");
export const API_ANIMATION_JSON = new Api<AnimationData>("/api/animation/json");
export const API_ANIMATION_VIDEO = new Api<ArrayBuffer>("/api/animation/video");
export const API_PROFILE = new Api<StoredUser>("/api/profile");
export const API_PROFILE_UPDATE = new Api<StoredUser>("/api/profile/update");
export const API_FEEDBACK = new Api<{}>("/api/feedback");

export const MAX_VIDEO_SIZE = 720;
