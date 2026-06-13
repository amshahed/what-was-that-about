// Canonical component library. Side-effect import: registers every component
// on first load. Anything that calls composeScene() must transitively import this.

import { register } from "./registry";
import { num, str, bool, oneOf } from "./params";
import { StickFigure } from "./primitives/StickFigure";
import { Caption } from "./primitives/Caption";
import { CaveOffice, SeaGlory, OfficeWall } from "./primitives/backgrounds";
import { Trident, Desk, Papers, Pen, Watch, WallClock, SadPlant } from "./primitives/props";

const POSES = ["sitting", "glory", "tie"] as const;

// Backgrounds
register("bg:cave-office", () => <CaveOffice />);
register("bg:sea-glory", () => <SeaGlory />);
register("bg:office-wall", () => <OfficeWall />);

// Actors
register("actor:poseidon", (p) => (
  <StickFigure
    x={num(p.x)}
    y={num(p.y)}
    pose={oneOf(p.pose, POSES, "glory")}
    beard={bool(p.beard, true)}
    longHair={bool(p.longHair, false)}
    tie={bool(p.tie, false)}
  />
));

// Generic narrator (no beard, no flowing hair). Placeholder utility actor.
register("actor:narrator", (p) => (
  <StickFigure
    x={num(p.x)}
    y={num(p.y)}
    pose={oneOf(p.pose, POSES, "tie")}
    beard={bool(p.beard, false)}
    longHair={false}
    tie={bool(p.tie, false)}
  />
));

// Props
register("prop:trident", (p) => (
  <Trident cx={num(p.cx)} topY={num(p.topY)} bottomY={num(p.bottomY)} />
));
register("prop:desk", (p) => (
  <Desk x={num(p.x)} y={num(p.y)} w={num(p.w)} h={num(p.h)} />
));
register("prop:papers", (p) => <Papers x={num(p.x)} y={num(p.y)} />);
register("prop:pen", (p) => <Pen x={num(p.x)} y={num(p.y)} />);
register("prop:watch", (p) => <Watch x={num(p.x)} y={num(p.y)} />);
register("prop:wall-clock", (p) => <WallClock x={num(p.x)} y={num(p.y)} />);
register("prop:plant", (p) => <SadPlant x={num(p.x)} y={num(p.y)} />);

// Caption
register("caption", (p) => <Caption text={str(p.text)} />);
