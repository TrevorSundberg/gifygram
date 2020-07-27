import firebase from "firebase/app";
// eslint-disable-next-line sort-imports
import "firebase/auth";
import "firebase/firestore";
import {isDevEnvironment} from "./shared";

// eslint-disable-next-line @typescript-eslint/no-var-requires
firebase.initializeApp(require("../../firebaseOptions"));

if (isDevEnvironment()) {
  firebase.firestore().settings({
    host: "localhost:5003",
    ssl: false
  });
}

export const store = firebase.firestore();
