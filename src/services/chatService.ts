
import { supabase } from "@/integrations/supabase/client";
import { ChatAttachment } from "@/types/chat";

export const uploadFile = async (file: File): Promise<ChatAttachment> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${crypto.randomUUID()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(filePath);

  return {
    url: publicUrl,
    name: file.name,
    type: file.type.startsWith('image/') ? 'image' : 'file'
  };
};

export const sendMessage = async (message: string, threadId: string | null, attachments: ChatAttachment[]) => {
  const { data, error } = await supabase.functions.invoke('chat-with-ai-advisor', {
    body: {
      message,
      threadId,
      attachments
    },
  });

  if (error) throw error;
  return data;
};
