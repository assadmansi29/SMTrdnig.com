import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  Trash2, 
  Check, 
  AlertCircle, 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  Camera, 
  FolderOpen, 
  RefreshCw,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Resizes and optimizes an image file into a square avatar data URL (max 600x600 px)
 */
async function processAndCompressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDimension = 600;
        let width = img.width;
        let height = img.height;

        // Crop to square from center
        const minSide = Math.min(width, height);
        const startX = (width - minSide) / 2;
        const startY = (height - minSide) / 2;

        canvas.width = Math.min(maxDimension, minSide);
        canvas.height = Math.min(maxDimension, minSide);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context could not be created'));
          return;
        }

        // Draw centered and cropped
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          img,
          startX,
          startY,
          minSide,
          minSide,
          0,
          0,
          canvas.width,
          canvas.height
        );

        // Export as webp if supported, or high-quality jpeg
        try {
          const webpData = canvas.toDataURL('image/webp', 0.92);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback to jpeg
        }
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = () => reject(new Error('Failed to parse image file.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsDataURL(file);
  });
}

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, uploadAvatar, removeAvatar } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsDragging(false);
    setUploadProgress(null);
    setIsLoading(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    resetState();
    onClose();
  };

  const validateAndProcessFile = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage(
        'Invalid file type. Please upload a JPG, JPEG, PNG, or WEBP photo.'
      );
      return;
    }

    // 2. Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(
        `File is too large (${sizeMB} MB). Maximum allowed size is 5.0 MB.`
      );
      return;
    }

    try {
      setIsLoading(true);
      setUploadProgress(15);
      const optimizedDataUrl = await processAndCompressImage(file);
      setUploadProgress(40);
      setSelectedFile(file);
      setPreviewUrl(optimizedDataUrl);
      setIsLoading(false);
      setUploadProgress(null);
    } catch (err: any) {
      setIsLoading(false);
      setUploadProgress(null);
      setErrorMessage(err.message || 'Failed to process the selected photo.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleSaveAvatar = async () => {
    if (!previewUrl) {
      setErrorMessage('Please select a photo first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setUploadProgress(50);

    try {
      // Simulate stepped progress for smooth UX feedback
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (!prev) return 60;
          if (prev >= 90) return prev;
          return prev + 15;
        });
      }, 100);

      const res = await uploadAvatar(previewUrl);
      clearInterval(progressTimer);
      setUploadProgress(100);

      if (res.success) {
        setSuccessMessage('Profile picture updated successfully!');
        if (onSuccess) onSuccess();
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setIsLoading(false);
        setUploadProgress(null);
        setErrorMessage(res.error || 'Failed to save profile picture.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setUploadProgress(null);
      setErrorMessage(err.message || 'An unexpected error occurred.');
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your custom profile picture and reset to default?')) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await removeAvatar();
      if (res.success) {
        setSuccessMessage('Profile picture removed. Default avatar restored.');
        resetState();
        if (onSuccess) onSuccess();
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Failed to remove avatar.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove avatar.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0C111E] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#080C14] gap-3 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                Update Profile Picture
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Upload from Gallery or Files (JPG, PNG, WEBP)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success Message Alert */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* Avatar Comparison / Preview Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* Current or New Preview Avatar */}
            <div className="text-center space-y-2">
              <div className="relative inline-block">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-lg shadow-amber-500/10 bg-slate-900 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="New Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserAvatar
                      user={user}
                      size="3xl"
                      className="w-full h-full"
                    />
                  )}
                </div>

                {previewUrl && (
                  <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3" />
                    <span>New Preview</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {previewUrl ? 'Ready to apply' : `@${user.username}`}
              </p>
            </div>

            {/* Info Badge */}
            <div className="text-xs text-slate-400 space-y-1.5 max-w-[220px]">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Info className="w-3.5 h-3.5" />
                <span>Upload Guidelines</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
                <li>JPG, JPEG, PNG, or WEBP</li>
                <li>Max file size: 5.0 MB</li>
                <li>Auto-cropped to square avatar</li>
                <li>Instant cross-device sync</li>
              </ul>
            </div>
          </div>

          {/* Drag & Drop Upload Target Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                : 'border-slate-700/80 hover:border-amber-400/60 bg-slate-900/40 hover:bg-slate-900/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-2.5">
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <span className="text-sm font-bold text-white">
                  Tap to browse Gallery Photos or Files
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  or drag & drop your photo directly here
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Choose Photo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar (during processing or uploading) */}
          {uploadProgress !== null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading profile photo...</span>
                </span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#080C14] flex flex-wrap items-center justify-between gap-3">
          <div>
            {user.avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Custom Photo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAvatar}
              disabled={isLoading || !previewUrl}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer shadow-md shadow-amber-400/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Profile Picture</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
