import {Modal, ModalButton, ModalOpenParameters} from "./modal";
import LinearProgress from "@material-ui/core/LinearProgress";
import React from "react";
import Typography from "@material-ui/core/Typography";

export class ModalProgress extends Modal {
  public setProgress: (progress: number, status: string) => void = () => 0;

  public async open (params: ModalOpenParameters): Promise<ModalButton> {
    const {render} = params;
    params.render = () => {
      const [
        state,
        setState
      ] = React.useState({progress: 0, status: ""});

      React.useEffect(() => () => {
        this.setProgress = () => 0;
      }, []);

      this.setProgress = (progress, status) => setState({progress, status});
      return <div>
        {render ? render() : null}
        <Typography>
          {state.status}
        </Typography>
        <LinearProgress variant="determinate" value={state.progress * 100} />
      </div>;
    };
    return super.open(params);
  }
}
