// Canonical component library. Side-effect import: registers every component
// on first load. Anything that calls composeScene() must transitively import this.
// Scope (ADR 0002): text-hero beats, diagrams and overlays. Characters come from AI stills.

import { register } from "./registry";
import { num, str, oneOf } from "./params";
import { Caption } from "./primitives/Caption";
import { OfficeWall, Paper } from "./primitives/backgrounds";
import { Desk, Papers, Pen, Watch, WallClock, SadPlant } from "./primitives/props";
import { TextHero, HERO_COLORS, type HeroColor } from "./primitives/TextHero";

const COLORS = Object.keys(HERO_COLORS) as HeroColor[];

// Backgrounds
register("bg:paper", () => <Paper />);
register("bg:office-wall", () => <OfficeWall />);

// Text
register("text:hero", (p) => (
  <TextHero
    text={str(p.text)}
    sub={p.sub === undefined ? undefined : str(p.sub)}
    color={oneOf(p.color, COLORS, "ink")}
  />
));

// Props
register("prop:desk", (p) => <Desk x={num(p.x)} y={num(p.y)} w={num(p.w)} h={num(p.h)} />);
register("prop:papers", (p) => <Papers x={num(p.x)} y={num(p.y)} />);
register("prop:pen", (p) => <Pen x={num(p.x)} y={num(p.y)} />);
register("prop:watch", (p) => <Watch x={num(p.x)} y={num(p.y)} />);
register("prop:wall-clock", (p) => <WallClock x={num(p.x)} y={num(p.y)} />);
register("prop:plant", (p) => <SadPlant x={num(p.x)} y={num(p.y)} />);

// Caption
register("caption", (p) => <Caption text={str(p.text)} />);
