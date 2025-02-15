
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AttachmentListProps {
  attachments: File[];
  onRemove: (index: number) => void;
}

export const AttachmentList = ({ attachments, onRemove }: AttachmentListProps) => {
  if (attachments.length === 0) return null;

  return (
    <div className="border-t border-gray-200 pt-2">
      <div className="flex flex-wrap gap-2">
        {attachments.map((file, index) => (
          <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
            <span className="text-sm truncate max-w-[150px]">{file.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
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
