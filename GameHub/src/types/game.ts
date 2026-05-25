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
  playUrl: string;
};
