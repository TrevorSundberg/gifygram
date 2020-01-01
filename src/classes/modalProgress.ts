import {Modal, ModalButton} from "./modal";
import $ = require("jquery");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const contentHtml = require("./modalProgress.html").default;

export class ModalProgress extends Modal {
  private progress: JQuery;

  private status: JQuery;

  public async open (
    title: string,
    content: JQuery,
    dismissable: boolean,
    buttons: ModalButton[]
  ): Promise<ModalButton> {
    const div = $(contentHtml);
    this.progress = div.find("#progress");
    this.status = div.find("#status");
    div.prepend(content);
    return super.open(title, div, dismissable, buttons);
  }

  public setProgress (value: number, status: string) {
    this.progress.css("width", `${value * 100}%`);
    this.status.text(status);
  }
}
