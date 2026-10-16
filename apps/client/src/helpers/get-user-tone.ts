// each person keeps one calm hue, the same on every device and every session, so a call
// reads as people instead of a row of identical grey circles. teal (around 182) is left
// out on purpose: it is the accent, reserved for whoever is speaking
const USER_TONE_HUES = [214, 250, 290, 328, 18, 52, 96, 140] as const;

export const getUserToneHue = (userId: number): number => {
  const index = Math.abs(Math.trunc(userId)) % USER_TONE_HUES.length;

  return USER_TONE_HUES[index] ?? USER_TONE_HUES[0];
};

export const getUserTone = (userId: number): string =>
  `oklch(0.74 0.06 ${getUserToneHue(userId)})`;
