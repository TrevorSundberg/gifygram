import firebase from "firebase/app";
// eslint-disable-next-line sort-imports
import "firebase/auth";
import "firebase/analytics";
import "firebase/firestore";
import {isDevEnvironment} from "./shared";

// eslint-disable-next-line @typescript-eslint/no-var-requires
firebase.initializeApp(require("../../firebaseOptions"));
firebase.analytics();

if (isDevEnvironment()) {
  firebase.firestore().settings({
    host: `${new URL(window.location.href).hostname}:5003`,
    ssl: false
  });
}

export const store = firebase.firestore();
