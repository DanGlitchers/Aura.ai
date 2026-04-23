// FILE: components/preview/LivePreview.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, RefreshCw, Code2, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { useAuraStore } from '@/store/useAuraStore';
import { cn } from '@/lib/utils';

interface LivePreviewProps {
  code: string;
  isBuilding: boolean;
  buildProgress: number;
  className?: string;
}

export default function LivePreview({ code, isBuilding, buildProgress, className }: LivePreviewProps) {
  const [previewKey, setPreviewKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { setPreviewUrl } = useAuraStore();

  // Generate blob URL for preview
  const generatePreviewBlob = useCallback((htmlCode: string) => {
    // Wrap user code in a complete HTML document with proper meta tags
    const fullHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta name="generator" content="Aura.ai" />
        <title>Aura.ai Preview</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: {
                colors: {
                  'aura-indigo': { 50: '#eef2ff', 100: '#e0e7ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
                  'aura-purple': { 50: '#faf5ff', 100: '#f3e8ff', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce' },
                },
                animation: {
                  'fade-in': 'fadeIn 0.3s ease-out',
                  'slide-up': 'slideUp 0.4s ease-out',
                },
                keyframes: {
                  fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                  slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
                }
              }
            }
          }
        </script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          * { font-family: 'Inter', system-ui, sans-serif; }
          html { scroll-behavior: smooth; }
          .aura-gradient { background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%); }
          .aura-glass { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); }
          @media (prefers-color-scheme: dark) {
            body { background: #0f172a; color: #f1f5f9; }
          }
        </style>
      </head>
      <body class="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        <div id="root">${htmlCode}</div>
        <script>
          // Enable dark mode detection
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
          }
          // Signal parent that preview is ready
          window.addEventListener('load', () => {
            parent.postMessage({ type: 'PREVIEW_READY', source: 'aura-preview' }, '*');
          });
        </script>
      </body>
      </html>
    `.trim();
    
    const blob = new Blob([fullHTML], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, []);

  // Update preview when code changes
  useEffect(() => {
    if (!code.trim()) return;
    
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const blobUrl = generatePreviewBlob(code);
      setPreviewUrl(blobUrl);
      
      // Force re-render iframe
      setPreviewKey(prev => prev + 1);
      
      // Cleanup previous blob
      return () => URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('[LivePreview] Blob generation failed:', error);
      setLoadError('Failed to generate preview. Please try again.');
    }
  }, [code, generatePreviewBlob, setPreviewUrl]);

  // Handle iframe load events
  const handleIframeLoad = () => {
    setIsLoading(false);
    setLoadError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError('Preview failed to load. Check console for details.');
  };

  // Refresh preview manually
  const handleRefresh = () => {
    setIsLoading(true);
    setPreviewKey(prev => prev + 1);
    setTimeout(() => setIsLoading(false), 800);
  };

  // Open in new tab
  const handleOpenNewTab = () => {
    if (!code.trim()) return;
    const blobUrl = generatePreviewBlob(code);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("relative w-full h-full flex flex-col", className)}
    >
      {/* Preview header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
            <Eye className="w-4 h-4 text-indigo-500" />
            <span>Live Preview</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Build progress indicator */}
          {isBuilding && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"
            >
              <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
                {buildProgress}%
              </span>
            </motion.div>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isLoading || !code.trim()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40"
            title="Refresh preview"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenNewTab}
            disabled={!code.trim()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Preview container */}
      <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 rounded-b-xl overflow-hidden">
        {/* Loading overlay */}
        <AnimatePresence>
          {(isLoading || !code.trim()) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full mb-4"
                  />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Rendering preview...</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Applying styles and scripts</p>
                </>
              ) : (
                <>
                  <Code2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isBuilding ? "Building your site..." : "Enter a prompt to start"}
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {loadError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/90 dark:bg-red-900/20 z-20 p-6"
            >
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400 text-center mb-2">
                {loadError}
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRefresh}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Try Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Iframe preview */}
        <iframe
          key={previewKey}
          ref={iframeRef}
          src={code.trim() ? undefined : 'about:blank'}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
          className={cn(
            "w-full h-full border-0 transition-opacity duration-300",
            (isLoading || !code.trim() || loadError) && "opacity-0 pointer-events-none"
          )}
          title="Aura.ai Live Preview"
        />
      </div>

      {/* Footer status bar */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Preview Mode • Tailwind CSS • React 18</span>
          <span className="flex items-center space-x-1">
            <span className={cn(
              "w-2 h-2 rounded-full",
              loadError ? "bg-red-500" : isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
            )} />
            <span>{loadError ? 'Error' : isLoading ? 'Loading' : 'Ready'}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}
