/* eslint-disable @typescript-eslint/no-var-requires */

// Note: If you change these constants ensure the JSON schemas are also updated.
export const API_POST_CREATE_MAX_MESSAGE_LENGTH = 1000;
export const API_POST_CREATE_MAX_TITLE_LENGTH = 26;
export const API_PROFILE_MAX_USERNAME_LENGTH = 50;
export const API_PROFILE_MAX_BIO_LENGTH = 1000;
export const MAX_VIDEO_SIZE = 720;

export const API_ALL_THREADS_ID = "00000000-0000-4000-8000-000000000000";

export const AUTH_GOOGLE_ISSUER = "accounts.google.com";
export const AUTH_GOOGLE_CLIENT_ID = "608893334527-510lc0vbk5pd6ag7jdl6aka2hhhp9f69.apps.googleusercontent.com";

/** Mark that we're doing something only to be backwards compatable with the database */
export const oldVersion = <T>(value: T) => value;

export type Empty = {};

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

export interface PostCreate {

  /**
   * API_POST_CREATE_MAX_MESSAGE_LENGTH
   * @maxLength 1000
   */
  message: string;
  replyId: string;
}

export interface AnimationCreate {

  /**
   * API_POST_CREATE_MAX_MESSAGE_LENGTH
   * @maxLength 1000
   */
  message: string;
  replyId: string | null;

  /**
   * API_POST_CREATE_MAX_TITLE_LENGTH
   * @maxLength 26
   */
  title: string;

  /**
   * MAX_VIDEO_SIZE
   * @minimum 1
   * @maximum 720
   * @type integer
   */
  width: number;

  /**
   * MAX_VIDEO_SIZE
   * @minimum 1
   * @maximum 720
   * @type integer
   */
  height: number;
}

export interface PostList {
  threadId: string;
}

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

export interface AmendedList {
  queries: AmendedQuery[];
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

export interface PostLikeInput {
  id: string;
  liked: boolean;
}

export interface PostLike {
  likes: number;
}

export interface PostDelete {
  id: string;
}

export interface Keyframe {
  clip?: string;
  transform?: string;
}

export interface Track {
  [time: number]: Keyframe;
}

export interface Tracks {
  [selector: string]: Track;
}

export interface WidgetInit {
  attributedSource: AttributedSource;
  id?: string;
  type: "gif" | "svg";
}

export interface AnimationData {
  videoAttributedSource: AttributedSource;
  tracks: Tracks;
  widgets: WidgetInit[];
}

export interface SpecificPost {
  id: string;
}

export interface ProfileUpdate {

  /**
   * API_PROFILE_MAX_USERNAME_LENGTH
   * @maxLength 50
   */
  username: string;

  /**
   * API_PROFILE_MAX_BIO_LENGTH
   * @maxLength 1000
   */
  bio: string;
}

export interface Feedback {
  title: string;
}

type SchemaValidator = ((input: any) => boolean) & {errors: any[]; schema: import("json-schema").JSONSchema7}

export class Api<InputType extends Record<string, any>, OutputType> {
  public readonly pathname: string;

  public readonly validator: SchemaValidator;

  private _in: InputType | undefined = undefined;

  private _out: OutputType | undefined = undefined;

  public constructor (pathname: string, validator: SchemaValidator) {
    this.pathname = pathname;
    this.validator = validator;
  }
}

export const API_POST_CREATE = new Api<PostCreate, ClientPost>(
  "/api/post/create",
  require("../ts-schema-loader/dist/main.js!./common.ts?PostCreate")
);
export const API_POST_LIST = new Api<PostList, StoredPost[]>(
  "/api/post/list",
  require("../ts-schema-loader/dist/main.js!./common.ts?PostList")
);
export const API_AMENDED_LIST = new Api<AmendedList, AmendedPost[]>(
  "/api/amended/list",
  require("../ts-schema-loader/dist/main.js!./common.ts?AmendedList")
);
export const API_POST_LIKE = new Api<PostLikeInput, PostLike>(
  "/api/post/like",
  require("../ts-schema-loader/dist/main.js!./common.ts?PostLikeInput")
);
export const API_POST_DELETE = new Api<PostDelete, Empty>(
  "/api/post/delete",
  require("../ts-schema-loader/dist/main.js!./common.ts?PostDelete")
);
export const API_ANIMATION_CREATE = new Api<AnimationCreate, ClientPost>(
  "/api/animation/create",
  require("../ts-schema-loader/dist/main.js!./common.ts?AnimationCreate")
);
export const API_ANIMATION_JSON = new Api<SpecificPost, AnimationData>(
  "/api/animation/json",
  require("../ts-schema-loader/dist/main.js!./common.ts?SpecificPost")
);
export const API_ANIMATION_VIDEO = new Api<SpecificPost, ArrayBuffer>(
  "/api/animation/video",
  require("../ts-schema-loader/dist/main.js!./common.ts?SpecificPost")
);
export const API_PROFILE = new Api<Empty, StoredUser>(
  "/api/profile",
  require("../ts-schema-loader/dist/main.js!./common.ts?Empty")
);
export const API_PROFILE_UPDATE = new Api<ProfileUpdate, StoredUser>(
  "/api/profile/update",
  require("../ts-schema-loader/dist/main.js!./common.ts?ProfileUpdate")
);
export const API_FEEDBACK = new Api<Feedback, Empty>(
  "/api/feedback",
  require("../ts-schema-loader/dist/main.js!./common.ts?Feedback")
);
