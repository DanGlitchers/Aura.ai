// FILE: components/chat/ChatInput.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Loader2, Command, X } from 'lucide-react';
import { useAuraStore } from '@/store/useAuraStore';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  disabled?: boolean;
  onPromptSubmit: (prompt: string) => void;
}

export default function ChatInput({ disabled = false, onPromptSubmit }: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { inputPrompt, setInputPrompt, isStreaming, isBuilding } = useAuraStore();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputPrompt]);

  // Hide hints after first interaction
  useEffect(() => {
    if (inputPrompt.length > 0) setShowHints(false);
  }, [inputPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputPrompt.trim();
    if (!trimmed || disabled || isStreaming) return;
    
    onPromptSubmit(trimmed);
    setInputPrompt('');
    setShowHints(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setInputPrompt('');
      textareaRef.current?.blur();
    }
  };

  const quickPrompts = [
    "Build a portfolio site with dark mode and project gallery",
    "Create a SaaS landing page with pricing tiers and testimonials",
    "Generate an e-commerce store with cart and product filters",
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full"
    >
      {/* Gradient border effect */}
      <div className={cn(
        "absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 transition-opacity duration-500",
        isFocused && !disabled ? "opacity-70" : "opacity-20",
        disabled && "opacity-10"
      )} />
      
      <form onSubmit={handleSubmit} className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header bar with status */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isBuilding ? '✨ Aura.ai is building your site...' : '💬 Describe your website'}
            </span>
          </div>
          
          <AnimatePresence>
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center space-x-2 text-xs text-indigo-600 dark:text-indigo-400"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Streaming code...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Textarea input */}
        <textarea
          ref={textareaRef}
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onFocus={() => { setIsFocused(true); setShowHints(true); }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isBuilding}
          placeholder={isBuilding ? "Building in progress... Please wait." : "E.g., 'A modern portfolio for a photographer with fullscreen gallery, contact form, and blog section'"}
          className={cn(
            "w-full px-4 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
            "text-base leading-relaxed resize-none outline-none min-h-[60px] max-h-[200px]",
            disabled && "opacity-60 cursor-not-allowed"
          )}
          rows={3}
        />

        {/* Quick prompts hints */}
        <AnimatePresence>
          {showHints && !isBuilding && inputPrompt.length === 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-3 space-y-2"
            >
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Command className="w-3.5 h-3.5" />
                <span>Try one of these:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt, i) => (
                  <motion.button
                    key={i}
                    type="button"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(99,102,241,0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInputPrompt(prompt)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors duration-200 text-left"
                  >
                    {prompt.slice(0, 45)}...
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInputPrompt('')}
              disabled={!inputPrompt}
              className={cn(
                "p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200",
                !inputPrompt && "opacity-40 cursor-not-allowed"
              )}
              aria-label="Clear input"
            >
              <X className="w-4 h-4" />
            </motion.button>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {inputPrompt.length}/500
            </span>
          </div>
          
          <motion.button
            type="submit"
            disabled={!inputPrompt.trim() || disabled || isBuilding}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-white",
              "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700",
              "shadow-lg hover:shadow-xl transition-all duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            )}
          >
            {isBuilding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Building...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Generate Site</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}
