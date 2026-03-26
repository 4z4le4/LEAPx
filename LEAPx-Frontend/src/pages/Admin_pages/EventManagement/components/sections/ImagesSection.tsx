/**
 * Images Section - Event images upload and management
 * Wraps EventImageUploader component with section title
 */

import EventImageUploader from "../EventImageUploader";
import type { ImagePayload } from "../EventImageUploader";

type ExistingPhotoInput =
  | string
  | {
      id?: number;
      cloudinaryImage?: { url?: string | null };
      photoUrl?: string | null;
      url?: string | null;
      imageUrl?: string | null;
    };

interface ImagesSectionProps {
  mode: "create" | "edit";
  initialPhotos?: ExistingPhotoInput[];
  onChange: (payload: ImagePayload) => void;
  error?: string;
}

export default function ImagesSection({
  mode,
  initialPhotos,
  onChange,
  error,
}: ImagesSectionProps) {
  return (
    <div className="space-y-4">
      <EventImageUploader
        mode={mode}
        initialPhotos={initialPhotos}
        onChange={onChange}
        error={error}
      />
    </div>
  );
}
