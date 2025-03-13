
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (handleAttachmentUpload && handleFileUpload) {
      handleAttachmentUpload(e);
      handleFileUpload(e);
      
      // Reset the file input value after upload to allow selecting the same file again
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* File Upload Button (only visible if not integrated in SearchInput) */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden md:flex items-center gap-2 rounded-full"
          onClick={() => document.getElementById('file-upload-separate')?.click()}
        >
          <Upload className="h-4 w-4" />
          <span>Attach Files</span>
          <input
            id="file-upload-separate"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt,.csv,image/*"
            multiple
          />
        </Button>
      </div>
      
      {/* Attachments List */}
      <AttachmentList 
        attachments={attachments} 
        onRemove={removeAttachment} 
      />
    </div>
  );
};
