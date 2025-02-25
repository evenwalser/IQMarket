
import { supabase } from "@/integrations/supabase/client";
import type { ChatAttachment } from "@/types/chat";
import type { Database } from "@/integrations/supabase/types";

type DbChatAttachment = Database['public']['Tables']['chat_attachments']['Row'];

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
    type: att.content_type.startsWith('image/') ? 'image' : 'file'
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
