import { Upload } from "lucide-react";
import { AttachmentList } from "@/components/chat/AttachmentList";
import { Button } from "@/components/ui/button";

interface FileUploadButtonProps {
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAttachmentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  removeAttachment: (index: number) => void;
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  handleFileUpload,
  handleAttachmentUpload,
  attachments,
  removeAttachment
}) => {
  return (
    <div className="space-y-2">
      <div className="relative">
        {/* File Upload UI is rendered in VoiceSearchInput */}
      </div>
      
      {/* Attachments List */}
      <AttachmentList 
        attachments={attachments} 
        onRemove={removeAttachment} 
      />
    </div>
  );
};
