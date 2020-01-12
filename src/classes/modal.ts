import "./modal.css";
import $ from "jquery";
import {Deferred} from "./utility";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const modalHtml = require("./modal.html").default;

export type ModalCallback = (modal: Modal, button: ModalButton) => void;

export interface ModalButton {
  name: string;

  dismiss?: boolean;

  callback?: ModalCallback;
}

export interface ModalOpenParameters {
  title: string;
  content?: JQuery;
  dismissable?: boolean;
  fullscreen?: boolean;
  buttons?: ModalButton[];
}

export class Modal {
  public root: JQuery;

  public async open (params: ModalOpenParameters): Promise<ModalButton> {
    this.root = $(modalHtml);
    const defer = new Deferred<ModalButton>();
    if (params.fullscreen) {
      const modalDialog = this.root.find(".modal-dialog");
      modalDialog.css("max-width", "none");
      modalDialog.css("width", "100%");
      modalDialog.css("height", "100%");
      modalDialog.css("margin", "0");
      modalDialog.css("padding", "0");
      const modalContent = this.root.find(".modal-content");
      modalContent.css("width", "100%");
      modalContent.css("height", "100%");
      const interval = setInterval(() => {
        this.root.css("padding-left", "0px");
      });
      defer.then(() => {
        clearInterval(interval);
      });
    }

    this.root.find("#modalTitle").text(params.title);
    if (!params.dismissable) {
      this.root.find(".close").remove();
    }
    const footer = this.root.find(".modal-footer");
    for (const button of params.buttons || []) {
      const buttonQuery = $("<button type=\"button\" class=\"btn btn-secondary\"></button>");
      if (button.dismiss) {
        buttonQuery.attr("data-dismiss", "modal");
      }
      buttonQuery.text(button.name);
      ((currentButton: ModalButton) => {
        buttonQuery.one("click", () => {
          defer.resolve(button);
          if (button.callback) {
            button.callback(this, currentButton);
          }
        });
      })(button);
      footer.append(buttonQuery);
    }
    this.root.modal({
      backdrop: params.dismissable ? true : "static",
      show: true
    });
    const body = this.root.find(".modal-body");
    if (params.content) {
      body.append(params.content);
    }
    this.root.one("shown.bs.modal", () => {
      this.root.find("[autofocus]").focus();
    });
    this.root.one("hidden.bs.modal", () => {
      defer.resolve(null);
      this.root.remove();
      this.root = null;
    });
    return defer;
  }

  public hide () {
    if (this.root) {
      this.root.modal("hide");
    }
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
