import {API_THREAD_LIST, ReturnedThread} from "../../../common/common";
import {abortableJsonFetch, cancel} from "../shared/shared";
import {AnimationVideo} from "./animationVideo";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import CardMedia from "@material-ui/core/CardMedia";
import FavoriteIcon from "@material-ui/icons/Favorite";
import IconButton from "@material-ui/core/IconButton";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import React from "react";
import ShareIcon from "@material-ui/icons/Share";
import Typography from "@material-ui/core/Typography";

interface ThreadsProps {
  history: import("history").History;
}

export const Threads: React.FC<ThreadsProps> = (props) => {
  const [
    threads,
    setThreads
  ] = React.useState<ReturnedThread[]>([]);

  React.useEffect(() => {
    const threadListFetch = abortableJsonFetch<ReturnedThread[]>(API_THREAD_LIST);
    threadListFetch.then((threadList) => {
      if (threadList) {
        setThreads(threadList);
      }
    });

    return () => {
      cancel(threadListFetch);
    };
  }, []);

  return (
    <div style={{
      columnCount: 4,
      columnWidth: "150px",
      columnGap: "10px"
    }}>
      {threads.map((thread) => <Card
        key={thread.id}
        style={{
          breakInside: "avoid",
          position: "relative",
          marginBottom: "10px"
        }}
        onClick={() => {
          props.history.push(`/thread?threadId=${thread.id}`);
        }}>
        <CardHeader
          avatar={
            <Avatar>
              {thread.username.slice(0, 1).toUpperCase()}
            </Avatar>
          }
          action={
            <IconButton>
              <MoreVertIcon />
            </IconButton>
          }
          title={thread.title}
        />
        <CardMedia>
          <AnimationVideo
            id={thread.id}
            width={thread.userdata.width}
            height={thread.userdata.height}
            onMouseEnter={(event) => (event.target as HTMLVideoElement).play().catch(() => 0)}
            onMouseLeave={(event) => (event.target as HTMLVideoElement).pause()}
            onTouchStart={(event) => (event.target as HTMLVideoElement).play().catch(() => 0)}
            onTouchEnd={(event) => (event.target as HTMLVideoElement).pause()}
          />
        </CardMedia>
        <CardContent>
          <Typography noWrap variant="body2" color="textSecondary" component="p">
            {thread.message}
          </Typography>
        </CardContent>
        <CardActions disableSpacing>
          <IconButton>
            <FavoriteIcon />
          </IconButton>
          <IconButton>
            <ShareIcon />
          </IconButton>
          <div style={{flexGrow: 1}}></div>
          <Button
            variant="contained"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              props.history.push(`/editor?remixId=${thread.id}`);
            }}>
            Remix
          </Button>
        </CardActions>
      </Card>)}
    </div>);
};
