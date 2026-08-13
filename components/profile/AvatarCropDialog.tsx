import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Dialog } from '@/components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const OUTPUT_SIZE = 512;

type Point = { x: number; y: number };

type AvatarCropDialogProps = {
  sourceUrl: string;
  sourceName: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const AvatarCropDialog: React.FC<AvatarCropDialogProps> = ({ sourceUrl, sourceName, onCancel, onConfirm }) => {
  const { theme: resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ pointerId: number; start: Point; origin: Point } | null>(null);
  const [stageSize, setStageSize] = useState(0);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [viewportHeight, setViewportHeight] = useState(() => typeof window === 'undefined' ? 900 : window.innerHeight);
  const isShortViewport = viewportHeight <= 640;
  const stageMaxSize = clamp(viewportHeight - 380, 140, 276);
  const neutralButtonClasses = isDarkTheme
    ? '!border-slate-700/90 !bg-slate-950/85 !bg-none !text-slate-100 hover:!border-slate-600 hover:!bg-slate-900 disabled:!border-slate-800 disabled:!bg-slate-950/75 disabled:!text-slate-500'
    : '!border-primary/15 !bg-surface !bg-none !text-text hover:!border-primary/30 hover:!bg-primary/5 disabled:!text-mutedText';
  const primaryButtonClasses = isDarkTheme
    ? '!border-slate-600 !bg-slate-900 !bg-none !text-slate-50 hover:!border-slate-500 hover:!bg-slate-800 disabled:!border-slate-800 disabled:!bg-slate-950/75 disabled:!text-slate-500'
    : '!border-primary !bg-primary !bg-none !text-primary-foreground hover:opacity-90 disabled:!border-primary/10 disabled:!bg-bg/70 disabled:!text-mutedText';

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const updateStageSize = () => setStageSize(Math.min(stage.clientWidth, stage.clientHeight));
    updateStageSize();
    const observer = new ResizeObserver(updateStageSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncViewportHeight = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', syncViewportHeight);
    return () => window.removeEventListener('resize', syncViewportHeight);
  }, []);

  const isQuarterTurn = rotation % 180 !== 0;
  const orientedNaturalSize = useMemo(() => ({
    width: isQuarterTurn ? naturalSize.height : naturalSize.width,
    height: isQuarterTurn ? naturalSize.width : naturalSize.height,
  }), [isQuarterTurn, naturalSize.height, naturalSize.width]);

  const baseScale = useMemo(() => {
    if (!stageSize || !naturalSize.width || !naturalSize.height) return 0;
    return Math.max(stageSize / orientedNaturalSize.width, stageSize / orientedNaturalSize.height);
  }, [naturalSize.height, naturalSize.width, orientedNaturalSize.height, orientedNaturalSize.width, stageSize]);

  const renderedImageSize = useMemo(() => ({
    width: naturalSize.width * baseScale * zoom,
    height: naturalSize.height * baseScale * zoom,
  }), [baseScale, naturalSize.height, naturalSize.width, zoom]);

  const renderedBounds = useMemo(() => ({
    width: orientedNaturalSize.width * baseScale * zoom,
    height: orientedNaturalSize.height * baseScale * zoom,
  }), [baseScale, orientedNaturalSize.height, orientedNaturalSize.width, zoom]);

  const clampOffset = useCallback((next: Point) => {
    const maxX = Math.max(0, (renderedBounds.width - stageSize) / 2);
    const maxY = Math.max(0, (renderedBounds.height - stageSize) / 2);
    return {
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  }, [renderedBounds.height, renderedBounds.width, stageSize]);
  const effectiveOffset = useMemo(() => clampOffset(offset), [clampOffset, offset]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!naturalSize.width || isProcessing) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: effectiveOffset,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setOffset(clampOffset({
      x: drag.origin.x + event.clientX - drag.start.x,
      y: drag.origin.y + event.clientY - drag.start.y,
    }));
  };

  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  const handleStageKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 20 : 8;
    const directions: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const movement = directions[event.key];
    if (!movement) return;
    event.preventDefault();
    setOffset((current) => clampOffset({ x: current.x + movement.x, y: current.y + movement.y }));
  };

  const resetCrop = () => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    setIsMirrored(false);
    setError('');
  };

  const rotateClockwise = () => {
    setRotation((current) => (current + 90) % 360);
    setOffset({ x: 0, y: 0 });
    setError('');
  };

  const toggleMirror = () => {
    setIsMirrored((current) => !current);
    setError('');
  };

  const createCroppedFile = async () => {
    const image = imageRef.current;
    if (!image || !stageSize || !baseScale || !naturalSize.width) throw new Error('تصویر هنوز آماده برش نیست.');

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('امکان پردازش تصویر در این مرورگر وجود ندارد.');

    const outputScale = OUTPUT_SIZE / stageSize;
    const drawWidth = renderedImageSize.width * outputScale;
    const drawHeight = renderedImageSize.height * outputScale;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.save();
    context.translate(
      OUTPUT_SIZE / 2 + effectiveOffset.x * outputScale,
      OUTPUT_SIZE / 2 + effectiveOffset.y * outputScale,
    );
    context.rotate((rotation * Math.PI) / 180);
    context.scale(isMirrored ? -1 : 1, 1);
    context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('ساخت خروجی تصویر انجام نشد.')), 'image/webp', 0.9);
    });
    return new File([blob], 'avatar-cropped.webp', { type: 'image/webp', lastModified: Date.now() });
  };

  const handleConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError('');
    try {
      onConfirm(await createCroppedFile());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'برش تصویر انجام نشد.');
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      title="تنظیم تصویر پروفایل"
      onClose={() => !isProcessing && onCancel()}
      widthClass="max-w-lg"
      closeOnBackdrop={!isProcessing}
      closeOnEscape={!isProcessing}
      ariaDescription="تصویر را جابه‌جا کنید و میزان بزرگ‌نمایی را پیش از ذخیره تنظیم کنید."
      bodyClassName={isShortViewport ? '!px-3 !py-2' : undefined}
    >
      <div className={cn('text-right', isShortViewport ? 'space-y-1 p-0' : 'space-y-4 p-1')} dir="rtl" data-avatar-crop-dialog="true">
        <div className={cn('flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-primary/10 bg-bg/60 px-3', isShortViewport ? 'py-1.5' : 'py-2.5')}>
          <div className="min-w-0">
            <div className="text-xs font-black text-text">برش مربعی تصویر</div>
            <div className="mt-1 break-all text-[11px] font-bold leading-5 text-mutedText">{sourceName}</div>
          </div>
          <Button
            type="button"
            unstyled
            autoIcon={false}
            ripple={false}
            onClick={resetCrop}
            disabled={isProcessing}
            className={cn('before:hidden inline-flex !h-11 !min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-black shadow-none', neutralButtonClasses)}
            leftIcon={<i className="fa-solid fa-rotate-left text-[10px]" aria-hidden="true" />}
          >
            بازنشانی
          </Button>
        </div>

        <div
          ref={stageRef}
          role="application"
          tabIndex={0}
          aria-label="ناحیه تنظیم موقعیت تصویر؛ با لمس، ماوس یا کلیدهای جهت‌دار تصویر را جابه‌جا کنید"
          className="relative mx-auto aspect-square w-full touch-none select-none overflow-hidden rounded-[28px] border border-slate-700 bg-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          style={{ maxWidth: stageMaxSize }}
          data-avatar-crop-stage="true"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          onKeyDown={handleStageKeyDown}
        >
          <img
            ref={imageRef}
            src={sourceUrl}
            alt="پیش‌نمایش قابل تنظیم تصویر پروفایل"
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: renderedImageSize.width || undefined,
              height: renderedImageSize.height || undefined,
              transform: `translate(-50%, -50%) translate(${effectiveOffset.x}px, ${effectiveOffset.y}px) rotate(${rotation}deg) scaleX(${isMirrored ? -1 : 1})`,
            }}
            onLoad={(event) => {
              setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
              setError('');
            }}
            onError={() => setError('فایل انتخاب‌شده قابل نمایش نیست. یک تصویر دیگر انتخاب کنید.')}
          />
          <div className="pointer-events-none absolute inset-0 rounded-[27px] border-2 border-white/35 shadow-[inset_0_0_0_999px_rgba(2,6,23,0.08)]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center" aria-hidden="true">
            <span className="rounded-full bg-slate-950/75 px-3 py-1 text-[10px] font-black text-slate-200">برای جابه‌جایی بکشید</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2" role="group" aria-label="ابزارهای جهت تصویر">
          <Button
            type="button"
            unstyled
            autoIcon={false}
            ripple={false}
            onClick={rotateClockwise}
            disabled={isProcessing || !naturalSize.width}
            className={cn('before:hidden inline-flex !h-11 !min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-black shadow-none disabled:cursor-not-allowed disabled:opacity-50', neutralButtonClasses)}
            leftIcon={<i className="fa-solid fa-rotate-right text-[11px]" aria-hidden="true" />}
            aria-label="چرخاندن تصویر ۹۰ درجه به راست"
            data-avatar-crop-rotate="true"
          >
            چرخش ۹۰ درجه
          </Button>
          <Button
            type="button"
            unstyled
            autoIcon={false}
            ripple={false}
            onClick={toggleMirror}
            disabled={isProcessing || !naturalSize.width}
            className={cn(
              'before:hidden inline-flex !h-11 !min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-black shadow-none disabled:cursor-not-allowed disabled:opacity-50',
              isMirrored
                ? isDarkTheme
                  ? '!border-primary/55 !bg-slate-900 !bg-none !text-slate-50'
                  : '!border-primary/45 !bg-primary/10 !bg-none !text-primary'
                : neutralButtonClasses,
            )}
            leftIcon={<i className="fa-solid fa-left-right text-[11px]" aria-hidden="true" />}
            aria-label={isMirrored ? 'لغو قرینه افقی تصویر' : 'قرینه افقی تصویر'}
            aria-pressed={isMirrored}
            data-avatar-crop-mirror="true"
          >
            قرینه افقی
          </Button>
        </div>

        <label className={cn('block rounded-2xl border border-primary/10 bg-bg/60 px-3', isShortViewport ? 'py-2' : 'py-3')}>
          <span className={cn('flex items-center justify-between gap-3 text-xs font-black text-text', isShortViewport ? 'mb-2' : 'mb-3')}>
            <span className="inline-flex items-center gap-2"><i className="fa-solid fa-magnifying-glass text-[11px]" aria-hidden="true" /> بزرگ‌نمایی</span>
            <span dir="ltr" className="font-mono text-[11px] text-mutedText">{zoom.toFixed(1)}×</span>
          </span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.05"
            value={zoom}
            disabled={isProcessing || !naturalSize.width}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="میزان بزرگ‌نمایی تصویر"
            data-avatar-crop-zoom="true"
          />
        </label>

        {!isShortViewport ? (
          <div className="rounded-2xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-[11px] font-bold leading-5 text-mutedText">
            خروجی با اندازهٔ استاندارد ۵۱۲×۵۱۲ و فرمت WebP ذخیره می‌شود. برای فایل GIF، فریم اول به تصویر ثابت تبدیل خواهد شد.
          </div>
        ) : null}

        {error ? <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-xs font-bold leading-6 text-rose-700 dark:text-rose-200" role="alert">{error}</div> : null}

        <div className={cn('grid grid-cols-2 gap-2 border-t border-primary/10', isShortViewport ? 'pt-2' : 'pt-3')}>
          <Button
            type="button"
            unstyled
            autoIcon={false}
            ripple={false}
            onClick={() => !isProcessing && onCancel()}
            disabled={isProcessing}
            className={cn('before:hidden inline-flex !h-11 !min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black shadow-none', neutralButtonClasses)}
            leftIcon={<i className="fa-solid fa-xmark text-[11px]" aria-hidden="true" />}
          >
            لغو
          </Button>
          <Button
            type="button"
            unstyled
            autoIcon={false}
            ripple={false}
            onClick={handleConfirm}
            disabled={!naturalSize.width || Boolean(error) || isProcessing}
            className={cn('before:hidden inline-flex !h-11 !min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black shadow-none', primaryButtonClasses)}
            leftIcon={<i className={isProcessing ? 'fa-solid fa-spinner fa-spin text-[11px]' : 'fa-solid fa-crop-simple text-[11px]'} aria-hidden="true" />}
          >
            {isProcessing ? 'در حال آماده‌سازی...' : 'اعمال برش'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default AvatarCropDialog;
