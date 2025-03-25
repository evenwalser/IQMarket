import { supabase } from '@/lib/supabase';
import { 
  Professional, 
  Booking, 
  RagAgent, 
  ProfessionalFilter, 
  RagAgentFilter, 
  BookingStatus,
  UserProfile,
  Category,
  ProfessionalReview,
  AgentReview,
  AgentPurchase,
  AvailabilitySlot,
  BlockedSlot,
  TimeSlot,
  DateRange
} from '@/types/marketplace';
import { addDays, eachDayOfInterval, format, parseISO, set } from 'date-fns';

// User Profile Services
export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
  
  return data as UserProfile;
}

export async function createOrUpdateUserProfile(profile: Partial<UserProfile> & { id: string }) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(profile)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
  
  return data as UserProfile;
}

// Professional services
export async function fetchProfessionals(filters?: ProfessionalFilter) {
  let query = supabase
    .from('professionals')
    .select(`
      *,
      user_profile:user_id(id, display_name, profile_image_url),
      categories:professional_categories(
        category:category_id(*)
      )
    `);
  
  if (filters) {
    if (filters.expertise && filters.expertise.length > 0) {
      query = query.overlaps('expertise', filters.expertise);
    }
    
    if (filters.minHourlyRate !== undefined) {
      query = query.gte('hourly_rate', filters.minHourlyRate);
    }
    
    if (filters.maxHourlyRate !== undefined) {
      query = query.lte('hourly_rate', filters.maxHourlyRate);
    }
    
    if (filters.categoryId) {
      query = query.in('id', supabase
        .from('professional_categories')
        .select('professional_id')
        .eq('category_id', filters.categoryId)
      );
    }
    
    if (filters.verified !== undefined) {
      query = query.eq('verified', filters.verified);
    }
    
    if (filters.minRating !== undefined) {
      query = query.gte('avg_rating', filters.minRating);
    }
    
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,bio.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
    }
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching professionals:', error);
    throw error;
  }
  
  // Transform the nested category data
  const professionals = data.map(pro => {
    if (pro.categories) {
      pro.categories = pro.categories.map((cat: any) => cat.category);
    }
    return pro;
  });
  
  return professionals as Professional[];
}

export async function fetchProfessionalById(id: string) {
  const { data, error } = await supabase
    .from('professionals')
    .select(`
      *,
      user_profile:user_id(id, display_name, profile_image_url),
      categories:professional_categories(
        category:category_id(*)
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching professional:', error);
    throw error;
  }
  
  // Transform the nested category data
  if (data.categories) {
    data.categories = data.categories.map((cat: any) => cat.category);
  }
  
  return data as Professional;
}

export async function createProfessional(professional: Omit<Professional, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('professionals')
    .insert(professional)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating professional:', error);
    throw error;
  }
  
  return data as Professional;
}

export async function updateProfessional(id: string, professional: Partial<Professional>) {
  const { data, error } = await supabase
    .from('professionals')
    .update(professional)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating professional:', error);
    throw error;
  }
  
  return data as Professional;
}

// Booking services
export async function fetchUserBookings(userId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      professional:professional_id(*),
      user:user_id(*)
    `)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching user bookings:', error);
    throw error;
  }
  
  return data as Booking[];
}

export async function fetchProfessionalBookings(professionalId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      user:user_id(*)
    `)
    .eq('professional_id', professionalId);
  
  if (error) {
    console.error('Error fetching professional bookings:', error);
    throw error;
  }
  
  return data as Booking[];
}

export async function createBooking(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
  
  // Increment the booking count for the professional
  await supabase.rpc('increment_professional_booking_count', {
    p_id: booking.professional_id
  }).catch(err => {
    console.error('Error incrementing booking count:', err);
  });
  
  return data as Booking;
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
  
  return data as Booking;
}

// RAG Agent services
export async function fetchRagAgents(filters?: RagAgentFilter) {
  let query = supabase
    .from('rag_agents')
    .select(`
      *,
      creator:creator_id(id, display_name, profile_image_url),
      categories:agent_categories(
        category:category_id(*)
      )
    `);
  
  if (filters) {
    if (filters.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic);
    }
    
    if (filters.creatorId) {
      query = query.eq('creator_id', filters.creatorId);
    }
    
    if (filters.categoryId) {
      query = query.in('id', supabase
        .from('agent_categories')
        .select('agent_id')
        .eq('category_id', filters.categoryId)
      );
    }
    
    if (filters.minRating !== undefined) {
      query = query.gte('avg_rating', filters.minRating);
    }
    
    if (filters.isPaid !== undefined) {
      if (filters.isPaid) {
        query = query.gt('price', 0);
      } else {
        query = query.or('price.is.null,price.eq.0');
      }
    }
    
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching RAG agents:', error);
    throw error;
  }
  
  // Transform the nested category data
  const agents = data.map(agent => {
    if (agent.categories) {
      agent.categories = agent.categories.map((cat: any) => cat.category);
    }
    return agent;
  });
  
  return agents as RagAgent[];
}

export async function fetchRagAgentById(id: string) {
  const { data, error } = await supabase
    .from('rag_agents')
    .select(`
      *,
      creator:creator_id(id, display_name, profile_image_url),
      categories:agent_categories(
        category:category_id(*)
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching RAG agent:', error);
    throw error;
  }
  
  // Transform the nested category data
  if (data.categories) {
    data.categories = data.categories.map((cat: any) => cat.category);
  }
  
  return data as RagAgent;
}

export async function createRagAgent(agent: Omit<RagAgent, 'id' | 'created_at' | 'updated_at' | 'creator'>) {
  const { data, error } = await supabase
    .from('rag_agents')
    .insert(agent)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating RAG agent:', error);
    throw error;
  }
  
  return data as RagAgent;
}

export async function updateRagAgent(id: string, agent: Partial<Omit<RagAgent, 'creator'>>) {
  const { data, error } = await supabase
    .from('rag_agents')
    .update(agent)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating RAG agent:', error);
    throw error;
  }
  
  return data as RagAgent;
}

// Category services
export async function fetchCategories(parentId?: string) {
  let query = supabase
    .from('categories')
    .select('*');
  
  if (parentId) {
    query = query.eq('parent_id', parentId);
  } else {
    query = query.is('parent_id', null);
  }
  
  query = query.order('sort_order', { ascending: true });
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
  
  return data as Category[];
}

export async function fetchCategoryById(id: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching category:', error);
    throw error;
  }
  
  return data as Category;
}

export async function fetchCategoryWithSubcategories(id: string) {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      *,
      subcategories:categories(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching category with subcategories:', error);
    throw error;
  }
  
  return data as Category;
}

// Review services
export async function fetchProfessionalReviews(professionalId: string) {
  const { data, error } = await supabase
    .from('professional_reviews')
    .select(`
      *,
      reviewer:reviewer_id(id, display_name, profile_image_url)
    `)
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching professional reviews:', error);
    throw error;
  }
  
  return data as ProfessionalReview[];
}

export async function createProfessionalReview(review: Omit<ProfessionalReview, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('professional_reviews')
    .insert(review)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating professional review:', error);
    throw error;
  }
  
  // Update the professional's average rating
  await supabase.rpc('update_professional_ratings', {
    p_id: review.professional_id
  }).catch(err => {
    console.error('Error updating professional ratings:', err);
  });
  
  return data as ProfessionalReview;
}

export async function fetchAgentReviews(agentId: string) {
  const { data, error } = await supabase
    .from('agent_reviews')
    .select(`
      *,
      reviewer:reviewer_id(id, display_name, profile_image_url)
    `)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching agent reviews:', error);
    throw error;
  }
  
  return data as AgentReview[];
}

export async function createAgentReview(review: Omit<AgentReview, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('agent_reviews')
    .insert(review)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating agent review:', error);
    throw error;
  }
  
  // Update the agent's average rating
  await supabase.rpc('update_agent_ratings', {
    a_id: review.agent_id
  }).catch(err => {
    console.error('Error updating agent ratings:', err);
  });
  
  return data as AgentReview;
}

// Agent purchase services
export async function fetchUserAgentPurchases(userId: string) {
  const { data, error } = await supabase
    .from('agent_purchases')
    .select(`
      *,
      agent:agent_id(*)
    `)
    .eq('purchaser_id', userId);
  
  if (error) {
    console.error('Error fetching user agent purchases:', error);
    throw error;
  }
  
  return data as AgentPurchase[];
}

export async function purchaseAgent(purchase: Omit<AgentPurchase, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('agent_purchases')
    .insert(purchase)
    .select()
    .single();
  
  if (error) {
    console.error('Error purchasing agent:', error);
    throw error;
  }
  
  // Increment the purchase count for the agent
  await supabase.rpc('increment_agent_purchase_count', {
    a_id: purchase.agent_id
  }).catch(err => {
    console.error('Error incrementing purchase count:', err);
  });
  
  return data as AgentPurchase;
}

export async function checkAgentAccess(userId: string, agentId: string) {
  // Check if the user is the creator of the agent
  const { data: creatorData } = await supabase
    .from('rag_agents')
    .select('creator_id')
    .eq('id', agentId)
    .single();
  
  if (creatorData && creatorData.creator_id === userId) {
    return true;
  }
  
  // Check if the agent is free
  const { data: freeData } = await supabase
    .from('rag_agents')
    .select('price')
    .eq('id', agentId)
    .is('price', null)
    .single();
  
  if (freeData) {
    return true;
  }
  
  // Check if the user has purchased the agent
  const { data: purchaseData, error } = await supabase
    .from('agent_purchases')
    .select('id')
    .eq('agent_id', agentId)
    .eq('purchaser_id', userId)
    .eq('payment_status', 'completed')
    .maybeSingle();
  
  if (error) {
    console.error('Error checking agent access:', error);
    throw error;
  }
  
  return !!purchaseData;
}

// Availability services
export async function fetchProfessionalAvailability(professionalId: string) {
  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('professional_id', professionalId);
  
  if (error) {
    console.error('Error fetching professional availability:', error);
    throw error;
  }
  
  return data as AvailabilitySlot[];
}

export async function createAvailabilitySlot(slot: Omit<AvailabilitySlot, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('availability_slots')
    .insert(slot)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating availability slot:', error);
    throw error;
  }
  
  return data as AvailabilitySlot;
}

export async function deleteAvailabilitySlot(id: string) {
  const { error } = await supabase
    .from('availability_slots')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting availability slot:', error);
    throw error;
  }
}

export async function fetchBlockedSlots(professionalId: string) {
  const { data, error } = await supabase
    .from('blocked_slots')
    .select('*')
    .eq('professional_id', professionalId);
  
  if (error) {
    console.error('Error fetching blocked slots:', error);
    throw error;
  }
  
  return data as BlockedSlot[];
}

export async function createBlockedSlot(slot: Omit<BlockedSlot, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('blocked_slots')
    .insert(slot)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating blocked slot:', error);
    throw error;
  }
  
  return data as BlockedSlot;
}

export async function deleteBlockedSlot(id: string) {
  const { error } = await supabase
    .from('blocked_slots')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting blocked slot:', error);
    throw error;
  }
}

// Helper functions
export async function getAvailableTimeslots(professionalId: string, dateRange: DateRange): Promise<TimeSlot[]> {
  // Get the professional's availability schedule
  const availabilitySlots = await fetchProfessionalAvailability(professionalId);
  
  // Get the professional's blocked slots
  const blockedSlots = await fetchBlockedSlots(professionalId);
  
  // Get existing bookings
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('professional_id', professionalId)
    .gte('start_time', dateRange.startDate.toISOString())
    .lte('end_time', dateRange.endDate.toISOString())
    .not('status', 'eq', 'cancelled');
  
  if (error) {
    console.error('Error fetching bookings for timeslots:', error);
    throw error;
  }
  
  // Generate timeslots for each day in the date range
  const days = eachDayOfInterval({
    start: dateRange.startDate,
    end: dateRange.endDate
  });
  
  let availableSlots: TimeSlot[] = [];
  
  days.forEach(day => {
    const dayOfWeek = day.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Find availability slots for this day
    const daySlots = availabilitySlots.filter(slot => 
      (slot.is_recurring && slot.day_of_week === dayOfWeek) || 
      (!slot.is_recurring && slot.specific_date === format(day, 'yyyy-MM-dd'))
    );
    
    // If no slots available on this day, skip
    if (daySlots.length === 0) return;
    
    // Generate time slots
    daySlots.forEach(slot => {
      const [startHour, startMinute] = slot.start_time.split(':').map(Number);
      const [endHour, endMinute] = slot.end_time.split(':').map(Number);
      
      const slotStart = set(day, { hours: startHour, minutes: startMinute, seconds: 0, milliseconds: 0 });
      const slotEnd = set(day, { hours: endHour, minutes: endMinute, seconds: 0, milliseconds: 0 });
      
      // Skip past time slots
      if (slotEnd < new Date()) return;
      
      // Check if slot is blocked
      const isBlocked = blockedSlots.some(blockedSlot => {
        const blockedStart = new Date(blockedSlot.start_time);
        const blockedEnd = new Date(blockedSlot.end_time);
        return (
          (slotStart >= blockedStart && slotStart < blockedEnd) ||
          (slotEnd > blockedStart && slotEnd <= blockedEnd) ||
          (slotStart <= blockedStart && slotEnd >= blockedEnd)
        );
      });
      
      if (isBlocked) return;
      
      // Check if slot is booked
      const isBooked = bookings.some(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (isBooked) return;
      
      // Add available slot
      availableSlots.push({
        start: slotStart,
        end: slotEnd,
        isAvailable: true
      });
    });
  });
  
  return availableSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
} 