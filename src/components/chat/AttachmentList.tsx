
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
      return <ImageIcon className="h-5 w-5" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="h-5 w-5" />;
    } else {
      return <File className="h-5 w-5" />;
    }
  };

  const getFileColorClass = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return "bg-blue-50 text-blue-600";
    } else if (fileType.includes('pdf')) {
      return "bg-red-50 text-red-600";
    } else {
      return "bg-green-50 text-green-600";
    }
  };

  return (
    <div className="mt-2 mb-4">
      <div className="flex flex-wrap gap-2">
        {attachments.map((file, index) => (
          <div 
            key={index} 
            className="relative flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-sm transition-shadow hover:shadow-md group"
          >
            {/* Container for icon + filename + remove button */}
            <div className="flex items-center p-2">
              {/* Colored icon circle */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mr-2 ${getFileColorClass(file.type)}`}>
                {getFileIcon(file.type)}
              </div>
              
              {/* File name */}
              <span className="text-sm font-medium text-gray-700 mr-1 truncate max-w-[120px]">
                {file.name}
              </span>
              
              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-1 rounded-full hover:bg-gray-100"
                onClick={() => onRemove(index)}
              >
                <X className="h-3.5 w-3.5 text-gray-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
