import { Composition } from "remotion";
import { STAGE } from "../../kit/rough/style";
import { PoseidonOffice } from "./shots/PoseidonOffice";
import { PoseidonGlory } from "./shots/PoseidonGlory";
import { PoseidonTie } from "./shots/PoseidonTie";

// Stills for the house-style spike (Slice 2). durationInFrames=1 — they're single frames.
export const RemotionRoot = () => (
  <>
    <Composition
      id="poseidon-office"
      component={PoseidonOffice}
      durationInFrames={1}
      fps={30}
      width={STAGE.w}
      height={STAGE.h}
    />
    <Composition
      id="poseidon-glory"
      component={PoseidonGlory}
      durationInFrames={1}
      fps={30}
      width={STAGE.w}
      height={STAGE.h}
    />
    <Composition
      id="poseidon-tie"
      component={PoseidonTie}
      durationInFrames={1}
      fps={30}
      width={STAGE.w}
      height={STAGE.h}
    />
  </>
);
