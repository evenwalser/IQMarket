
import { Button } from "@/components/ui/button";
import { X, FileText, Image as ImageIcon, File } from "lucide-react";
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const getFileColorClass = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return "bg-blue-100 text-blue-600";
    } else if (fileType.includes('pdf')) {
      return "bg-red-100 text-red-600";
    } else {
      return "bg-green-100 text-green-600";
    }
  };

  return (
    <div className="mt-2 mb-4">
      <div className="flex flex-wrap gap-2">
        {attachments.map((file, index) => (
          <div 
            key={index} 
            className="relative group"
          >
            {/* Smaller squares with rounded edges */}
            <div className="w-20 h-20 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col items-center justify-center overflow-hidden p-2">
              {/* Preview for images, icons for other files */}
              {previews[index] ? (
                <div className="w-full h-10 flex items-center justify-center mb-1">
                  <img 
                    src={previews[index]!} 
                    alt={file.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className={`w-10 h-10 ${getFileColorClass(file.type)} rounded-lg flex items-center justify-center mb-1`}>
                  {getFileIcon(file.type)}
                </div>
              )}
              
              {/* File name */}
              <div className="w-full px-1">
                <p className="text-xs font-medium text-gray-700 text-center truncate">
                  {file.name}
                </p>
              </div>
            </div>
            
            {/* Remove Button - positioned on the top right */}
            <Button
              variant="destructive"
              size="icon"
              className="h-5 w-5 p-0 absolute -top-2 -right-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
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
