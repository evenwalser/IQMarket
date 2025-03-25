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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
  
  // Joined data (not in the actual table)
  creator?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export interface AvailabilitySlot {
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface ProfessionalFilter {
  expertise?: string[];
  minHourlyRate?: number;
  maxHourlyRate?: number;
  search?: string;
}

export interface RagAgentFilter {
  isPublic?: boolean;
  creatorId?: string;
  search?: string;
  isPaid?: boolean;
} 