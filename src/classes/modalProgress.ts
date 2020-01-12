import {Modal, ModalButton, ModalOpenParameters} from "./modal";
import $ from "jquery";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const contentHtml = require("./modalProgress.html").default;

export class ModalProgress extends Modal {
  private progress: JQuery;

  private status: JQuery;

  public async open (params: ModalOpenParameters): Promise<ModalButton> {
    const div = $(contentHtml);
    this.progress = div.find("#progress");
    this.status = div.find("#status");
    div.prepend(params.content);
    params.content = div;
    return super.open(params);
  }

  public setProgress (value: number, status: string) {
    this.progress.css("width", `${value * 100}%`);
    this.status.text(status);
  }
}
