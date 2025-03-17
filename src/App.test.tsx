import React from "react";
import { render } from "@testing-library/react";
import App from "./App";

test("renders learn react link", () => {
  const component = render(<App />);
  const buttonElement = component.getByText(/Record Event/);
  expect(buttonElement).toBeInTheDocument();
});
