import $ = require("jquery");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const modalHtml = require("./modal.html").default;

export class Modal {
  private modalJquery: JQuery;

  public constructor () {
    this.modalJquery = $(modalHtml);
    this.modalJquery.modal();
    this.modalJquery.on("shown.bs.modal", () => {
      console.log("modal shown");
    });
  }
}
