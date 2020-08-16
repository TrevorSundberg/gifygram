import {Prompt} from "react-router-dom";
import React from "react";
import {isDevEnvironment} from "./shared";

export const EVENT_UNSAVED_CHANGES = "unsavedChanges";

export const DiscardChangesMessage = "Do you want to leave this page and discard any changes?";

export let hasUnsavedChanges = false;

window.onbeforeunload = () => {
  if (hasUnsavedChanges && !isDevEnvironment()) {
    return DiscardChangesMessage;
  }
  return undefined;
};

export const setHasUnsavedChanges = (value: boolean) => {
  hasUnsavedChanges = value;
  window.dispatchEvent(new Event(EVENT_UNSAVED_CHANGES));
};

export const UnsavedChangesPrompt: React.FC = () => {
  const [unsavedChanges, setUnsavedChanges] = React.useState(false);
  React.useEffect(() => {
    const onUnsavedChanges = () => {
      setUnsavedChanges(hasUnsavedChanges);
    };
    window.addEventListener(EVENT_UNSAVED_CHANGES, onUnsavedChanges);
    return () => {
      window.removeEventListener(EVENT_UNSAVED_CHANGES, onUnsavedChanges);
    };
  }, []);

  return <Prompt
    when={unsavedChanges}
    message={DiscardChangesMessage}
  />;
};
