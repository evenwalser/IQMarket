
import { supabase } from "@/integrations/supabase/client";
import type { ChatAttachment } from "@/types/chat";
import type { Database } from "@/integrations/supabase/types";

type DbChatAttachment = Database['public']['Tables']['chat_attachments']['Row'];

export const sendMessage = async (message: string, threadId: string | null, attachments: File[]) => {
  try {
    if (attachments.length > 0) {
      console.log('Processing attachments:', attachments.map(a => ({ name: a.name, type: a.type, size: a.size })));
      
      // First get the file records directly by their size and name
      const { data: uploadedAttachments, error: fetchError } = await supabase
        .from('chat_attachments')
        .select('*')
        .in('file_name', attachments.map(file => file.name))
        .in('size', attachments.map(file => file.size));

      if (fetchError) {
        console.error('Error fetching attachments:', fetchError);
        throw fetchError;
      }

      console.log('Found uploaded attachments:', uploadedAttachments);

      if (!uploadedAttachments || uploadedAttachments.length === 0) {
        console.error('No matching attachments found for:', attachments.map(a => `${a.name} (${a.size} bytes)`));
        throw new Error('No matching attachments found in database. Please try uploading the file again.');
      }

      const formattedAttachments = uploadedAttachments.map((att: DbChatAttachment) => {
        const publicUrl = supabase.storage.from('chat-attachments').getPublicUrl(att.file_path).data.publicUrl;
        console.log(`Formatted attachment ${att.file_name}:`, { 
          url: publicUrl, 
          type: att.content_type,
          path: att.file_path,
          size: att.size
        });
        return {
          url: publicUrl,
          file_name: att.file_name,
          content_type: att.content_type,
          file_path: att.file_path
        };
      });

      console.log('Sending message with attachments:', {
        message,
        threadId,
        attachmentsCount: formattedAttachments.length,
        attachments: formattedAttachments
      });

      const { data, error } = await supabase.functions.invoke('chat-with-assistant', {
        body: {
          message,
          threadId,
          assistantType: 'benchmarks',
          attachments: formattedAttachments
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data;
    } else {
      console.log('Sending message without attachments');
      const { data, error } = await supabase.functions.invoke('chat-with-assistant', {
        body: {
          message,
          threadId,
          assistantType: 'benchmarks',
          attachments: []
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data;
    }
  } catch (err) {
    console.error('Error in sendMessage:', err);
    throw err;
  }
};
