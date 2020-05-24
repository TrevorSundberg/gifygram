import {PostType, ReturnedPost} from "../../../common/common";

export const createPsuedoPost = (
  id: string,
  userdata: PostType,
  replyId?: string,
  threadId?: string,
  title = "",
  message = ""
): ReturnedPost => ({
  id,
  threadId: threadId || id,
  title,
  message,
  userdata,
  replyId,
  userId: "",
  username: "Me"
});
