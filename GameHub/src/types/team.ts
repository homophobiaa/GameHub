export type TeamMember = {
  name: string;
  role: string;
  github: string;
  description: string;
};

export type TeamData = {
  teacher: TeamMember;
  additionalContributors: TeamMember[];
};
