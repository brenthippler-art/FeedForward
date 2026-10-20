export type SafetyFact = {
  title: string;
  body: string;
  source: { label: string; href: string };
};

export const safetyFacts: SafetyFact[] = [
  {
    title: 'Donors are protected by federal law',
    body: 'The Bill Emerson Good Samaritan Food Donation Act protects donors and nonprofits from civil and criminal liability when they donate apparently wholesome food in good faith. Protection is lost only for gross negligence or intentional misconduct.',
    source: {
      label: 'ReFED: Federal liability protection',
      href: 'https://policyfinder.refed.org/federal-policy/federal-liability-protection',
    },
  },
  {
    title: 'Restaurants can donate directly',
    body: 'The Food Donation Improvement Act of 2022 expanded those protections. Restaurants, grocers, caterers, and schools can now donate directly to people in need, not only through a nonprofit.',
    source: {
      label: 'ReFED: Food Donation Improvement Act',
      href: 'https://policyfinder.refed.org/federal-policy/food-donation-act/',
    },
  },
  {
    title: 'Cooked food follows the USDA 2-hour rule',
    body: 'USDA says never leave perishable food between 40 and 140°F for more than two hours, or one hour above 90°F. That is why FeedForward asks how long cooked food has been out before it can go to people.',
    source: {
      label: 'USDA: Keep clear of the Danger Zone',
      href: 'https://www.fsis.usda.gov/news-events/news-press-releases/usda-urges-consumers-keep-clear-danger-zone-summer',
    },
  },
  {
    title: 'Food with meat never goes to animals',
    body: 'The federal Swine Health Protection Act restricts feeding food waste that contains meat to pigs. FeedForward never sends food that contains or touched meat to any animal. It becomes compost instead.',
    source: {
      label: '7 U.S.C. § 3803: Swine Health Protection Act',
      href: 'https://www.law.cornell.edu/uscode/text/7/3803',
    },
  },
  {
    title: 'Kentucky: no food scraps for pigs',
    body: 'Kentucky counts vegetable waste from preparing food as garbage, and bans feeding garbage to swine, treated or not. Plant-based scraps go to farms that raise goats, chickens, or other livestock, not pigs.',
    source: {
      label: 'Kentucky 302 KAR 22:080',
      href: 'https://apps.legislature.ky.gov/law/kar/titles/302/022/080/',
    },
  },
];