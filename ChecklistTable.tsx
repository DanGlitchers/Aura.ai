// FILE: components/checklist/ChecklistTable.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Loader2, Code, Palette, Brain, Zap } from 'lucide-react';
import { ChecklistItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChecklistTableProps {
  items: ChecklistItem[];
  isStreaming?: boolean;
  className?: string;
}

const categoryConfig: Record<ChecklistItem['category'], { icon: any; color: string; label: string }> = {
  ui: { icon: Code, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30', label: 'UI Component' },
  logic: { icon: Brain, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30', label: 'Business Logic' },
  styling: { icon: Palette, color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/30', label: 'Styling & Theme' },
  integration: { icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30', label: 'Integration' },
  testing: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30', label: 'QA & Testing' },
};

export default function ChecklistTable({ items, isStreaming = false, className }: ChecklistTableProps) {
  const completedCount = items.filter(i => i.status === 'complete').length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full", className)}
    >
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Brain className="w-5 h-5 text-indigo-500" />
            <span>Build Checklist</span>
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {completedCount}/{items.length} tasks completed
          </p>
        </div>
        
        <div className="text-right">
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            {progress}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
        />
      </div>

      {/* Table container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                  Lines
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <AnimatePresence initial={false}>
                {items.map((item, index) => {
                  const config = categoryConfig[item.category];
                  const Icon = config.icon;
                  const isComplete = item.status === 'complete';
                  const isInProgress = item.status === 'in-progress';
                  
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className={cn(
                        "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150",
                        isComplete && "bg-emerald-50/50 dark:bg-emerald-900/10"
                      )}
                    >
                      {/* Index */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                          isComplete 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" 
                            : isInProgress
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        )}>
                          {isComplete ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                        </span>
                      </td>
                      
                      {/* Task name */}
                      <td className="px-4 py-4">
                        <div className="flex items-start space-x-3">
                          {isInProgress && (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              className="mt-0.5"
                            >
                              <Loader2 className="w-4 h-4 text-indigo-500" />
                            </motion.div>
                          )}
                          <span className={cn(
                            "text-sm font-medium",
                            isComplete 
                              ? "text-gray-500 dark:text-gray-400 line-through" 
                              : "text-gray-900 dark:text-white"
                          )}>
                            {item.task}
                          </span>
                        </div>
                      </td>
                      
                      {/* Category badge */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                          config.color
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{config.label}</span>
                        </span>
                      </td>
                      
                      {/* Estimated lines */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          ~{item.estimatedLines}
                        </span>
                      </td>
                      
                      {/* Status indicator */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                          isComplete
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                            : isInProgress
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        )}>
                          {isComplete ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </>
                          ) : isInProgress ? (
                            <>
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>Building</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </>
                          )}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              
              {/* Empty state */}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center space-y-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isStreaming 
                          ? "✨ Analyzing your request and generating build plan..." 
                          : "Enter a prompt to see the build checklist"}
                      </p>
                    </motion.div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer note */}
        {items.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Each task generates ~200 lines of production-ready code</span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
