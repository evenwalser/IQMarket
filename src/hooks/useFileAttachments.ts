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
    console.log('Files selected for upload:', files.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));
    
    try {
      for (const file of files) {
        const filePath = `${crypto.randomUUID()}-${file.name.replace(/[^\x00-\x7F]/g, '')}`;
        console.log('Generated file path:', filePath);
        
        const { data: existingFile } = await supabase
          .from('chat_attachments')
          .select('*')
          .eq('file_name', file.name)
          .eq('size', file.size)
          .single();

        if (existingFile) {
          console.log('File already exists:', existingFile);
          setAttachments(prev => [...prev, file]);
          setUploadedAttachments(prev => [...prev, existingFile]);
          continue;
        }
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        console.log('File uploaded to storage successfully');

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

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw insertError;
        }

        if (data) {
          console.log('File metadata saved to database:', data);
          setAttachments(prev => [...prev, file]);
          setUploadedAttachments(prev => [...prev, data]);
          toast.success(`File ${file.name} uploaded successfully`);
        }
      }
    } catch (error) {
      console.error('Error in file upload process:', error);
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
    removeAttachment,
    files: attachments,
    uploadFiles: handleAttachmentUpload,
    removeFile: removeAttachment
  };
};
