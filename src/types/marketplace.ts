export interface UserProfile {
  id: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  timezone: string;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface Professional {
  id: string;
  user_id: string;
  name: string;
  title: string;
  bio?: string;
  expertise: string[];
  hourly_rate?: number;
  availability_schedule?: Record<string, any>;
  profile_image_url?: string;
  linkedin_url?: string;
  avg_rating?: number;
  review_count?: number;
  booking_count?: number;
  verified?: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data (not in the actual table)
  user_profile?: UserProfile;
  categories?: Category[];
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Booking {
  id: string;
  professional_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  conversation_id?: string;
  payment_id?: string;
  payment_status?: PaymentStatus;
  created_at: string;
  updated_at: string;
  
  // Joined data (not in the actual table)
  professional?: Professional;
  user_profile?: UserProfile;
}

export interface RagAgent {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  price?: number;
  configuration: Record<string, any>;
  documents?: string[];
  version?: string;
  avg_rating?: number;
  review_count?: number;
  purchase_count?: number;
  created_at: string;
  updated_at: string;
  
  // Joined data (not in the actual table)
  creator?: UserProfile;
  categories?: Category[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  parent_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  
  // Joined data
  subcategories?: Category[];
  parent?: Category;
}

export interface ProfessionalReview {
  id: string;
  professional_id: string;
  reviewer_id: string;
  booking_id?: string;
  rating: number;
  review_text?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data
  reviewer?: UserProfile;
}

export interface AgentReview {
  id: string;
  agent_id: string;
  reviewer_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  reviewer?: UserProfile;
}

export interface AgentPurchase {
  id: string;
  agent_id: string;
  purchaser_id: string;
  payment_id?: string;
  amount: number;
  payment_status: PaymentStatus;
  created_at: string;
  
  // Joined data
  agent?: RagAgent;
  purchaser?: UserProfile;
}

export interface AvailabilitySlot {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date?: string;
  created_at: string;
  updated_at: string;
}

export interface BlockedSlot {
  id: string;
  professional_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

// Relationship tables types
export interface ProfessionalCategory {
  professional_id: string;
  category_id: string;
}

export interface AgentCategory {
  agent_id: string;
  category_id: string;
}

// Filter types
export interface ProfessionalFilter {
  expertise?: string[];
  minHourlyRate?: number;
  maxHourlyRate?: number;
  search?: string;
  categoryId?: string;
  verified?: boolean;
  minRating?: number;
}

export interface RagAgentFilter {
  isPublic?: boolean;
  creatorId?: string;
  search?: string;
  isPaid?: boolean;
  categoryId?: string;
  minRating?: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
}

export interface AvailabilityCalendar {
  slots: TimeSlot[];
  date: Date;
  professional: Professional;
} 