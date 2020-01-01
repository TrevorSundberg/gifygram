import "./modal.css";
import $ = require("jquery");
import {Deferred} from "./utility";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const modalHtml = require("./modal.html").default;

export type ModalCallback = (modal: Modal, button: ModalButton) => void;

export interface ModalButton {
  name: string;

  dismiss?: boolean;

  callback?: ModalCallback;
}

export class Modal {
  private root: JQuery;

  public async open (
    title: string,
    content: JQuery,
    dismissable: boolean,
    buttons: ModalButton[]
  ): Promise<ModalButton> {
    this.root = $(modalHtml);
    this.root.find("#modalTitle").text(title);
    if (!dismissable) {
      this.root.find(".close").remove();
    }
    const defer = new Deferred<ModalButton>();
    const footer = this.root.find(".modal-footer");
    for (const button of buttons) {
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
      backdrop: dismissable ? true : "static",
      show: true
    });
    const body = this.root.find(".modal-body");
    body.append(content);
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
}
