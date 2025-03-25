import { supabase } from '@/lib/supabase';
import { 
  Professional, 
  Booking, 
  RagAgent, 
  ProfessionalFilter, 
  RagAgentFilter, 
  BookingStatus 
} from '@/types/marketplace';

// Professional services
export async function fetchProfessionals(filters?: ProfessionalFilter) {
  let query = supabase
    .from('professionals')
    .select('*');
  
  if (filters) {
    if (filters.expertise && filters.expertise.length > 0) {
      // Use overlap operator for array contains
      query = query.overlaps('expertise', filters.expertise);
    }
    
    if (filters.minHourlyRate !== undefined) {
      query = query.gte('hourly_rate', filters.minHourlyRate);
    }
    
    if (filters.maxHourlyRate !== undefined) {
      query = query.lte('hourly_rate', filters.maxHourlyRate);
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
  
  return data as Professional[];
}

export async function fetchProfessionalById(id: string) {
  const { data, error } = await supabase
    .from('professionals')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching professional:', error);
    throw error;
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
      professionals (*)
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
    .select('*')
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
      creator:creator_id (id, email)
    `);
  
  if (filters) {
    if (filters.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic);
    }
    
    if (filters.creatorId) {
      query = query.eq('creator_id', filters.creatorId);
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
  
  return data as RagAgent[];
}

export async function fetchRagAgentById(id: string) {
  const { data, error } = await supabase
    .from('rag_agents')
    .select(`
      *,
      creator:creator_id (id, email)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching RAG agent:', error);
    throw error;
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