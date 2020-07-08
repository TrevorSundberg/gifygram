import "./stickerSearch.css";
import {AttributedSource} from "../../../common/common";
import {Deferred} from "../shared/shared";
import {Modal} from "./modal";
import React from "react";
import ReactGiphySearchbox from "react-giphy-searchbox-stickers";

export type StickerType = "sticker" | "video";

export class StickerSearch {
  public static async searchForStickerUrl (type: StickerType): Promise<AttributedSource> {
    const modal = new Modal();
    const waitForShow = new Deferred<void>();

    const masonryConfig = [];
    for (let i = 1; i < 10; ++i) {
      const paddingLeftAndRight = 32;
      const imageWidth = 200;
      const gutter = 10;
      const width = i * imageWidth + (i - 1) * gutter + paddingLeftAndRight;
      masonryConfig.push({
        columns: i,
        gutter,
        imageWidth,
        mq: `${width}px`
      });
    }

    const defer = new Deferred<any>();
    const modalPromise = modal.open({
      // eslint-disable-next-line react/display-name
      render: () => <ReactGiphySearchbox
        apiKey="s9bgj4fh1ZldOfMHEWrQCekTy0BIKuko"
        urlKind={type === "sticker" ? "stickers" : "gifs"}
        onSelect={(item: any) => defer.resolve(item)}
        gifListHeight={"calc(100vh - 160px)"}
        masonryConfig={masonryConfig}
        wrapperClassName={"center-div"}
      />,
      dismissable: true,
      fullscreen: true,
      title: "Sticker Search",
      onShown: () => waitForShow.resolve()
    }).then(() => null);

    await waitForShow;

    const result = await Promise.race([
      modalPromise,
      defer
    ]);

    modal.hide();
    if (!result) {
      return null;
    }

    return {
      originUrl: result.url,
      title: result.title,
      previewGifUrl: result.images.preview_gif.url,
      src: result.images.original[type === "sticker" ? "url" : "mp4"] as string
    };
  }
}
