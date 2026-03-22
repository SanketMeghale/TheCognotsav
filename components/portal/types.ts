export type CoordinatorContact = {
  name: string;
  phone: string;
};

export type EventRecord = {
  id: number;
  slug: string;
  name: string;
  category: string;
  date_label: string;
  time_label: string;
  venue: string;
  description: string;
  prize: string;
  registration_fee: number;
  registration_fee_label: string;
  min_members: number;
  max_members: number;
  max_slots: number | null;
  is_team_event: boolean;
  poster_path: string;
  intro_video_url?: string | null;
  payment_upi: string | null;
  payment_payee: string | null;
  coordinators: CoordinatorContact[];
  registrations_count: number;
  waitlist_count: number;
};

export type TimelineEntry = {
  id: string;
  label: string;
  description: string;
  at: string | null;
  state: 'done' | 'current' | 'pending' | 'attention';
};

export type LookupResult = {
  id: string;
  registration_code: string;
  team_name: string;
  contact_name: string;
  contact_email: string;
  status: string;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  review_note: string | null;
  attendance_status: string;
  attendance_marked_at: string | null;
  total_amount: number;
  event_name: string;
  event_slug: string;
  date_label: string;
  time_label: string;
  venue: string;
  qr_value: string;
  waitlist_position: number | null;
  timeline: TimelineEntry[];
};

export type PortalAlert = {
  id: string;
  kind: 'event-starting-soon' | 'registration-closing-soon';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  event_slug: string;
  event_name: string;
  starts_at: string;
  minutes_until_start: number | null;
  remaining_slots: number | null;
  cta_label: string;
  cta_href: string;
};

export type PortalAnnouncement = {
  id: string;
  title: string;
  message: string;
  event_slug: string | null;
  event_name: string | null;
  is_pinned: boolean;
  created_by: string | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type AdminNotificationSummary = {
  channel: string | null;
  recipient: string | null;
  related_status: string | null;
  delivery_status: string | null;
  provider_message_id?: string | null;
  error_message: string | null;
  created_at: string | null;
};

export type AdminAccessScope = {
  mode: 'global' | 'event';
  event_slug: string | null;
  event_name: string | null;
  can_export: boolean;
  can_manage_backups: boolean;
  can_manage_broadcasts: boolean;
  can_manage_announcements: boolean;
};

export type AdminRegistration = {
  id: string;
  registration_code: string;
  team_name: string;
  college_name: string;
  department_name: string;
  year_of_study: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  payment_reference: string | null;
  payment_method?: string | null;
  payment_screenshot_path?: string | null;
  payment_provider_order_id?: string | null;
  payment_provider_payment_id?: string | null;
  total_amount: number;
  status: string;
  notes?: string | null;
  review_note: string | null;
  attendance_status: string;
  attendance_marked_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at?: string;
  event_name: string;
  event_slug: string;
  date_label: string;
  time_label: string;
  venue: string;
  max_slots: number | null;
  waitlist_position: number | null;
  duplicate_email_count: number;
  duplicate_phone_count: number;
  duplicate_payment_count: number;
  qr_value: string;
  latest_notification?: AdminNotificationSummary | null;
  participants: {
    fullName: string;
    email: string;
    phone: string;
    isLead: boolean;
  }[];
};

export type ParticipantDraft = {
  fullName: string;
  email: string;
  phone: string;
};

export type RegistrationReceipt = {
  registrationCode: string;
  eventName: string;
  teamName: string;
  contactName: string;
  contactEmail: string;
  paymentReference: string;
  totalAmount: number;
  submittedAt: string;
  venue: string;
  dateLabel: string;
  timeLabel: string;
  status: string;
  waitlistPosition: number | null;
  qrValue: string;
};

export type BackupSnapshot = {
  file_name: string;
  created_at: string;
  size_bytes: number;
  trigger: 'auto' | 'manual';
};
