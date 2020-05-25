import "./modal.css";
import {Button, Dialog, DialogActions, DialogContent, DialogTitle} from "@material-ui/core";
import {Deferred} from "./utility";
import React from "react";
import ReactDOM from "react-dom";

export type ModalCallback = (button: ModalButton) => unknown;

export interface ModalButton {
  name: string;

  dismiss?: boolean;

  callback?: ModalCallback;

  submitOnEnter?: boolean;
}

export interface ModalOpenParameters {
  title?: string;
  dismissable?: boolean;
  fullscreen?: boolean;
  buttons?: ModalButton[];
  content?: JQuery;
  onShown?: () => unknown;
}

export interface ModalProps extends ModalOpenParameters {
  open: boolean;
  defer?: Deferred<ModalButton>;
}

export const ModalComponent: React.FC<ModalProps> = (props) => {
  const [
    completed,
    setCompleted
  ] = React.useState(false);
  return <Dialog
    open={props.open && !completed}
    disableBackdropClick={!props.dismissable}
    disableEscapeKeyDown={!props.dismissable}
    onClose={() => {
      if (props.defer) {
        props.defer.resolve(null);
      }
      setCompleted(true);
    }}
    fullScreen={props.fullscreen}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
  >
    <DialogTitle id="alert-dialog-title">{props.title}</DialogTitle>
    <DialogContent>
      { props.children }
      <div ref={(ref) => {
        if (props.content) {
          props.content.appendTo(ref);
        }
        if (props.onShown) {
          props.onShown();
        }
      }}></div>
    </DialogContent>
    <DialogActions>
      {
        (props.buttons || []).map((button) => <Button
          key={button.name}
          onClick={() => {
            if (props.defer) {
              props.defer.resolve(button);
            }
            if (button.callback) {
              button.callback(button);
            }
            setCompleted(true);
          }}
          color="primary"
          autoFocus={button.submitOnEnter}>
          {button.name}
        </Button>)
      }
    </DialogActions>
  </Dialog>;
};

export class Modal {
  public async open (params: ModalOpenParameters): Promise<ModalButton> {
    const defer = new Deferred<ModalButton>();
    ReactDOM.render(
      <ModalComponent
        defer={defer}
        open={true}
        {...params}/>,
      document.getElementById("modal")
    );
    return defer;
  }

  public hide () {
    ReactDOM.render(<ModalComponent open={false}/>, document.getElementById("modal"));
  }

  public static async messageBox (title: string, text: string): Promise<ModalButton> {
    const modal = new Modal();
    return modal.open({
      buttons: [
        {
          dismiss: true,
          name: "Close"
        }
      ],
      content: $("<p/>").text(text),
      dismissable: true,
      title
    });
  }
}
