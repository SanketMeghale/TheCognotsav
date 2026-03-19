
export enum EventCategory {
  ALL = 'All',
  TECHNICAL = 'Technical',
  SPORTS = 'Sports',
  GAMING = 'Gaming',
  FUN = 'Fun'
}

export type RegistrationStatus = 'active' | 'deleted' | 'flagged';
export type PaymentStatus = 'pending' | 'verified' | 'rejected';

export interface Participant {
  name: string;
  email: string;
  mobile: string;
}

export interface Registration {
  id: string;
  competition: string;
  teamName: string;
  leaderName: string;
  email: string;
  mobile: string;
  college: string;
  collegeType: string;
  otherCollege?: string;
  members: Participant[];
  teamSize: number;
  submittedAt: { seconds: number; nanoseconds: number } | null;
  
  // Enterprise Moderation
  status: RegistrationStatus;
  flagReason?: string;
  adminNotes?: string;
  isDuplicate?: boolean;
  
  // Payment Workflow
  paymentStatus: PaymentStatus;
  transactionId?: string;
  amountPaid?: number;
  teamId?: string;
  verifiedBy?: string;
}

export interface Competition {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  date: string;
  time: string;
  location: string;
  teamType: 'solo' | 'fixed' | 'flexible';
  minMembers: number;
  maxMembers: number;
  pricing: {
    team?: number;
    person?: number;
    [key: number]: number;
  };
  prize: string;
  registrationFee: string; // Keep for display purposes
  maxSlots?: number;
  category: EventCategory;
  poster: string;
  registrationLink: string;
}

export interface CarouselSlide {
  id: number;
  image: string;
  tagline: string;
  link: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}
