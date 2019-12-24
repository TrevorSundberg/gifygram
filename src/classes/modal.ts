import "./modal.css";
import $ = require("jquery");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const modalHtml = require("./modal.html").default;

export interface ModalButton {
  name: string;

  isClose?: boolean;
}

export class Modal {
  private modalJquery: JQuery;

  public constructor (buttons: ModalButton[], bodyText: string) {
    const hasClose = Boolean(buttons.find((button) => button.isClose));
    this.modalJquery = $(modalHtml);
    if (!hasClose) {
      this.modalJquery.find(".close").remove();
    }
    this.modalJquery.modal({
      backdrop: hasClose ? true : "static",
      show: true
    });
    const footer = this.modalJquery.find(".modal-footer");
    for (const button of buttons) {
      const buttonQuery = $("<button type=\"button\" class=\"btn btn-secondary\"></button>");
      buttonQuery.text(button.name);
      if (button.isClose) {
        buttonQuery.attr("data-dismiss", "modal");
      }
      footer.append(buttonQuery);
    }
    const body = this.modalJquery.find(".modal-body");
    body.text(bodyText);
    this.modalJquery.on("shown.bs.modal", () => {
      console.log("modal shown");
    });
  }
}
