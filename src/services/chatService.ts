
import { supabase } from "@/integrations/supabase/client";
import { ChatAttachment } from "@/types/chat";
import type { Database } from "@/integrations/supabase/types";

type DbChatAttachment = Database['public']['Tables']['chat_attachments']['Row'];

export const sendMessage = async (message: string, threadId: string | null, attachments: File[]) => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to send messages');
    }

    // Process attachments if present
    let formattedAttachments: ChatAttachment[] = [];
    
    if (attachments.length > 0) {
      console.log('Processing attachments:', attachments.map(a => ({ name: a.name, type: a.type, size: a.size })));
      
      // For each file in the attachments array, upload it to Supabase storage
      for (const file of attachments) {
        const fileName = `${crypto.randomUUID()}-${file.name}`;
        const filePath = `${user.id}/${fileName}`;
        
        // Upload the file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);
          
        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
        
        console.log('File uploaded successfully:', uploadData);
        
        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);
          
        console.log('Generated public URL:', publicUrl);
        
        // Store record in the chat_attachments table
        const { data: attachmentRecord, error: attachmentError } = await supabase
          .from('chat_attachments')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            content_type: file.type,
            size: file.size
          })
          .select('*')
          .single();
          
        if (attachmentError) {
          console.error('Error storing attachment record:', attachmentError);
          throw new Error(`Failed to store attachment record for ${file.name}`);
        }
        
        console.log('Attachment record stored:', attachmentRecord);
        
        formattedAttachments.push({
          url: publicUrl,
          file_name: file.name,
          content_type: file.type,
          file_path: filePath
        });
      }
    }

    // Send message to assistant edge function
    console.log('Sending to edge function:', {
      message,
      threadId,
      attachmentsCount: formattedAttachments.length
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

    console.log('Response received from edge function:', data);
    return data;
    
  } catch (err) {
    console.error('Error in sendMessage:', err);
    throw err;
  }
};
