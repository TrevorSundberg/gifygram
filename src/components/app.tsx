import * as React from "react";

export interface Page {
  color: string;
}

export class App extends React.Component<Page, {}> {
  render () {
    return <div>
      <h1>Welcome to React with Typescript</h1>
      <p>The color of this page is: {this.props.color}</p>
    </div>;
  }
}
