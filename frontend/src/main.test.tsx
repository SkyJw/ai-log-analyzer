import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./main";

describe("App", () => {
  it("renders the scaffold title", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /AI Log Analyzer/i })).toBeInTheDocument();
  });
});
