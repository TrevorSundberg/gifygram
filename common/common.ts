/* eslint-disable @typescript-eslint/no-var-requires */
export const MAX_VIDEO_SIZE = 720;

export const API_THREAD_LIST_ENDING = "0000000-0000-4000-8000-000000000000";
export const API_ALL_THREADS_ID = `0${API_THREAD_LIST_ENDING}`;
export const API_TRENDING_THREADS_ID = `1${API_THREAD_LIST_ENDING}`;

export const COLLECTION_USERS = "users";
export const COLLECTION_AVATARS = "avatars";
export const COLLECTION_VIDEOS = "videos";
export const COLLECTION_ANIMATIONS = "animations";
export const COLLECTION_POSTS = "posts";
export const COLLECTION_LIKED = "liked";
export const COLLECTION_VIEWED = "viewed";

/** Mark that we're doing something only to be backwards compatable with the database */
export const oldVersion = <T>(value: T) => value;

export type Empty = {};

export type PostComment = {
  type: "comment";
}

export interface AttributedSource {
  originUrl: string;
  title: string;
  previewUrl: string;
  src: string;
  mimeType: string;
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
   * @minLength 1
   * @maxLength 1000
   */
  message: string;
  threadId: string;
}

export interface AnimationCreate {

  /**
   * @maxLength 1000
   */
  message: string;

  // This is the video/animation we are remixing (null if we are creating a new thread).
  replyId: string | null;

  /**
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

export interface ViewedThread {
  threadId: string;
}

export interface StoredPost {
  id: string;
  isThread: boolean;
  threadId: string;
  title: string | null;
  message: string;
  userdata: PostData;
  userId: string;
  replyId: string | null;
  dateMsSinceEpoch: number;
  likes: number;
  likesSecondsFromBirthAverage: number;
  trendingScore: number;
  views: number;
}

export interface ThreadPost {
  userdata: PostAnimation;
}

export type StoredThread = StoredPost & ThreadPost;

export interface AmendedQuery {
  id: string;
  userId: string;
}

export interface AmendedList {
  queries: AmendedQuery[];
}

export interface AmendedPost {
  id: string;
  username: string;
  avatarId: string | null;
  liked: boolean;
  canDelete: boolean;
}

export interface ClientPost extends StoredPost, AmendedPost {
  cached?: true;
}

export type ClientThread = ClientPost & ThreadPost;

export interface StoredUser {
  id: string;
  avatarId: string | null;
  username: string;
  bio: string;
  role: "user" | "admin";
}

export interface AvatarInput {
  avatarId: string;
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
  [time: string]: Keyframe;
}

export interface Tracks {
  [selector: string]: Track;
}

export interface WidgetInit {
  attributedSource: AttributedSource;
  id?: string;
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
   * @minLength 5
   * @maxLength 20
   * @pattern ^[a-zA-Z0-9.]+$
   */
  username: string;

  /**
   * @maxLength 1000
   */
  bio: string;
}

export interface Feedback {
  title: string;
}

type JSONSchema7 = import("json-schema").JSONSchema7;
export type SchemaValidator = ((input: any) => boolean) & {errors: any[]; schema: JSONSchema7}

export class Api<InputType extends Record<string, any>, OutputType> {
  public readonly pathname: string;

  public readonly validator: SchemaValidator;

  public readonly props: Record<keyof InputType, JSONSchema7> = {} as any;

  private in: InputType | undefined = undefined;

  private out: OutputType | undefined = undefined;

  public constructor (pathname: string, validator: SchemaValidator) {
    // eslint-disable-next-line no-void
    void this.in;
    // eslint-disable-next-line no-void
    void this.out;
    this.pathname = pathname;
    this.validator = validator;

    // This is just a shortcut to access schema properties at the root level.
    const {properties} = validator.schema;
    if (properties) {
      for (const key of Object.keys(properties)) {
        const value = properties[key];
        if (typeof value === "object") {
          (this.props as Record<string, JSONSchema7>)[key] = value;
        }
      }
    }
  }
}

export const API_POST_CREATE = new Api<PostCreate, ClientPost>(
  "/api/post/create",
  require("../ts-schema-loader/dist/main.js!./common.ts?PostCreate")
);
export const API_VIEWED_THREAD = new Api<ViewedThread, Empty>(
  "/api/thread/viewed",
  require("../ts-schema-loader/dist/main.js!./common.ts?ViewedThread")
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
export const API_ANIMATION_VIDEO = new Api<SpecificPost, Buffer>(
  "/api/animation/video",
  require("../ts-schema-loader/dist/main.js!./common.ts?SpecificPost")
);
export const API_PROFILE_UPDATE = new Api<ProfileUpdate, StoredUser>(
  "/api/profile/update",
  require("../ts-schema-loader/dist/main.js!./common.ts?ProfileUpdate")
);
export const API_PROFILE_AVATAR = new Api<AvatarInput, Buffer>(
  "/api/profile/avatar",
  require("../ts-schema-loader/dist/main.js!./common.ts?AvatarInput")
);
export const API_PROFILE_AVATAR_UPDATE = new Api<Empty, StoredUser>(
  "/api/profile/avatar/update",
  require("../ts-schema-loader/dist/main.js!./common.ts?Empty")
);
export const API_FEEDBACK = new Api<Feedback, Empty>(
  "/api/feedback",
  require("../ts-schema-loader/dist/main.js!./common.ts?Feedback")
);
export const API_HEALTH = new Api<Empty, Empty>(
  "/api/health",
  require("../ts-schema-loader/dist/main.js!./common.ts?Empty")
);
