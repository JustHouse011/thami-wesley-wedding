const layers = [
  ['left-border', -1, 0.45], ['right-border', 1, 0.45],
  ['lower-left', -1, 0.72], ['lower-right', 1, 0.72],
  ['upper-left', -1, 1], ['upper-right', 1, 1],
  ['traditional', 1, 0.82], ['emblem', 0, 0.15],
] as const;

export const invitationArtwork = layers.map(([name, side, depth]) => ({
  name, side, depth, src: `/assets/cinematic/${name}.webp`,
}));

export const petalTexture = '/assets/cinematic/petal.webp';
