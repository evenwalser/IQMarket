
import { Upload } from "lucide-react";
import { AttachmentList } from "@/components/chat/AttachmentList";

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
        <div className="absolute right-4 -top-[48px] z-10">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={e => {
              handleAttachmentUpload(e);
              handleFileUpload(e);
            }}
            accept=".pdf,.doc,.docx,.txt,.csv,image/*"
            multiple
            onClick={e => e.stopPropagation()}
          />
          <Upload className="h-4 w-4 ml-1 opacity-70" />
        </div>
      </div>
      
      {/* Attachments List */}
      <AttachmentList 
        attachments={attachments} 
        onRemove={removeAttachment} 
      />
    </div>
  );
};
