import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE, STAGE } from "../../kit/rough/style";

// Every shot is an SVG drawn on the house "paper" background.
export const Scene = ({ children }: { children: ReactNode }) => (
  <AbsoluteFill style={{ backgroundColor: PALETTE.paper }}>
    <svg
      width={STAGE.w}
      height={STAGE.h}
      viewBox={`0 0 ${STAGE.w} ${STAGE.h}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  </AbsoluteFill>
);
