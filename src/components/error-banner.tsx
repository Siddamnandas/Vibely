"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ErrorType = "oauth" | "playback" | "ai" | "push" | "info";

interface ErrorBannerProps {
  type: ErrorType;
  title: string;
  message: string;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  dismissTime?: number;
}

export function ErrorBanner({
  type,
  title,
  message,
  onDismiss,
  autoDismiss = false,
  dismissTime = 5000,
}: ErrorBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) onDismiss();
      }, dismissTime);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, dismissTime, onDismiss]);

  const getIcon = () => {
    switch (type) {
      case "oauth":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "playback":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "ai":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "push":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "oauth":
        return "bg-yellow-500/10 border-yellow-500/30";
      case "playback":
        return "bg-red-500/10 border-red-500/30";
      case "ai":
        return "bg-red-500/10 border-red-500/30";
      case "push":
        return "bg-yellow-500/10 border-yellow-500/30";
      case "info":
        return "bg-blue-500/10 border-blue-500/30";
      default:
        return "bg-gray-500/10 border-gray-500/30";
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 left-4 right-4 z-[100] ${getBackgroundColor()} border rounded-lg p-4 flex items-start gap-3`}
      >
        {getIcon()}
        <div className="flex-1">
          <h3 className="font-medium text-white">{title}</h3>
          <p className="text-white/80 text-sm mt-1">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            if (onDismiss) onDismiss();
          }}
          className="text-white/60 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
