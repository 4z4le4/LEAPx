import { useEffect, useMemo, useRef, useState } from "react";
import ImagePreviewTile from "./ImagePreviewTile";

export type ImagePayload = {
  newFiles: File[];
  mainIndex: number;
  deletedIds: number[];
  hasImage: boolean;
};

type ExistingPhotoInput =
  | string
  | {
      id?: number;
      cloudinaryImage?: { url?: string | null };
      photoUrl?: string | null;
      url?: string | null;
      imageUrl?: string | null;
    };

type Item =
  | {
      kind: "existing";
      id?: number;
      src: string;
    }
  | {
      kind: "new";
      file: File;
      src: string;
    };

type Props = {
  mode: "create" | "edit";
  initialPhotos?: ExistingPhotoInput[];
  onChange: (payload: ImagePayload) => void;
  error?: string;
};

export default function EventImageUploader({
  mode,
  initialPhotos = [],
  onChange,
  error,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  /* ================================
     Preload existing photos (edit)
  =================================== */

  useEffect(() => {
    if (mode !== "edit") return;
    if (!initialPhotos?.length) return;

    const mapped: Item[] = initialPhotos
      .map((p) => {
        if (typeof p === "string") {
          return { kind: "existing", src: p };
        }

        const url =
          p.cloudinaryImage?.url ?? p.photoUrl ?? p.url ?? p.imageUrl ?? null;

        if (!url) return null;

        return {
          kind: "existing",
          id: p.id,
          src: url,
        };
      })
      .filter(Boolean) as Item[];

    setItems(mapped);
  }, [mode, initialPhotos]);

  /* ================================
     Cleanup object URLs
  =================================== */

  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.kind === "new") {
          URL.revokeObjectURL(item.src);
        }
      });
    };
  }, [items]);

  /* ================================
     Derived values
  =================================== */

  const imageCount = items.length;
  const currentItem = imageCount === 0 ? null : items[currentIdx];

  const newFiles = useMemo(
    () =>
      items
        .filter((i): i is Extract<Item, { kind: "new" }> => i.kind === "new")
        .map((i) => i.file),
    [items],
  );

  const mainIndex = useMemo(() => {
    if (!currentItem) return 0;

    if (currentItem.kind !== "new") return 0;

    const newOnly = items.filter(
      (i): i is Extract<Item, { kind: "new" }> => i.kind === "new",
    );

    const idx = newOnly.findIndex((i) => i.file === currentItem.file);

    return idx >= 0 ? idx : 0;
  }, [items, currentItem]);

  const hasImage = imageCount > 0;

  /* ================================
     Emit payload to parent
  =================================== */

  useEffect(() => {
    onChange({
      newFiles,
      mainIndex,
      deletedIds,
      hasImage,
    });
  }, [newFiles, mainIndex, deletedIds, hasImage, onChange]);

  /* ================================
     File picking
  =================================== */

  const handlePickFiles = (filesList: FileList | null) => {
    if (!filesList) return;

    const incoming = Array.from(filesList);

    if (items.length + incoming.length > 4) {
      alert("อัปโหลดได้สูงสุด 4 รูป");
    }

    const allowed = incoming.slice(0, 4 - items.length);

    const newItems: Item[] = allowed.map((file) => ({
      kind: "new",
      file,
      src: URL.createObjectURL(file),
    }));

    setItems((prev) => {
      const updated = [...prev, ...newItems];

      setCurrentIdx(updated.length - 1);

      return updated;
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ================================
     Remove
  =================================== */

  const removeCurrent = () => {
    if (!currentItem) return;

    if (currentItem.kind === "existing" && currentItem.id) {
      setDeletedIds((prev) =>
        prev.includes(currentItem.id!) ? prev : [...prev, currentItem.id!],
      );
    }

    setItems((prev) => prev.filter((_, i) => i !== currentIdx));

    setCurrentIdx((i) => Math.max(0, i - 1));
  };

  /* ================================
     Set as main
  =================================== */

  const setAsMain = () => {
    if (!currentItem) return;

    setItems((prev) => {
      const next = [...prev];
      const [picked] = next.splice(currentIdx, 1);
      next.unshift(picked);
      return next;
    });

    setCurrentIdx(0);
  };

  /* ================================
     Navigation
  =================================== */

  const next = () => setCurrentIdx((i) => Math.min(i + 1, imageCount - 1));

  const prev = () => setCurrentIdx((i) => Math.max(i - 1, 0));

  /* ================================
     Render
  =================================== */

  return (
    <div className="self-stretch">
      <div className="h-full rounded-2xl border border-slate-200 bg-white p-4">
        {currentItem ? (
          <>
            <div className="relative">
              <ImagePreviewTile
                src={currentItem.src}
                isMain={currentIdx === 0}
                onRemove={removeCurrent}
                onSetMain={setAsMain}
                className="mx-auto w-full"
              />

              {imageCount > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2 py-1 text-lg shadow hover:bg-white"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2 py-1 text-lg shadow hover:bg-white"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div
            className="mx-auto flex w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400"
            style={{ aspectRatio: "2 / 3" }}
          >
            ยังไม่ได้เลือกรูป
          </div>
        )}

        <div className="mt-2 flex justify-center text-xs text-slate-600">
          {`${imageCount === 0 ? 0 : currentIdx + 1}/${imageCount}`}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => handlePickFiles(e.target.files)}
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-cyan-500 px-3 py-2 text-sm text-white shadow hover:bg-cyan-700"
          >
            เลือกไฟล์
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">
          อัปโหลดได้สูงสุด 4 รูป • แนะนำขนาด 600×900px (2:3) • .PNG หรือ .JPG
        </div>

        {error && (
          <div className="mt-2 text-center text-xs text-red-600">{error}</div>
        )}
      </div>
    </div>
  );
}
