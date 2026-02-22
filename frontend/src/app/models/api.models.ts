export type UserRole = 'USER' | 'MANAGER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface AuthResponse {
  token: string;
  userId: number;
  fullName: string;
  role: UserRole;
}

export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface UserProfile {
  id: number;
  email: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  token: string;
  avatar?: string;
}

export interface UserSummary {
  id: number;
  email?: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
}

export interface Turf {
  id: number;
  name: string;
  city?: string;
  state?: string;
  pincode?: string;
  sports: string[];
  amenities: string[];
  managers: { id: number; fullName: string }[];
  imageUrls: string[];
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  createdAt: string;
  openTime?: string;
  closeTime?: string;
  hourlyPrice?: number;
  customPricing?: Record<string, number>;
}

export interface TurfSearchRequest {
  city?: string;
  pincode?: string;
  sport?: string;
  amenity?: string;
  page?: number;
  size?: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface Slot {
  id: number;
  turf?: Turf;
  sport?: string;
  amenity?: string;
  startAt: string;
  endAt: string;
  price: number;
  status: 'FREE' | 'HOLD' | 'BOOKED';
}

export interface Booking {
  id: number;
  turf: Turf;
  slot: Slot;
  startAt?: string;
  endAt?: string;
  slotCount?: number;
  slotIds?: number[];
  canExtend?: boolean;
  status: 'HOLD' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED' | 'FAILED';
  priceCents: number;
  paymentStatus: 'NONE' | 'INITIATED' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIAL_REFUND';
  refundable: boolean;
  refundedAmountCents?: number;
  createdAt: string;
  role?: 'OWNER' | 'GUEST';
}

export interface BookingSummary {
  id: number;
  sport?: string;
  amenity?: string;
  startAt: string;
  endAt: string;
  user: {
    id: number;
    fullName: string;
    email?: string;
    phone?: string;
  };
}

export interface BookingTransaction {
  id: number;
  bookingId: number;
  type: 'BOOKED' | 'CANCELLED' | 'INVITE_SENT' | 'INVITE_ACCEPTED';
  message?: string;
  createdAt: string;
  actor: {
    id: number;
    fullName: string;
    email?: string;
    phone?: string;
  };
}

export interface Notification {
  id: number;
  type: 'BOOKING' | 'CHANGE' | 'INVITE' | 'REFUND' | 'PAYOUT' | 'SUPPORT';
  message: string;
  createdAt: string;
  read: boolean;
}

export interface SupportTicket {
  id: number;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  adminResponse?: string;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    email?: string;
    phone?: string;
  };
}

export interface Review {
  id: number;
  turfId: number;
  userId: number;
  rating: number;
  body: string;
  status: 'PENDING' | 'PUBLISHED' | 'HIDDEN';
  createdAt?: string;
  images?: string[];
  user?: {
    id: number;
    fullName: string;
    email?: string;
    phone?: string;
  };
}

export interface BookingInvite {
  id: number;
  bookingId: number;
  contact: string;
  contactType: 'EMAIL' | 'PHONE';
  status: 'SENT' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  createdAt: string;
}

export interface BookingExtensionRequest {
  id: number;
  bookingId: number;
  turfId: number;
  turfName?: string;
  startAt?: string;
  endAt?: string;
  minutes: number;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  createdAt: string;
  requestedBy?: {
    id: number;
    fullName?: string;
    email?: string;
    phone?: string;
  };
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  sport?: string;
  validUntil: string;
  discountPercent: number;
}

export interface MaintenanceBlock {
  id: number;
  turfId: number;
  reason: string;
  startAt: string;
  endAt: string;
  createdAt?: string;
}

export interface Invite {
  id: string;
  turfId: number;
  slotId: number;
  sentTo: string;
  status: 'SENT' | 'ACCEPTED' | 'DECLINED';
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target?: string;
  createdAt: string;
}

export type PaymentMethod = 'CARD' | 'UPI';

export interface PaymentChoice {
  method: PaymentMethod;
  cardNumber?: string;
  cardName?: string;
  upiHandle?: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
  helper?: string;
}
