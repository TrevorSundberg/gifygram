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
  private modalJquery: JQuery;

  public async open (buttons: ModalButton[], bodyText: string): Promise<ModalButton> {
    const closeButton = buttons.find((button) => button.isClose);
    this.modalJquery = $(modalHtml);
    if (!closeButton) {
      this.modalJquery.find(".close").remove();
    }
    const defer = new Deferred<ModalButton>();
    const footer = this.modalJquery.find(".modal-footer");
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
    this.modalJquery.modal({
      backdrop: closeButton ? true : "static",
      show: true
    });
    const body = this.modalJquery.find(".modal-body");
    body.text(bodyText);
    this.modalJquery.one("hidden.bs.modal", () => {
      defer.resolve(closeButton);
      this.modalJquery.remove();
      this.modalJquery = null;
    });
    return defer;
  }

  public hide () {
    this.modalJquery.modal("hide");
  }
}
