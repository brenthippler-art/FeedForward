export type Role = 'donor' | 'recipient';

export type DemoUser = {
  orgId: number;
  name: string;
  role: Role;
  description: string;
};

export const demoUsers: DemoUser[] = [
  { orgId: 1, name: 'Two-Step Hot Chicken', role: 'donor', description: 'Restaurant' },
  { orgId: 2, name: 'Athens of the South Dining Hall', role: 'donor', description: 'University dining' },
  { orgId: 3, name: 'Music City Hospital', role: 'donor', description: 'Hospital cafeteria' },
  { orgId: 11, name: 'Harmony Hall Community Pantry', role: 'recipient', description: 'Food pantry · Tier 1' },
  { orgId: 12, name: 'Back Porch Supper Table', role: 'recipient', description: 'Shelter kitchen · Tier 1' },
  { orgId: 13, name: 'Riverbend Goat & Garden', role: 'recipient', description: 'Farm · Tier 2' },
  { orgId: 14, name: 'Last Call Compost', role: 'recipient', description: 'Compost site · Tier 3' },
];

export function findDemoUser(orgId: number) {
  return demoUsers.find((user) => user.orgId === orgId);
}