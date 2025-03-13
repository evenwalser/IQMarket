
import { Upload, X, FileSpreadsheet, FileImage, FileText, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FileUploadButtonProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments?: File[];
  disabled?: boolean;
  onRemoveAttachment?: (index: number) => void;
  inline?: boolean;
}

export const FileUploadButton = ({
  onFileUpload,
  attachments = [],
  disabled = false,
  onRemoveAttachment,
  inline = false
}: FileUploadButtonProps) => {
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get file icon based on file type
  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    if (type.includes('image')) {
      return <FileImage size={14} className="mr-1" />;
    } else if (type.includes('spreadsheet') || type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
      return <FileSpreadsheet size={14} className="mr-1" />;
    } else {
      return <FileText size={14} className="mr-1" />;
    }
  };

  return (
    <div className={inline ? "" : "relative"}>
      {/* File Upload Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled}
              className={`h-8 w-8 p-0 ${inline ? 'text-primary hover:bg-primary/10' : 'hover:bg-gray-100'}`}
              aria-label="Upload files"
            >
              {inline ? <Paperclip size={16} /> : <Upload size={18} />}
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={onFileUpload}
                multiple
                disabled={disabled}
                aria-label="Upload files"
                accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.json,image/*,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={inline ? "bottom" : "bottom"}>
            <p>Upload documents, spreadsheets, PDFs or images</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Attachment badges - only show if not inline mode */}
      {!inline && attachments.length > 0 && (
        <div className="absolute top-full left-0 mt-2 flex flex-wrap gap-2 w-60 z-10">
          {attachments.map((file, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="flex items-center gap-1 max-w-full bg-gray-100"
            >
              {getFileIcon(file)}
              <span className="truncate text-xs" title={file.name}>
                {file.name.length > 12 ? file.name.substring(0, 10) + '...' : file.name}
                {' '}
                <span className="text-muted-foreground">
                  ({formatFileSize(file.size)})
                </span>
              </span>
              
              {onRemoveAttachment && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 ml-1 hover:bg-gray-200 rounded-full"
                  onClick={() => onRemoveAttachment(index)}
                >
                  <X size={12} />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
