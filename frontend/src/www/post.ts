import {PostData, ReturnedPost} from "../../../common/common";

export const createPsuedoPost = (
  id: string,
  userdata: PostData,
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
