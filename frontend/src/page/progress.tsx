import Box from "@material-ui/core/Box";
import CircularProgress from "@material-ui/core/CircularProgress";
import React from "react";

export const IndeterminateProgress: React.FC = () =>
  <Box display="flex" justifyContent="center" style={{marginTop: "40vh"}}>
    <CircularProgress />
  </Box>;
