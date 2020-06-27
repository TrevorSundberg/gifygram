import React from "react";

export type LoginState = boolean;
export const LoginContext = React.createContext<LoginState>(false);
