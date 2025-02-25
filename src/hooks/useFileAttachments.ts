
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ChatAttachment = Database['public']['Tables']['chat_attachments']['Row'];

export const useFileAttachments = () => {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<ChatAttachment[]>([]);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    
    try {
      for (const file of files) {
        const filePath = `${crypto.randomUUID()}-${file.name.replace(/[^\x00-\x7F]/g, '')}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data, error: insertError } = await supabase
          .from('chat_attachments')
          .insert({
            file_path: filePath,
            file_name: file.name,
            content_type: file.type,
            size: file.size
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (data) {
          setUploadedAttachments(prev => [...prev, data]);
          toast.success(`File ${file.name} uploaded successfully`);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file: ' + (error as Error).message);
    }
  };

  const removeAttachment = async (index: number) => {
    const removedAttachment = uploadedAttachments[index];
    
    try {
      const { error: storageError } = await supabase.storage
        .from('chat-attachments')
        .remove([removedAttachment.file_path]);

      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from('chat_attachments')
        .delete()
        .eq('id', removedAttachment.id);

      if (deleteError) throw deleteError;

      setAttachments(prev => prev.filter((_, i) => i !== index));
      setUploadedAttachments(prev => prev.filter((_, i) => i !== index));
      toast.success('File removed successfully');
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file: ' + (error as Error).message);
    }
  };

  return {
    attachments,
    handleAttachmentUpload,
    removeAttachment
  };
};
