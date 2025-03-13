
import { Button } from "@/components/ui/button";
import { X, FileText, Image as ImageIcon, FileSpreadsheet, File, Paperclip } from "lucide-react";
import { useState, useEffect } from "react";

interface AttachmentListProps {
  attachments: File[];
  onRemove: (index: number) => void;
}

export const AttachmentList = ({ attachments, onRemove }: AttachmentListProps) => {
  const [previews, setPreviews] = useState<(string | null)[]>([]);

  useEffect(() => {
    // Create preview URLs for images
    const newPreviews = attachments.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return null;
    });

    setPreviews(newPreviews);

    // Cleanup function to revoke URLs
    return () => {
      newPreviews.forEach(preview => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [attachments]);

  if (attachments.length === 0) return null;
  
  // Get appropriate icon for file type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    } else if (
      file.type.includes('spreadsheet') || 
      file.type.includes('excel') || 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.csv')
    ) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    } else if (file.name.endsWith('.pdf')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else {
      return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="mt-2 mb-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
        <Paperclip className="h-3 w-3 mr-1" />
        Attachments ({attachments.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {attachments.map((file, index) => (
          <div key={index} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg group relative hover:bg-gray-50 transition-colors">
            {/* Preview or Icon */}
            <div className="w-8 h-8 flex items-center justify-center">
              {previews[index] ? (
                <img 
                  src={previews[index]!} 
                  alt={file.name}
                  className="w-8 h-8 object-cover rounded"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                  {getFileIcon(file)}
                </div>
              )}
            </div>

            {/* File Name and Size */}
            <div className="flex flex-col">
              <span className="text-sm text-gray-700 truncate max-w-[150px]" title={file.name}>
                {file.name}
              </span>
              <span className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </span>
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -right-2 bg-white shadow-sm border rounded-full"
              onClick={() => onRemove(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
