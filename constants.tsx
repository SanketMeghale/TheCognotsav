import { Competition, EventCategory, CarouselSlide, FAQItem } from './types';

export const EVENT_DATE = new Date('2026-04-07T00:00:00');

export const CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    id: 1,
    image: '/images/image1.jpeg',
    tagline: 'Code. Compete. Conquer.',
    link: '#events'
  },
  {
    id: 2,
    image: '/images/image2.jpeg',
    tagline: 'Witness the Elite Esports Clash',
    link: '#events'
  },
  {
    id: 3,
    image: '/images/image3.jpeg',
    tagline: 'Unleash Your Creative Talent',
    link: '#events'
  }
];

export const COMPETITIONS: Competition[] = [
  {
    id: 'tech-kbc',
    name: 'TechKBC',
    description: 'A fun quiz where anyone can jump in, think fast, use lifelines, and compete with friends and climb the leaderboard!',
    date: '07 Apr 2026',
    time: '02:00 PM',
    location: 'CE Department',
    teamType: 'fixed',
    minMembers: 2,
    maxMembers: 2,
    pricing: { team: 100 },
    prize: '\u20B95,000',
    registrationFee: '\u20B9100 per team',
    maxSlots: 60,
    category: EventCategory.TECHNICAL,
    poster: '/images/techkbc.jpg',
    registrationLink: '#'
  },
  {
    id: 'bgmi-esports',
    name: 'Ranbhoomi (BGMI)',
    description: 'Tactical Battle Royale tournament. Prove your survival instincts and claim the chicken dinner in Battlegrounds Mobile India.',
    date: '07 Apr 2026',
    time: '10:30 AM',
    location: 'Seminar Hall',
    teamType: 'fixed',
    minMembers: 4,
    maxMembers: 4,
    pricing: { team: 250 },
    prize: '\u20B95,000',
    registrationFee: '\u20B9250 per squad',
    maxSlots: 25,
    category: EventCategory.GAMING,
    poster: '/images/bgmi.jpg',
    registrationLink: '#'
  },
  {
    id: 'ff-esports',
    name: 'Ranbhoomi (FREEFIRE)',
    description: 'Fast-paced mobile survival shooter competition. Compete for the ultimate Booyah in Garena Free Fire.',
    date: '07 Apr 2026',
    time: '10:30 AM',
    location: 'Seminar Hall',
    teamType: 'fixed',
    minMembers: 4,
    maxMembers: 4,
    pricing: { team: 250 },
    prize: '\u20B95,000',
    registrationFee: '\u20B9250 per squad',
    maxSlots: 25,
    category: EventCategory.GAMING,
    poster: '/images/freefire.jpg',
    registrationLink: '#'
  },
  {
    id: 'squid-game',
    name: 'Squid Game',
    description: 'A series of thrilling and challenging games inspired by the global phenomenon. Survival of the fittest!',
    date: '08 Apr 2026',
    time: '09:00 AM',
    location: 'NASA Point',
    teamType: 'solo',
    minMembers: 1,
    maxMembers: 1,
    pricing: { person: 50 },
    prize: '\u20B95,000',
    registrationFee: '\u20B950 per person',
    maxSlots: 150,
    category: EventCategory.FUN,
    poster: '/images/squidgame.jpg',
    registrationLink: '#'
  },
  {
    id: 'rang-manch',
    name: 'Rangmanch',
    description: 'Express yourself through drama, acting, and stage performances. Show your theatrical skills to the world.',
    date: '08 Apr 2026',
    time: '01:00 PM',
    location: 'Seminar Hall',
    teamType: 'flexible',
    minMembers: 1,
    maxMembers: 5,
    pricing: {
      1: 50,
      2: 100,
      3: 150,
      4: 200,
      5: 200
    },
    prize: '\u20B95,000',
    registrationFee: '\u20B950 - \u20B9200',
    maxSlots: 35,
    category: EventCategory.FUN,
    poster: '/images/rangmanch.jpg',
    registrationLink: '#'
  },
  {
    id: 'googler-hunt',
    name: 'Tech Treasure Hunt',
    description: 'Solve complex technical puzzles and sequential clues using your research and problem-solving skills.',
    date: '07 Apr 2026',
    time: '10:30 AM',
    location: 'CE Department',
    teamType: 'fixed',
    minMembers: 4,
    maxMembers: 4,
    pricing: { team: 200 },
    prize: '\u20B95,000',
    registrationFee: '\u20B9200 per squad',
    maxSlots: 30,
    category: EventCategory.TECHNICAL,
    poster: '/images/techtreasurehunt.jpg',
    registrationLink: '#'
  },
  {
    id: 'techxcelerate',
    name: 'TECHXCELERATE (Project Expo)',
    description: 'Demonstrate your innovative engineering projects. A dedicated showcase for hardware and software prototypes.',
    date: '08 Apr 2026',
    time: '12:00 PM',
    location: 'CE Department',
    teamType: 'flexible',
    minMembers: 1,
    maxMembers: 4,
    pricing: { team: 200 },
    prize: '\u20B95,000',
    registrationFee: '\u20B9200 per team',
    maxSlots: 40,
    category: EventCategory.TECHNICAL,
    poster: '/images/projectexpo.jpg',
    registrationLink: '#'
  },
  {
    id: 'utopia',
    name: 'UTOPIA',
    description: 'A 5-hour coding challenge. Stop dreaming and start building. Your concept-to-code sprint begins here.',
    date: '07 Apr 2026',
    time: '10:30 AM',
    location: 'CE Department',
    teamType: 'flexible',
    minMembers: 1,
    maxMembers: 5,
    pricing: { team: 250 },
    prize: '\u20B95,000',
    registrationFee: '\u20B9250 per registration',
    maxSlots: 80,
    category: EventCategory.TECHNICAL,
    poster: '/images/hackathon.jpg',
    registrationLink: '#'
  }
];

export const FAQS: FAQItem[] = [
  {
    question: 'How can I register for multiple events?',
    answer: "You can register for each event individually by clicking the 'Register' button on the competition card. Ensure your event timings do not overlap."
  },
  {
    question: 'Is there a registration fee?',
    answer: 'Registration fees vary by event (starting from \u20B950). You can see the specific fee on each competition card.'
  },
  {
    question: 'Can outsiders participate?',
    answer: 'Yes, CEAS COGNOTSAV is open to students from all recognized universities and colleges.'
  },
  {
    question: 'Will certificates be provided?',
    answer: 'Yes, all participants will receive e-certificates of participation, and winners will receive merit certificates along with cash prizes.'
  }
];

export const ANNOUNCEMENTS = [
  'Registrations for TechKBC are now LIVE!',
  'Esports slots for Ranbhoomi are filling up fast.',
  'Cash prizes up to \u20B95,000 available across events!',
  'Showcase your innovation at TECHXCELERATE 2026.',
  'Join the 5-hour UTOPIA challenge!'
];

export const UPI_MAPPING: Record<string, { id: string; payee: string }> = {
  'tech-kbc': { id: 'sahilbhatti292005@okaxis', payee: 'Sahil Bhatti' },
  utopia: { id: '9850560091@ibl', payee: 'TRUPTI SANJAY JADHAV' },
  'googler-hunt': { id: 'siddhideshpande11@okhdfcbank', payee: 'Siddhi Deshpande' },
  'bgmi-esports': { id: 'kawadeakshay23@okaxis', payee: 'Akshay Kawade' },
  'ff-esports': { id: 'kawadeakshay23@okaxis', payee: 'Akshay Kawade' },
  techxcelerate: { id: 'kawadeakshay23@okaxis', payee: 'Akshay Kawade' },
  'rang-manch': { id: 'chaitanyamagar418@okhdfcbank', payee: 'Chaitanya Magar' },
  'squid-game': { id: 'siddhideshpande11@okhdfcbank', payee: 'Siddhi Deshpande' },
};
