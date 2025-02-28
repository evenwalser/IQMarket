
import { supabase } from "@/integrations/supabase/client";
import type { ChatAttachment } from "@/types/chat";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type DbChatAttachment = Database['public']['Tables']['chat_attachments']['Row'];

// Check if the OpenAI API key is set
export const checkOpenAIKey = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-openai-key', {
      body: {},
    });

    if (error) {
      console.error('Error checking OpenAI key:', error);
      return false;
    }

    return data?.isValid || false;
  } catch (error) {
    console.error('Error checking OpenAI key:', error);
    return false;
  }
};

// Set a new OpenAI API key
export const setOpenAIKey = async (apiKey: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('set-openai-key', {
      body: { apiKey },
    });

    if (error) {
      console.error('Error setting OpenAI key:', error);
      toast.error('Failed to save OpenAI API key');
      return false;
    }

    toast.success('OpenAI API key saved successfully');
    return true;
  } catch (error) {
    console.error('Error setting OpenAI key:', error);
    toast.error('Failed to save OpenAI API key');
    return false;
  }
};

export const sendMessage = async (message: string, threadId: string | null, attachments: File[]) => {
  // Get the uploaded attachments from the database
  const { data: uploadedAttachments, error: fetchError } = await supabase
    .from('chat_attachments')
    .select('*')
    .in('file_path', attachments.map(file => `${file.name}`));

  if (fetchError) {
    console.error('Error fetching attachments:', fetchError);
    throw fetchError;
  }

  const formattedAttachments = uploadedAttachments?.map((att: DbChatAttachment) => ({
    url: supabase.storage.from('chat-attachments').getPublicUrl(att.file_path).data.publicUrl,
    name: att.file_name,
    type: att.content_type.startsWith('image/') ? 'image' : 'file',
    file_path: att.file_path,
    content_type: att.content_type
  })) || [];

  const { data, error } = await supabase.functions.invoke('chat-with-ai-advisor', {
    body: {
      message,
      threadId,
      attachments: formattedAttachments
    },
  });

  if (error) throw error;
  return data;
};
