import {Deferred, NonAlertingError} from "../shared/shared";
import Button from "@material-ui/core/Button";
import CloseIcon from "@material-ui/icons/Close";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import IconButton from "@material-ui/core/IconButton";
import React from "react";
import Typography from "@material-ui/core/Typography";
import {useStyles} from "../page/style";

export const MODALS_CHANGED = "modalsChanged";

export type ModalCallback = (button: ModalButton) => unknown;

export interface ModalButton {
  name: string;

  dismiss?: boolean;

  callback?: ModalCallback;

  submitOnEnter?: boolean;
}

export interface ModalOpenParameters {
  title?: string;
  titleImageUrl?: string;
  dismissable?: boolean;
  fullscreen?: boolean;
  buttons?: ModalButton[];
  render? (): React.ReactNode;
  onShown?: () => unknown;
}

export interface ModalProps extends ModalOpenParameters {
  id: number;
  defer: Deferred<ModalButton>;
}

export const allModals: ModalProps[] = [];
let modalIdCounter = 0;

const removeModalInternal = (id: number) => {
  const index = allModals.findIndex((modal) => modal.id === id);
  if (index !== -1) {
    allModals[index].defer.resolve(null);
    allModals.splice(index, 1);
    window.dispatchEvent(new Event(MODALS_CHANGED));
  }
};

export const ModalComponent: React.FC<ModalProps> = (props) => {
  const classes = useStyles();
  const hasSubmitButton = Boolean(props.buttons && props.buttons.find((button) => button.submitOnEnter));
  const content = <div>
    <DialogContent>
      { props.children }
      <div ref={() => {
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
          id={`button-${button.name}`}
          variant="contained"
          onClick={() => {
            if (props.defer) {
              props.defer.resolve(button);
            }
            if (button.callback) {
              button.callback(button);
            }
            // Delay by one frame to avoid the <form> not attached warning.
            setTimeout(() => {
              removeModalInternal(props.id);
            });
          }}
          color="primary"
          type={button.submitOnEnter ? "submit" : "button"}>
          {button.name}
        </Button>)
      }
    </DialogActions>
  </div>;

  return <Dialog
    open={true}
    fullWidth={true}
    disableBackdropClick={!props.dismissable}
    disableEscapeKeyDown={!props.dismissable}
    onClose={() => removeModalInternal(props.id)}
    fullScreen={props.fullscreen}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
  >
    <DialogTitle id="alert-dialog-title">
      {props.title}
      {props.titleImageUrl
        ? <img height={48} src={props.titleImageUrl}></img>
        : null}
      {
        props.dismissable
          ? <IconButton
            aria-label="close"
            className={classes.closeButton}
            onClick={() => removeModalInternal(props.id)}>
            <CloseIcon />
          </IconButton>
          : null
      }
    </DialogTitle>
    {
      hasSubmitButton
        ? <form onSubmit={(e) => e.preventDefault()}>{content}</form>
        : content
    }
  </Dialog>;
};

export const ModalContainer: React.FC = () => {
  const [
    modals,
    setModals
  ] = React.useState<ModalProps[]>(allModals);
  React.useEffect(() => {
    const onModalsChanged = () => {
      setModals([...allModals]);
    };
    window.addEventListener(MODALS_CHANGED, onModalsChanged);
    return () => {
      window.removeEventListener(MODALS_CHANGED, onModalsChanged);
    };
  }, []);
  return <div>{modals.map((modal) => <ModalComponent key={modal.id} {...modal}/>)}</div>;
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
    window.dispatchEvent(new Event(MODALS_CHANGED));
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
      render: () => <Typography>{text}</Typography>,
      dismissable: true,
      title
    });
  }
}

const displayError = (error: any) => {
  // Only show the error if we're not already showing another modal.
  if (allModals.length === 0) {
    const getError = (errorClass: Error) => errorClass instanceof NonAlertingError ? null : errorClass.message;
    const message = (() => {
      if (error instanceof Error) {
        return getError(error);
      }
      if (error instanceof PromiseRejectionEvent) {
        if (error.reason instanceof Error) {
          return getError(error.reason);
        }
        return `${error.reason}`;
      }
      return `${error}`;
    })();

    if (message) {
      Modal.messageBox("Error", message);
    }
  }
};

window.onunhandledrejection = (error) => displayError(error);
window.onerror = (message, source, lineno, colno, error) => displayError(error || message);
