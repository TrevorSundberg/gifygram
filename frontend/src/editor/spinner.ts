import "./spinner.css";
import $ from "jquery";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const html = require("./spinner.html").default;

export class Spinner {
  private root: JQuery;

  private count = 0;

  public constructor () {
    this.root = $(html);
  }

  public show () {
    if (this.count === 0) {
      $(document.body).append(this.root);
    }
    ++this.count;
  }

  public hide () {
    if (this.count === 1) {
      this.root.remove();
    }
    --this.count;
  }
}
