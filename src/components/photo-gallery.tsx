"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePhotoGallery } from "@/hooks/use-photo-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ImageIcon,
  Upload,
  X,
  AlertTriangle,
  Shield,
  Info,
  Loader2,
  Camera,
  FileImage,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PhotoGalleryProps {
  onPhotoSelect?: (photoUrl: string) => void;
  selectedPhotoUrl?: string;
  maxPhotos?: number;
  className?: string;
}

export default function PhotoGallery({
  onPhotoSelect,
  selectedPhotoUrl,
  maxPhotos = 10,
  className,
}: PhotoGalleryProps) {
  const { toast } = useToast();
  const {
    photos,
    isLoading,
    error,
    hasPermission,
    isSupported,
    selectPhotos,
    removePhoto,
    clearPhotos,
    getPhotoDataURL,
    checkPhotoPrivacy,
    formatFileSize,
    clearError,
  } = usePhotoGallery();

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [privacyCheck, setPrivacyCheck] = useState<Record<string, any>>({});

  const handlePhotoSelect = async () => {
    try {
      clearError();
      const newPhotos = await selectPhotos();

      if (newPhotos.length > 0) {
        // Check privacy compliance for new photos
        for (const photo of newPhotos) {
          const privacy = await checkPhotoPrivacy(photo);
          setPrivacyCheck((prev) => ({ ...prev, [photo.id]: privacy }));

          if (!privacy.isCompliant && privacy.warnings.length > 0) {
            toast({
              variant: "destructive",
              title: "Privacy Warning",
              description: `${photo.name}: ${privacy.warnings[0]}`,
            });
          }
        }

        toast({
          title: "Photos Selected",
          description: `Added ${newPhotos.length} photo${newPhotos.length > 1 ? "s" : ""} to gallery`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Selection Failed",
        description: error instanceof Error ? error.message : "Failed to select photos",
      });
    }
  };

  const handlePhotoClick = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    try {
      setSelectedPhoto(photoId);
      const dataURL = await getPhotoDataURL(photo);
      onPhotoSelect?.(dataURL);

      toast({
        title: "Photo Selected",
        description: "Photo ready for album cover generation",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Selection Error",
        description: "Failed to process selected photo",
      });
    }
  };

  const handlePhotoRemove = (photoId: string) => {
    const success = removePhoto(photoId);
    if (success) {
      if (selectedPhoto === photoId) {
        setSelectedPhoto(null);
        onPhotoSelect?.("");
      }
      setPrivacyCheck((prev) => {
        const updated = { ...prev };
        delete updated[photoId];
        return updated;
      });
    }
  };

  if (!isSupported) {
    return (
      <Card className={cn("bg-white/5 border-white/20", className)}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white mb-2">Photo Gallery Not Supported</h3>
          <p className="text-white/70 text-sm">
            Your browser doesn't support photo gallery features. Please use a modern browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-white/5 border-white/20", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white">
          <Camera className="w-5 h-5 text-[#9FFFA2]" />
          Photo Gallery
          <Badge variant="outline" className="border-[#9FFFA2]/30 text-[#9FFFA2] text-xs">
            Privacy Safe
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Privacy Notice */}
        <div className="bg-[#9FFFA2]/10 border border-[#9FFFA2]/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#9FFFA2] mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-white mb-2">Privacy First</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Your photos stay on your device. We only process selected images locally for album
                cover generation. No photos are uploaded to our servers.
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#FF6F91]/10 border border-[#FF6F91]/20 rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#FF6F91] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Selection Error</p>
                <p className="text-white/70 text-sm">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Photo Selection Button */}
        <div className="text-center">
          <Button
            onClick={handlePhotoSelect}
            disabled={isLoading || photos.length >= maxPhotos}
            className="bg-gradient-to-r from-[#9FFFA2] to-[#8FD3FF] text-black font-bold hover:opacity-90 rounded-full px-8"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Selecting Photos...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Select Photos ({photos.length}/{maxPhotos})
              </>
            )}
          </Button>

          {photos.length >= maxPhotos && (
            <p className="text-white/50 text-xs mt-2">
              Maximum photos reached. Remove some to add more.
            </p>
          )}
        </div>

        {/* Selected Photos Grid */}
        {photos.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium">Selected Photos</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={clearPhotos}
                className="border-white/20 text-white/70 hover:bg-white/10 text-xs"
              >
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <AnimatePresence>
                {photos.map((photo) => {
                  const isSelected = selectedPhoto === photo.id || selectedPhotoUrl === photo.url;
                  const privacy = privacyCheck[photo.id];

                  return (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={cn(
                        "relative group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all",
                        isSelected
                          ? "border-[#9FFFA2] shadow-lg shadow-[#9FFFA2]/20"
                          : "border-white/20 hover:border-white/40",
                      )}
                      onClick={() => handlePhotoClick(photo.id)}
                    >
                      {/* Photo */}
                      <div className="aspect-square relative">
                        <Image
                          src={photo.url}
                          alt={photo.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />

                        {/* Selected Indicator */}
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-[#9FFFA2]/20 flex items-center justify-center"
                          >
                            <div className="bg-[#9FFFA2] rounded-full p-2">
                              <FileImage className="w-4 h-4 text-black" />
                            </div>
                          </motion.div>
                        )}

                        {/* Privacy Warning */}
                        {privacy && !privacy.isCompliant && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-[#FF6F91]/90 text-white text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Privacy
                            </Badge>
                          </div>
                        )}

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePhotoRemove(photo.id);
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Photo Info */}
                      <div className="p-3 bg-white/5">
                        <p className="text-white text-sm font-medium truncate">{photo.name}</p>
                        <p className="text-white/50 text-xs">{formatFileSize(photo.size)}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty State */}
        {photos.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <h3 className="text-white font-medium mb-2">No Photos Selected</h3>
            <p className="text-white/50 text-sm max-w-sm mx-auto leading-relaxed">
              Select photos from your device to use for personalized album cover generation.
            </p>
          </motion.div>
        )}

        {/* Usage Tips */}
        <div className="bg-white/5 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#8FD3FF] mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-white mb-2">Tips for Best Results</h4>
              <ul className="text-white/70 text-sm space-y-1">
                <li>• Use high-quality photos (at least 800x800px)</li>
                <li>• Clear, well-lit images work best</li>
                <li>• Avoid photos with text overlays</li>
                <li>• Landscape and portrait orientations supported</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
