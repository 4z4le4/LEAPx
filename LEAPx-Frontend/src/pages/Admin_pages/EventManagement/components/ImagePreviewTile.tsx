import React, { useEffect, useState } from "react";

type Props = {
  src: string;
  isMain: boolean;
  onRemove: () => void;
  onSetMain: () => void;
  className?: string;
};

export default function ImagePreviewTile({
  src,
  isMain,
  onRemove,
  onSetMain,
  className,
}: Props) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const panRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [base, setBase] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [canScroll, setCanScroll] = useState(false);

  const round4 = (v: number) => Math.round(v * 10000) / 10000;

  const computeFit = React.useCallback(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    const wrapW = wrap.clientWidth;
    const wrapH = wrap.clientHeight;
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;

    const contain = Math.min(wrapW / natW, wrapH / natH);
    const cover = Math.max(wrapW / natW, wrapH / natH);
    const EPS = 0.002;
    const aspectImg = natW / natH;
    const aspectTarget = 2 / 3;
    const start = Math.abs(aspectImg - aspectTarget) <= EPS ? contain : cover;
    const s = round4(start);
    setBase(s);
    setZoom(s);
  }, []);

  const updatePanSize = React.useCallback(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    const pan = panRef.current;
    if (!wrap || !img || !pan) return;

    const wrapW = wrap.clientWidth;
    const wrapH = wrap.clientHeight;
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;

    const dispW = natW * zoom;
    const dispH = natH * zoom;

    const TOL = 0.5;
    const needScrollX = dispW > wrapW + TOL;
    const needScrollY = dispH > wrapH + TOL;
    const scroll = needScrollX || needScrollY;
    setCanScroll(scroll);

    pan.style.width = `${scroll ? Math.max(dispW, wrapW) : wrapW}px`;
    pan.style.height = `${scroll ? Math.max(dispH, wrapH) : wrapH}px`;
  }, [zoom]);

  useEffect(() => {
    const obs = new ResizeObserver(() => computeFit());
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [computeFit]);

  const onImgLoad = () => computeFit();
  useEffect(() => {
    updatePanSize();
  }, [updatePanSize]);

  const clamp = (v: number) => Math.max(base, Math.min(v, base * 4));
  const zoomIn = () => setZoom((z) => round4(clamp(z + base * 0.25)));
  const zoomOut = () => setZoom((z) => round4(clamp(z - base * 0.25)));
  const reset = () => setZoom(base);

  return (
    <div
      ref={wrapRef}
      className={`relative rounded-lg border border-slate-200 bg-white ${
        className ?? ""
      }`}
      style={{ aspectRatio: "2 / 3" }}
    >
      <div
        className={`absolute inset-0 ${
          canScroll ? "overflow-auto" : "overflow-hidden"
        }`}
      >
        <div
          ref={panRef}
          className="flex h-full w-full items-center justify-center"
        >
          <img
            ref={imgRef}
            src={src}
            onLoad={onImgLoad}
            alt="preview"
            className="block max-w-none"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>
      </div>

      {/* Badges / Actions */}
      <div className="absolute left-2 top-2 flex gap-2">
        {isMain && (
          <span className="rounded-md bg-amber-400/90 px-2 py-0.5 text-xs font-medium text-slate-900 shadow">
            ภาพหลัก
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md bg-white/90 px-2 py-0.5 text-xs text-slate-700 shadow hover:bg-white"
        >
          ลบ
        </button>
      </div>

      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-white/90 p-1 shadow">
        <button
          type="button"
          onClick={zoomOut}
          className="rounded-sm px-2 py-1 text-xs hover:bg-slate-100"
        >
          −
        </button>

        <span className="px-1 text-xs tabular-nums">
          {Math.round((zoom / base) * 100)}%
        </span>

        <button
          type="button"
          onClick={zoomIn}
          className="rounded-sm px-2 py-1 text-xs hover:bg-slate-100"
        >
          +
        </button>

        <button
          type="button"
          onClick={reset}
          className="ml-1 rounded-sm px-2 py-1 text-xs hover:bg-slate-100"
        >
          รีเซ็ต
        </button>

        <button
          type="button"
          onClick={onSetMain}
          className="ml-1 rounded-sm px-2 py-1 text-xs hover:bg-slate-100"
          aria-label="ตั้งเป็นภาพหลัก"
          title="ตั้งเป็นภาพหลัก"
        >
          ตั้งเป็นภาพหลัก
        </button>
      </div>
    </div>
  );
}
