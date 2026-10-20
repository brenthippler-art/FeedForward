export type Role = 'donor' | 'recipient';

export type DemoUser = {
  orgId: number;
  name: string;
  role: Role;
  description: string;
};

export const demoUsers: DemoUser[] = [
  { orgId: 1, name: 'Barren River Barbecue', role: 'donor', description: 'Restaurant' },
  { orgId: 2, name: 'Hilltop Dining Hall', role: 'donor', description: 'University dining' },
  { orgId: 3, name: 'Warren Regional Hospital', role: 'donor', description: 'Hospital cafeteria' },
  { orgId: 11, name: 'Fountain Square Community Pantry', role: 'recipient', description: 'Food pantry · Tier 1' },
  { orgId: 12, name: 'Porch Light Supper Table', role: 'recipient', description: 'Shelter kitchen · Tier 1' },
  { orgId: 13, name: 'Drakes Creek Goat & Garden', role: 'recipient', description: 'Farm · Tier 2' },
  { orgId: 14, name: 'Last Call Compost', role: 'recipient', description: 'Compost site · Tier 3' },
];

export function findDemoUser(orgId: number) {
  return demoUsers.find((user) => user.orgId === orgId);
}