import "./modal.css";
import $ = require("jquery");
import {Deferred} from "./utility";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const modalHtml = require("./modal.html").default;

export type ModalCallback = (button: ModalButton) => void;

export interface ModalButton {
  name: string;

  isClose?: boolean;

  callback?: ModalCallback;
}

export class Modal {
  private root: JQuery;

  public async open (title: string, content: JQuery, buttons: ModalButton[]): Promise<ModalButton> {
    this.root = $(modalHtml);
    this.root.find("#modalTitle").text(title);
    const closeButton = buttons.find((button) => button.isClose);
    if (!closeButton) {
      this.root.find(".close").remove();
    }
    const defer = new Deferred<ModalButton>();
    const footer = this.root.find(".modal-footer");
    for (const button of buttons) {
      const buttonQuery = $("<button type=\"button\" class=\"btn btn-secondary\" data-dismiss=\"modal\"></button>");
      buttonQuery.text(button.name);
      ((currentButton: ModalButton) => {
        buttonQuery.one("click", () => {
          defer.resolve(button);
          if (button.callback) {
            button.callback(currentButton);
          }
        });
      })(button);
      footer.append(buttonQuery);
    }
    this.root.modal({
      backdrop: closeButton ? true : "static",
      show: true
    });
    const body = this.root.find(".modal-body");
    body.append(content);
    this.root.one("hidden.bs.modal", () => {
      defer.resolve(closeButton);
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
