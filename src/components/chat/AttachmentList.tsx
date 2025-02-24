
import { Button } from "@/components/ui/button";
import { X, FileText, Image as ImageIcon } from "lucide-react";
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

  return (
    <div className="mt-2 mb-4">
      <div className="flex flex-wrap gap-2">
        {attachments.map((file, index) => (
          <div key={index} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg group relative">
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
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 text-gray-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              )}
            </div>

            {/* File Name */}
            <span className="text-sm text-gray-700 truncate max-w-[150px]">
              {file.name}
            </span>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -right-2 bg-white shadow-sm border"
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
