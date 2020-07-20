import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import React from "react";

interface SubmitButtonProps {
  submitting: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = (props) =>
  <Button type="submit" variant="contained" color="primary" disabled={props.submitting}>
    {props.children}
    {
      props.submitting
        ? <Box ml={1} display="flex">
          <CircularProgress size="1rem" color="secondary" />
        </Box>
        : null
    }
  </Button>;
