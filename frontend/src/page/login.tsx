import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import {ModalProps} from "@material-ui/core/Modal";
import React from "react";

export type LoginState = boolean;
export const LoginContext = React.createContext<LoginState>(false);

export interface LoginDialogProps {
  open: boolean;
  onClose: ModalProps["onClose"];
  onSignInWithGoogle: () => unknown;
}

export const LoginDialog: React.FC<LoginDialogProps> = (props) => <Dialog
  onClose={props.onClose}
  open={props.open}>
  <DialogTitle>Login or create an account to continue...</DialogTitle>
  <Button onClick={props.onSignInWithGoogle} variant="contained" color="primary">Login with Google</Button>
</Dialog>;
