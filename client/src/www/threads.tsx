import {API_THREAD_LIST, ReturnedThread} from "../../../common/common";
import {abortableJsonFetch, cancel, makeUrl} from "../shared/shared";
import Avatar from "@material-ui/core/Avatar";
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
import {useStyles} from "./style";

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

  const classes = useStyles();
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
          subheader={thread.username}
        />
        <CardMedia>
          <video
            width={thread.userdata.width}
            height={thread.userdata.height}
            className={classes.video}
            muted
            loop
            onMouseEnter={(event) => (event.target as HTMLVideoElement).play().catch(() => 0)}
            onMouseLeave={(event) => (event.target as HTMLVideoElement).pause()}
            onTouchStart={(event) => (event.target as HTMLVideoElement).play().catch(() => 0)}
            onTouchEnd={(event) => (event.target as HTMLVideoElement).pause()}
            src={makeUrl("/api/animation/video", {id: thread.id})}>
          </video>
        </CardMedia>
        <CardContent>
          <Typography variant="body2" color="textSecondary" component="p">
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
        </CardActions>
      </Card>)}
    </div>);
};
