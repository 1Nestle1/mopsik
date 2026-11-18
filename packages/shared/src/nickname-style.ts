export const NICKNAME_EFFECTS = [
  'plain',
  'glow',
  'underline',
  'gradient'
] as const;

export type TNicknameStyle = {
  color: string;
  accent: string;
  effect: (typeof NICKNAME_EFFECTS)[number];
};
