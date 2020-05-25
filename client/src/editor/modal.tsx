import "./modal.css";
import {Button, Dialog, DialogActions, DialogContent, DialogTitle} from "@material-ui/core";
import {Deferred} from "./utility";
import React from "react";

export interface ModalOpenParameters {
  title?: string;
  dismissable?: boolean;
  fullscreen?: boolean;
  buttons?: ModalButton[];
  content?: JQuery;
  render? (): React.ReactNode;
  onShown?: () => unknown;
}

export interface ModalProps extends ModalOpenParameters {
  id: number;
  defer?: Deferred<ModalButton>;
}

const allModals: ModalProps[] = [];
const modalEvents = new EventTarget();
const modalsChangedEvent = "modalsChanged";
let modalIdCounter = 0;

const removeModalInternal = (id: number) => {
  const index = allModals.findIndex((modal) => modal.id === id);
  if (index !== -1) {
    allModals.splice(index, 1);
    modalEvents.dispatchEvent(new Event(modalsChangedEvent));
  }
};

export type ModalCallback = (button: ModalButton) => unknown;

export interface ModalButton {
  name: string;

  dismiss?: boolean;

  callback?: ModalCallback;

  submitOnEnter?: boolean;
}

export const ModalComponent: React.FC<ModalProps> = (props) => <Dialog
  open={true}
  disableBackdropClick={!props.dismissable}
  disableEscapeKeyDown={!props.dismissable}
  onClose={() => {
    if (props.defer) {
      props.defer.resolve(null);
    }
    removeModalInternal(props.id);
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
    }}>
      {props.render ? props.render() : null}
    </div>
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
          removeModalInternal(props.id);
        }}
        color="primary"
        autoFocus={button.submitOnEnter}>
        {button.name}
      </Button>)
    }
  </DialogActions>
</Dialog>;

export const ModalContainer: React.FC = () => {
  const [
    modals,
    setModals
  ] = React.useState<ModalProps[]>(allModals);
  React.useEffect(() => {
    const onModalsChanged = () => {
      setModals([...allModals]);
    };
    modalEvents.addEventListener(modalsChangedEvent, onModalsChanged);
    return () => {
      modalEvents.removeEventListener(modalsChangedEvent, onModalsChanged);
    };
  }, []);
  return <div id="modals">{modals.map((modal) => <ModalComponent key={modal.id} {...modal}/>)}</div>;
};

export class Modal {
  private id = modalIdCounter++;

  public async open (params: ModalOpenParameters): Promise<ModalButton> {
    const defer = new Deferred<ModalButton>();
    allModals.push({
      ...params,
      defer,
      id: this.id
    });
    modalEvents.dispatchEvent(new Event(modalsChangedEvent));
    return defer;
  }

  public hide () {
    removeModalInternal(this.id);
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
