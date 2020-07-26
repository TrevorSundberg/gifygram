import Dialog from "@material-ui/core/Dialog";
import {ModalProps} from "@material-ui/core/Modal";
import React from "react";
import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";
import firebase from "firebase/app";

export type LoginUserIdState = undefined | string | null;
export const LoginUserIdContext = React.createContext<LoginUserIdState>(undefined);

export interface LoginDialogProps {
  open: boolean;
  onClose: ModalProps["onClose"];
  onSignInFailure: (message: string) => any;
  onSignInSuccess: (uid: string) => any;
}

export const LoginDialog: React.FC<LoginDialogProps> = (props) => <Dialog
  onClose={props.onClose}
  open={props.open}>
  <StyledFirebaseAuth uiConfig={{
    signInFlow: "popup",
    callbacks: {
      signInFailure: (error) => props.onSignInFailure(error.message),
      signInSuccessWithAuthResult: (result) => {
        console.log(result);
        props.onSignInSuccess(result.user.uid);
        return false;
      }
    },
    signInOptions: [
      firebase.auth.EmailAuthProvider.PROVIDER_ID,
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      firebase.auth.FacebookAuthProvider.PROVIDER_ID
    ]
  }} firebaseAuth={firebase.auth()}/>
</Dialog>;
