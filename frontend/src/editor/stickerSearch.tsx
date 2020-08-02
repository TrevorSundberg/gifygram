import {Auth, Deferred, abortableJsonFetch, cancel} from "../shared/shared";
import {AttributedSource} from "../../../common/common";
import InputBase from "@material-ui/core/InputBase";
import Masonry from "react-masonry-css";
import {Modal} from "./modal";
import React from "react";
import SearchIcon from "@material-ui/icons/Search";
import {useStyles} from "../page/style";

export type StickerType = "stickers" | "gifs";

const API_KEY = "s9bgj4fh1ZldOfMHEWrQCekTy0BIKuko";

interface StickerSearchBodyProps {
  type: StickerType;
  onSelect: (item: any) => void;
}

export const StickerSearchBody: React.FC<StickerSearchBodyProps> = (props) => {
  const [images, setImages] = React.useState<any[]>([]);
  const [searchText, setSearchText] = React.useState<string>("");

  React.useEffect(() => {
    const endpoint = searchText ? "search" : "trending";
    const url = new URL(`https://api.giphy.com/v1/${props.type}/${endpoint}`);
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("q", searchText);
    url.searchParams.set("limit", "60");
    url.searchParams.set("rating", "pg");
    const fetchPromise = abortableJsonFetch(url.href, Auth.None, null, null, {
      method: "GET"
    });
    (async () => {
      const result = await fetchPromise;
      if (result) {
        setImages(result.data);
      }
    })();

    return () => {
      cancel(fetchPromise);
    };
  }, [searchText]);

  const classes = useStyles();
  return <div>
    <div className={classes.search}>
      <div className={classes.searchIcon}>
        <SearchIcon />
      </div>
      <InputBase
        placeholder="Search…"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        classes={{
          root: classes.searchInputRoot,
          input: classes.searchInputInput
        }}
        inputProps={{"aria-label": "search"}}
      />
    </div>
    <Masonry
      breakpointCols={{
        default: 8,
        1600: 7,
        1400: 6,
        1200: 5,
        1000: 4,
        800: 3,
        600: 2,
        400: 1
      }}
      className={classes.masonryGrid}
      columnClassName={classes.masonryGridColumn}>
      {images.map((image) => <div key={image.id}>
        <img
          className={classes.searchImage}
          src={image.images.fixed_width_downsampled.url}
          onClick={() => props.onSelect(image)}/>
      </div>)}
    </Masonry>
  </div>;
};

export class StickerSearch {
  public static async searchForStickerUrl (type: StickerType): Promise<AttributedSource> {
    const modal = new Modal();
    const waitForShow = new Deferred<void>();

    const defer = new Deferred<any>();
    const modalPromise = modal.open({
      // eslint-disable-next-line react/display-name
      render: () =>
        <StickerSearchBody
          type={type}
          onSelect={(item: any) => defer.resolve(item)}/>,
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
      src: result.images.original[type === "stickers" ? "url" : "mp4"] as string
    };
  }
}
