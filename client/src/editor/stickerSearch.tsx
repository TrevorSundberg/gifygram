import "./stickerSearch.css";
import {AttributedSource, Deferred} from "./utility";
import $ from "jquery";
import {Modal} from "./modal";
import React from "react";
import ReactGiphySearchbox from "react-giphy-searchbox-stickers";
import {render} from "react-dom";

export type StickerType = "sticker" | "video";

export class StickerSearch {
  public static async searchForStickerUrl (type: StickerType): Promise<AttributedSource> {
    const modal = new Modal();
    const waitForShow = new Deferred<void>();
    const div = $("<div/>");
    const modalPromise = modal.open({
      content: div,
      dismissable: true,
      fullscreen: true,
      title: "Sticker Search",
      onShown: () => waitForShow.resolve()
    }).then(() => null);

    await waitForShow;

    const defer = new Deferred<any>();

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

    render(<ReactGiphySearchbox
      apiKey="s9bgj4fh1ZldOfMHEWrQCekTy0BIKuko"
      urlKind={type === "sticker" ? "stickers" : "gifs"}
      onSelect={(item) => defer.resolve(item)}
      gifListHeight={"calc(100vh - 160px)"}
      masonryConfig={masonryConfig}
      wrapperClassName={"center-div"}
    />, div.get(0));

    const result = await Promise.race([
      modalPromise,
      defer
    ]);
    render(<div></div>, div.get(0));
    modal.hide();
    if (!result) {
      return null;
    }

    return {
      attribution: result.url,
      src: result.images.original[type === "sticker" ? "url" : "mp4"] as string
    };
  }
}
