
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
        <div className="absolute right-0 -top-[48px] z-10">
          <label className="cursor-pointer relative inline-flex">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              onChange={e => {
                handleAttachmentUpload(e);
                handleFileUpload(e);
              }}
              accept=".pdf,.doc,.docx,.txt,.csv,image/*"
              multiple
              onClick={e => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <Upload className="h-4 w-4 text-gray-600" />
            </Button>
          </label>
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
