export type Stat = {
  value: string;
  label: string;
  source: { name: string; year: string; href: string };
};

export type StoryAct = {
  id: string;
  eyebrow: string;
  heading: string;
  body: string;
  stats: Stat[];
};

const mealGap2026 = {
  name: 'Feeding America, Map the Meal Gap 2026',
  year: '2024 data',
  href: 'https://netfoodbank.org/new-data-reveals-food-insecurity-in-tennessee-reaches-highest-level-in-years/',
};

export const storyActs: StoryAct[] = [
  {
    id: 'need',
    eyebrow: 'The need',
    heading: 'Hunger is closer than you think',
    body: 'Food insecurity reaches every county in America, and the South is hit hardest.',
    stats: [
      { value: '1 in 6', label: 'Tennesseans faced food insecurity', source: mealGap2026 },
    ],
  },
  {
    id: 'waste',
    eyebrow: 'The waste',
    heading: 'Meanwhile, good food goes in the trash',
    body: 'Most surplus food is still good to eat. Very little of it ever reaches the people who need it.',
    stats: [
      {
        value: 'Under 2%',
        label: 'of surplus food gets donated, even though most of it is edible',
        source: {
          name: 'ReFED via AgFunderNews',
          year: '2021 data',
          href: 'https://agfundernews.com/us-generated-91m-tons-of-surplus-food-in-2021-representing-6-of-all-ghg-emissions-just-2-was-donated',
        },
      },
    ],
  },
  {
    id: 'squeeze',
    eyebrow: 'The squeeze',
    heading: 'The people fighting hunger are stretched thin',
    body: 'Food banks are losing federal supply just as the cost of feeding people keeps rising.',
    stats: [
      {
        value: '30%',
        label: "of Second Harvest of Middle Tennessee's USDA food supply lost to federal cuts",
        source: {
          name: 'WSMV',
          year: '2025',
          href: 'https://www.wsmv.com/2025/07/09/second-harvest-food-bank-lose-significant-amount-food-supplies-due-federal-cuts/',
        },
      },
    ],
  },
];

export const opportunityStat: Stat = {
  value: '9.3 million',
  label: "meals a year could be rescued by Nashville's restaurants, institutions, and caterers - closing about 23% of Davidson County's meal gap",
  source: {
    name: 'Nashville Food Rescue Landscape Analysis',
    year: '2017',
    href: 'https://filetransfer.nashville.gov/portals/0/sitecontent/pw/docs/recycle/MasterPlan/Nashville%20Food%20Rescue.pdf',
  },
};

export const landfillStats: Stat[] = [
  {
    value: '58%',
    label: 'of landfill methane emissions come from wasted food',
    source: { name: 'U.S. EPA', year: '2026', href: 'https://epa.gov/sustainable-management-food/wasted-food-scale' },
  },
  {
    value: '~4 years',
    label: "of capacity left at Middle Point, the landfill that takes most of Nashville's trash",
    source: {
      name: 'WPLN',
      year: 'Feb 2025',
      href: 'https://wpln.org/post/if-nashville-is-blocked-from-using-middle-point-landfill-whats-next/',
    },
  },
];

export type PullQuoteData = {
  quote: string;
  name: string;
  role: string;
  source: { name: string; year: string; href: string };
};

export const kitchenQuotes: PullQuoteData[] = [
  {
    quote: "When I see half-eaten food or trim waste, I always think damn, someone would've killed to eat that.",
    name: 'Camari Mick',
    role: 'Pastry chef, The Musket Room',
    source: {
      name: 'Michelin Guide',
      year: '2024',
      href: 'https://guide.michelin.com/ca/en/article/features/new-york-city-make-food-not-waste-restaurant-week-michelin-guide',
    },
  },
  {
    quote: "We're talking about food that is perfectly good.",
    name: 'Tom Colicchio',
    role: 'Chef and Top Chef head judge',
    source: {
      name: 'PBS NewsHour',
      year: '2016',
      href: 'https://www.pbs.org/newshour/show/top-chef-tom-colicchio-on-americas-staggering-waste-of-food',
    },
  },
    {
    quote: 'When we throw away food, we are collectively wasting resources, wasting opportunity and wasting dignity.',
    name: 'Massimo Bottura',
    role: 'Chef, Osteria Francescana',
    source: {
      name: 'UN Environment Programme',
      year: '2025',
      href: 'https://www.unep.org/news-and-stories/story/chef-massimo-bottura-tackling-food-waste-about-creating-beauty-through',
    },
  },
];

// Feeding America counts about 1.2 lbs of food as one meal.
// Only people-tier pounds become meals; animal feed and compost do not.
export const LBS_PER_MEAL = 1.2;
export const lbsPerMealSource = {
  name: 'Feeding America',
  href: 'https://www.feedingamerica.org/ways-to-give/faq/about-our-claims',
};