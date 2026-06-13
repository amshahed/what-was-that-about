import { Composition } from "remotion";
import { STAGE } from "../../kit/rough/style";
import { PoseidonOffice } from "./shots/PoseidonOffice";
import { PoseidonGlory } from "./shots/PoseidonGlory";
import { PoseidonTie } from "./shots/PoseidonTie";
import { BeatStill, BEAT_STILL_DEFAULT_PROPS } from "./compositions/BeatStill";

// Compositions:
//   poseidon-office/glory/tie  — fixed house-style samples (Slice #2)
//   beat-still                 — parameterised; render-script.ts passes a SceneSpec
//                                via inputProps to render one beat at a time.
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
    <Composition
      id="beat-still"
      component={BeatStill}
      durationInFrames={1}
      fps={30}
      width={STAGE.w}
      height={STAGE.h}
      defaultProps={BEAT_STILL_DEFAULT_PROPS}
    />
  </>
);
