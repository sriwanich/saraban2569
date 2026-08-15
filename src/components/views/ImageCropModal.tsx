import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, Crop as CropIcon } from 'lucide-react';

interface ImageCropModalProps {
  imageUrl: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export function ImageCropModal({ imageUrl, onClose, onCropComplete }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // If crossOrigin issues, try fetching the image as blob
  const [imageSrc, setImageSrc] = useState<string>(imageUrl);

  useEffect(() => {
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) {
      fetch(imageUrl)
        .then(r => r.blob())
        .then(blob => {
          setImageSrc(URL.createObjectURL(blob));
        })
        .catch(e => {
          console.error("Error loading image for crop", e);
          setImageSrc(imageUrl);
        });
    }
  }, [imageUrl]);

  const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop): Promise<string> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      resolve(canvas.toDataURL('image/png', 1));
    });
  };

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
      onClose();
      return;
    }
    
    setIsProcessing(true);
    try {
      const croppedDataUrl = await getCroppedImg(imgRef.current, completedCrop);
      onCropComplete(croppedDataUrl);
    } catch (e) {
      console.error("Error cropping image", e);
      alert("เกิดข้อผิดพลาดในการครอปรูปภาพ");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-[var(--bg-base)] w-full max-w-5xl rounded-2xl shadow-2xl border border-[var(--border-medium)] flex flex-col overflow-hidden max-h-[95vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-light)] flex justify-between items-center bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/40 dark:text-blue-400">
              <CropIcon className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] font-prompt">ตัดครอบรูปภาพ (Crop)</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-light)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-[var(--bg-canvas)] flex-1 overflow-y-auto flex flex-col items-center min-h-[300px]">
          <div className="text-center mb-4 text-xs text-[var(--text-secondary)]">ลากขอบเพื่อกำหนดพื้นที่ที่ต้องการ</div>
          <div className="border-2 border-dashed border-[var(--border-medium)] p-2 rounded-xl bg-black/5 max-w-full flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
            >
              <img 
                ref={imgRef} 
                src={imageSrc} 
                alt="Crop" 
                className="max-w-full h-auto block" 
                crossOrigin="anonymous"
              />
            </ReactCrop>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border-lighter)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-medium)] hover:bg-[var(--border-light)] text-[var(--text-primary)] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? 'กำลังประมวลผล...' : 'ยืนยันการตัด'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
