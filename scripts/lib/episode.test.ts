import { describe, it, expect } from "vitest";
import { isFactcheckApproved } from "./episode";

describe("isFactcheckApproved", () => {
  it("needs a line that reads exactly the approved status", () => {
    expect(isFactcheckApproved("# fact-check\n\nStatus: ✅ approved\n")).toBe(true);
    expect(isFactcheckApproved("Status: ✅ approved  \r\n")).toBe(true);
  });

  it("does not accept a mention in a comment or the pending status", () => {
    expect(
      isFactcheckApproved(
        'Status: ⏳ pending\n<!-- Change to "Status: ✅ approved" ONLY after… -->',
      ),
    ).toBe(false);
    expect(isFactcheckApproved("  Status: ✅ approved")).toBe(false);
  });
});
