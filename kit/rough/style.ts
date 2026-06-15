// House visual tokens. Crude-on-purpose; the wobble comes from Rough.js (see rough.tsx).

export const SEED = 42; // fixed seed => deterministic geometry (recurring characters look identical)

export const INK = "#1b1b1b";

export const PALETTE = {
  paper: "#f3ead6", // warm off-white background ("MS Paint on old paper")
  ink: INK,
  skin: "#f6c89a",
  sea: "#6fa8dc",
  seaDeep: "#3d6fa0",
  gold: "#e2b13c",
  tie: "#b23b3b",
  shirt: "#fbfbfb",
  wall: "#e2e8ee",
  rock: "#cbbd97",
  paper2: "#ffffff",
} as const;

export const STAGE = { w: 1920, h: 1080 } as const;

export const CAPTION_FONT = '"Comic Sans MS", "Marker Felt", "Chalkboard SE", cursive';
