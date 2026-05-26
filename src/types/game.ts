export type GameStatus =
  | 'In development'
  | 'Playable'
  | 'Prototype'
  | 'Coming soon'
  | 'Completed';

export type CoCreator = {
  name: string;
  github: string;
};

export type Game = {
  id: string;
  name: string;
  creator: string;
  creatorGithub: string;
  coCreators?: CoCreator[];
  description: string;
  screenshot: string;
  status: GameStatus | string;
  tags: string[];
  branch: string;
  /** Local path (e.g. /games/Foo/index.html) or full external URL (https://...). '#' means not yet playable. */
  playUrl: string;
  /** Optional explicit profile photo path. If omitted, resolved from creator name. */
  pfp?: string;
};

/** Returns true when the url is an absolute http(s) link that should open in a new tab as an external resource. */
export const isExternalUrl = (url: string): boolean => /^https?:\/\//i.test(url);

/** Resolves a profile-photo path under /pfp/ from a creator's name. */
export const pfpPath = (name: string): string => {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
  // Full filename overrides (when the on-disk name or extension differs from the slug).
  const fileOverrides: Record<string, string> = {
    boyan: 'boqn.jpg',
    ivanzhela: 'ivanzhela.png',
  };
  const file = fileOverrides[slug] ?? `${slug}.jpg`;
  return `/pfp/${file}`;
};
