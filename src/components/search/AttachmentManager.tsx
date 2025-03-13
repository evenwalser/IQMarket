
import { useState } from "react";
import { toast } from "sonner";
import type { AssistantType } from "@/lib/types";

interface AttachmentManagerProps {
  selectedMode: AssistantType;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
}

export const useAttachmentManager = ({
  selectedMode,
  handleFileUpload,
  attachments
}: AttachmentManagerProps) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // File drop handler for drag and drop functionality
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      // Only allow file uploads in benchmarks mode
      if (selectedMode !== 'benchmarks') {
        toast.error("File uploads are only available in Benchmarks mode");
        return;
      }
      
      // Convert FileList to array
      const filesArray = Array.from(e.dataTransfer.files);
      
      // Create a synthetic event to pass to handleFileUpload
      const event = {
        target: {
          files: filesArray
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileUpload(event);
    }
  };
  
  // Remove attachment handler
  const removeAttachment = (index: number) => {
    const updatedAttachments = [...attachments];
    updatedAttachments.splice(index, 1);
    
    // Need to update the parent's state
    const event = {
      target: {
        files: updatedAttachments
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileUpload(event);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  // Clear attachments
  const clearAttachments = () => {
    const emptyEvent = {
      target: {
        files: []
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    handleFileUpload(emptyEvent);
  };

  return {
    isDraggingOver,
    handleDragOver,
    handleDragLeave,
    handleDrop: handleFileDrop,
    removeAttachment,
    clearAttachments
  };
};
