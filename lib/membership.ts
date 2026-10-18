export type Plan = {
  id: 'community' | 'records' | 'full-service';
  name: string;
  status: 'available' | 'coming-soon';
  price: string;
  summary: string;
  pickup: string;
  features: string[];
};

export const plans: Plan[] = [
  {
    id: 'community',
    name: 'Community',
    status: 'available',
    price: 'Free',
    summary: 'Everything you need to start rescuing food today.',
    pickup: 'Recipients pick up from you',
    features: [
      'Post surplus in plain English; AI drafts the listing in about two minutes',
      'Automatic matching to nearby recipients who can use it',
      'USDA-based safety checks and guidance on federal liability protection',
      'Impact dashboard and a shareable summary for your customers',
    ],
  },
  {
    id: 'records',
    name: 'Records',
    status: 'coming-soon',
    price: 'Paid membership',
    summary: 'Everything in Community, plus the paperwork your CPA needs.',
    pickup: 'Recipients pick up from you',
    features: [
      'Everything in Community',
      'Every donation tracked by item, weight, date, and recipient',
      'Tax-ready donation reports to send to your CPA',
      'Year-end summary to support the enhanced federal food donation deduction',
    ],
  },
  {
    id: 'full-service',
    name: 'Full Service',
    status: 'coming-soon',
    price: 'Paid membership',
    summary: 'Everything in Records, and we handle the food for you.',
    pickup: 'FeedForward packages, picks up, and delivers',
    features: [
      'Everything in Records',
      'Packaging at your location',
      'Scheduled pickups by the FeedForward team',
      'Delivery to the right place: people, farms, or compost',
    ],
  },
];

export const recipientOffer = {
  heading: 'For pantries, shelters, farms, and compost sites',
  price: 'Free, always',
  points: [
    'Only food you can use: set the tiers and categories you accept',
    "Claim in two clicks and pick a pickup time inside the food's safe window",
    'Every pickup logged, so you can show your funders',
  ],
};