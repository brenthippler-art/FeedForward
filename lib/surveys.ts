// Both surveys, as data. The survey pages, the API route and the email
// all read from this one file, so the questions can never drift apart.

export type SurveyKind = 'donor' | 'recipient';

type QuestionBase = {
  id: string;
  label: string;
  required?: boolean;
  // Show this question only when an earlier single-choice answer is one of these
  showIf?: { question: string; anyOf: readonly string[] };
};

export type Question =
  | (QuestionBase & { type: 'single'; options: readonly string[] })
  | (QuestionBase & { type: 'multi'; options: readonly string[]; max?: number })
  | (QuestionBase & { type: 'scale'; minLabel: string; maxLabel: string })
  | (QuestionBase & { type: 'text'; maxLength?: number });

export type Section = { title: string; questions: Question[] };

export type Survey = {
  kind: SurveyKind;
  title: string;
  intro: string;
  sections: Section[];
};

export type Answers = Record<string, string | string[] | number>;

// Choice and 1–5 questions are required unless marked otherwise;
// short answers are optional unless marked required.
export function isRequired(question: Question) {
  return question.required ?? question.type !== 'text';
}

export function isVisible(question: Question, answers: Answers) {
  if (!question.showIf) return true;
  const answer = answers[question.showIf.question];
  return typeof answer === 'string' && question.showIf.anyOf.includes(answer);
}

const YES_MAYBE_NO = ['Yes', 'Maybe', 'No'] as const;

// ---------------------------------------------------------------- Donor

const OWNERSHIP = [
  'Independent',
  'Local group (2–5 locations)',
  'Regional or national chain',
] as const;

const donor: Survey = {
  kind: 'donor',
  title: 'Restaurant survey',
  intro:
    'Thanks for checking out FeedForward, a free app that connects Bowling Green restaurants that have surplus food with local pantries and community groups that pick it up. We’re still building it, and we want to hear from the people who would actually use it. This takes about 7 minutes. Your answers are sent privately to the FeedForward team and aren’t stored on the website, and “I’d never use this” is useful too.',
  sections: [
    {
      title: 'About your restaurant',
      questions: [
        {
          id: 'd-business-type',
          type: 'single',
          label: 'What type of food business do you run?',
          options: ['Fast casual', 'Full-service', 'Fast food / chain franchise', 'Café or bakery', 'Catering', 'Food truck', 'Other'],
        },
        {
          id: 'd-ownership',
          type: 'single',
          label: 'Are you independently owned or part of a chain or franchise?',
          options: OWNERSHIP,
        },
        {
          id: 'd-decider',
          type: 'single',
          label: 'Who decides whether to donate food: you, or corporate?',
          options: ['Me / this location', 'Corporate / franchisor', 'Shared', 'Not sure'],
          showIf: { question: 'd-ownership', anyOf: [OWNERSHIP[1], OWNERSHIP[2]] },
        },
        {
          id: 'd-role',
          type: 'single',
          label: 'What is your role?',
          options: ['Owner', 'General manager', 'Kitchen manager / chef', 'Other'],
        },
      ],
    },
    {
      title: 'Surplus food today',
      questions: [
        {
          id: 'd-surplus-frequency',
          type: 'single',
          label: 'How often do you end the day with edible food you can’t sell?',
          options: ['Daily', 'A few times a week', 'Weekly', 'Rarely', 'Never'],
        },
        {
          id: 'd-surplus-amount',
          type: 'single',
          label: 'On a typical day, about how much edible surplus do you have?',
          options: ['Under 5 lbs', '5–20 lbs', '20–50 lbs', '50+ lbs', 'Not sure'],
        },
        {
          id: 'd-surplus-kinds',
          type: 'multi',
          label: 'What kinds of surplus do you usually have? (Check all that apply.)',
          options: [
            'Cooked, held hot (e.g., rice, proteins)',
            'Cooked, held cold',
            'Prepped but uncooked',
            'Raw produce',
            'Bread / baked goods',
            'Packaged or sealed items',
            'Scraps / peels (compost or animal feed)',
          ],
        },
        {
          id: 'd-surplus-now',
          type: 'multi',
          label: 'What happens to that food today? (Check all that apply.)',
          options: ['Thrown away', 'Staff take it home', 'Donated', 'Composted', 'Given to farmers for animals', 'Other'],
        },
      ],
    },
    {
      title: 'Donating and what gets in the way',
      questions: [
        {
          id: 'd-donated-before',
          type: 'single',
          label: 'Have you ever donated surplus food?',
          options: ['Yes, regularly', 'Yes, once or a few times', 'No, but I’ve considered it', 'No, never considered it'],
        },
        {
          id: 'd-donation-story',
          type: 'text',
          label: 'If you’ve donated before, how did it go? If you stopped, why?',
        },
        {
          id: 'd-barriers',
          type: 'multi',
          max: 3,
          label: 'What stops you from donating more often? (Check up to 3.)',
          options: [
            'Worried about liability',
            'Don’t know who takes food',
            'No one picks up when I need them to',
            'Takes too much staff time',
            'Surplus amounts are too small or unpredictable',
            'Packaging / containers',
            'Food safety concerns',
            'Corporate policy',
            'Never thought about it',
            'Other',
          ],
        },
        {
          id: 'd-pickup-time',
          type: 'single',
          label: 'When would a pickup need to happen to work for you?',
          options: ['During the afternoon lull', 'Within an hour of close', 'Later that night', 'Next morning', 'Flexible'],
        },
      ],
    },
    {
      title: 'Food safety and liability',
      questions: [
        {
          id: 'd-emerson-aware',
          type: 'single',
          label: 'Have you heard of the federal Bill Emerson Good Samaritan Food Donation Act, which protects good-faith food donors from liability?',
          options: ['Yes, I know what it covers', 'I’ve heard of it', 'No'],
        },
        {
          id: 'd-comfort',
          type: 'multi',
          label: 'Would any of these make you more comfortable donating? (Check all that apply.)',
          options: [
            'A plain-language guide to liability protection',
            'A record of who picked up the food and when',
            'Recipients confirming they accept the food “as is”',
            'A quick handling checklist in the app (time out, held hot or cold)',
            'Insurance or health-department sign-off',
            'Nothing would change my mind',
          ],
        },
      ],
    },
    {
      title: 'Fitting it into your shift',
      questions: [
        {
          id: 'd-post-time',
          type: 'single',
          label: 'How much time could your staff spend posting a donation at close?',
          options: ['Under 1 minute', '1–3 minutes', '3–5 minutes', 'More than 5 minutes'],
        },
        {
          id: 'd-storage',
          type: 'single',
          label: 'Do you have space to hold donated food (fridge or hot-hold) until pickup?',
          options: ['Yes', 'Limited', 'No'],
        },
      ],
    },
    {
      title: 'Using the app',
      questions: [
        {
          id: 'd-ai-listing',
          type: 'single',
          label: 'Would you use a feature where you type or say something like “half a hotel pan of rice from lunch” and the app fills in the listing for you to confirm?',
          options: ['Yes, that sounds faster', 'Maybe', 'No, I’d rather fill in a form myself'],
        },
        {
          id: 'd-site-clarity',
          type: 'scale',
          label: 'From what you’ve seen on this website, how clear is it how FeedForward would work for your restaurant?',
          minLabel: 'Not clear',
          maxLabel: 'Very clear',
        },
      ],
    },
    {
      title: 'Value and pricing',
      questions: [
        {
          id: 'd-motivations',
          type: 'multi',
          max: 2,
          label: 'What would motivate you most to donate? (Pick your top 2.)',
          options: [
            'Tax deduction',
            'Helping people in Bowling Green',
            'Reducing waste',
            'Good publicity / customer goodwill',
            'Lower disposal costs',
            'Staff morale',
          ],
        },
        {
          id: 'd-tax-deduction',
          type: 'single',
          label: 'Do you currently claim a tax deduction for donated food?',
          options: ['Yes', 'No', 'Didn’t know I could', 'Not sure, my accountant handles it'],
        },
        {
          id: 'd-free-tier',
          type: 'scale',
          label: 'If FeedForward were free and recipients handled all pickup, how likely would you be to use it?',
          minLabel: 'Not likely',
          maxLabel: 'Very likely',
        },
        {
          id: 'd-records-tier',
          type: 'single',
          label: 'Would you pay a monthly fee for donation records (pounds, estimated value, dates, recipients) ready for your accountant at tax time?',
          options: YES_MAYBE_NO,
        },
        {
          id: 'd-records-price',
          type: 'single',
          label: 'What monthly price for donation records feels fair?',
          options: ['$0–10', '$10–25', '$25–50', '$50+'],
          showIf: { question: 'd-records-tier', anyOf: [YES_MAYBE_NO[0], YES_MAYBE_NO[1]] },
        },
        {
          id: 'd-full-tier',
          type: 'single',
          label: 'Would you pay for FeedForward to supply packaging and handle pickup and transport, plus the records?',
          options: YES_MAYBE_NO,
        },
        {
          id: 'd-full-price',
          type: 'single',
          label: 'What monthly price for full service feels fair?',
          options: ['$25–50', '$50–100', '$100–200', '$200+'],
          showIf: { question: 'd-full-tier', anyOf: [YES_MAYBE_NO[0], YES_MAYBE_NO[1]] },
        },
        {
          id: 'd-dealbreaker',
          type: 'text',
          required: true,
          label: 'What would make FeedForward a definite “no” for you?',
        },
      ],
    },
    {
      title: 'Last questions',
      questions: [
        {
          id: 'd-likely',
          type: 'scale',
          label: 'Overall, how likely are you to try FeedForward if it launched in Bowling Green this year?',
          minLabel: 'Not likely',
          maxLabel: 'Very likely',
        },
        {
          id: 'd-pilot',
          type: 'text',
          maxLength: 300,
          label: 'Want to join a free pilot and help shape the app? Leave your name, restaurant, and phone or email.',
        },
      ],
    },
  ],
};

// ------------------------------------------------------------ Recipient

const ORG_TYPES = [
  'Food pantry',
  'Shelter or soup kitchen',
  'Church or community meal program',
  'School or youth program',
  'Farm (animal feed)',
  'Compost site',
  'Other',
] as const;

// Every organization type except farms and compost sites
const SERVES_PEOPLE = ORG_TYPES.filter((type) => type !== 'Farm (animal feed)' && type !== 'Compost site');

const recipient: Survey = {
  kind: 'recipient',
  title: 'Recipient survey',
  intro:
    'Thanks for checking out FeedForward, a free app that connects Bowling Green restaurants that have surplus food with pantries, meal programs, farms and compost sites that can use it. Recipients will never pay to use it. We’re still building it, and your answers decide what we build. This takes about 5 minutes. Your answers are sent privately to the FeedForward team and aren’t stored on the website.',
  sections: [
    {
      title: 'About your organization',
      questions: [
        {
          id: 'r-org-type',
          type: 'single',
          label: 'What kind of organization are you?',
          options: ORG_TYPES,
        },
        {
          id: 'r-role',
          type: 'single',
          label: 'What is your role?',
          options: ['Director or coordinator', 'Staff', 'Volunteer', 'Owner', 'Other'],
        },
        {
          id: 'r-meals',
          type: 'single',
          label: 'About how many meals or food boxes do you give out in a typical week?',
          options: ['Under 100', '100–500', '500–1,000', 'Over 1,000'],
          showIf: { question: 'r-org-type', anyOf: SERVES_PEOPLE },
        },
        {
          id: 'r-nonprofit',
          type: 'single',
          label: 'Is your organization a registered 501(c)(3) nonprofit?',
          options: ['Yes', 'No', 'In process', 'Not sure'],
          showIf: { question: 'r-org-type', anyOf: SERVES_PEOPLE },
        },
      ],
    },
    {
      title: 'Where your food comes from now',
      questions: [
        {
          id: 'r-sources',
          type: 'multi',
          label: 'Where does your food come from today? (Check all that apply.)',
          options: [
            'Regional food bank (e.g., Feeding America)',
            'Grocery store donations',
            'Restaurant donations',
            'Church or community food drives',
            'We buy it',
            'Other',
          ],
        },
        {
          id: 'r-need',
          type: 'single',
          label: 'How often do you need more food than you have?',
          options: ['Often', 'Sometimes', 'Rarely', 'Never'],
        },
        {
          id: 'r-restaurant-before',
          type: 'single',
          label: 'Have you ever taken donations directly from a restaurant?',
          options: ['Yes, regularly', 'Yes, a few times', 'No, but we would', 'No, and we wouldn’t'],
        },
        {
          id: 'r-restaurant-story',
          type: 'text',
          label: 'If you’ve worked with restaurants before, how did it go?',
        },
      ],
    },
    {
      title: 'What you can accept',
      questions: [
        {
          id: 'r-accept',
          type: 'multi',
          label: 'What kinds of food can you accept? (Check all that apply.)',
          options: [
            'Cooked, held hot',
            'Cooked, chilled',
            'Prepped but uncooked',
            'Raw produce',
            'Bread or baked goods',
            'Packaged or sealed items',
            'Scraps and peels (farms and compost)',
          ],
        },
        {
          id: 'r-storage',
          type: 'multi',
          label: 'What storage do you have? (Check all that apply.)',
          options: ['Refrigerator', 'Freezer', 'Hot-holding', 'Dry storage only', 'None'],
        },
        {
          id: 'r-turn-down',
          type: 'multi',
          max: 3,
          label: 'What would make you turn down a donation? (Check up to 3.)',
          options: [
            'Too little notice',
            'Wrong time of day',
            'Too small to be worth the trip',
            'Too much to store',
            'Unknown handling (how long it sat out)',
            'Missing allergen information',
            'Packaging or containers',
            'Other',
          ],
        },
      ],
    },
    {
      title: 'Pickup',
      questions: [
        {
          id: 'r-can-pickup',
          type: 'single',
          label: 'Can your organization pick up food from restaurants?',
          options: ['Yes, we have a vehicle and people', 'Sometimes', 'No, we’d need it delivered'],
        },
        {
          id: 'r-pickup-times',
          type: 'multi',
          label: 'When could you pick up? (Check all that apply.)',
          options: ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Late night, after 9pm', 'Weekends', 'It varies'],
        },
        {
          id: 'r-notice',
          type: 'single',
          label: 'How much notice do you need before a pickup?',
          options: ['Under 1 hour', '1–3 hours', 'Same day', 'Next day'],
        },
      ],
    },
    {
      title: 'Using FeedForward',
      questions: [
        {
          id: 'r-notify',
          type: 'multi',
          label: 'How would you want to hear about new food? (Check all that apply.)',
          options: ['Text message', 'Email', 'App notification', 'Phone call'],
        },
        {
          id: 'r-who',
          type: 'single',
          label: 'Who would check FeedForward and claim food?',
          options: ['Paid staff', 'Volunteers', 'Me', 'Not sure'],
        },
        {
          id: 'r-site-clarity',
          type: 'scale',
          label: 'From what you’ve seen on this website, how clear is it how FeedForward would work for your organization?',
          minLabel: 'Not clear',
          maxLabel: 'Very clear',
        },
        {
          id: 'r-likely',
          type: 'scale',
          label: 'How likely are you to use FeedForward if it launched in Bowling Green this year?',
          minLabel: 'Not likely',
          maxLabel: 'Very likely',
        },
        {
          id: 'r-dealbreaker',
          type: 'text',
          required: true,
          label: 'What would make FeedForward not work for you?',
        },
      ],
    },
    {
      title: 'Last question',
      questions: [
        {
          id: 'r-pilot',
          type: 'text',
          maxLength: 300,
          label: 'Want to join a free pilot and help shape the app? Leave your name, organization, and phone or email.',
        },
      ],
    },
  ],
};

export const surveys: Record<SurveyKind, Survey> = { donor, recipient };