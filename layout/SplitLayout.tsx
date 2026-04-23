// FILE: components/layout/SplitLayout.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight, LayoutGrid, Code2, MessageSquare, ListChecks } from 'lucide-react';
import { useAuraStore } from '@/store/useAuraStore';
import { cn } from '@/lib/utils';

interface SplitLayoutProps {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
  previewContent: React.ReactNode;
}

type TabType = 'chat' | 'checklist' | 'code' | 'preview';

const tabConfig: Record<TabType, { icon: any; label: string; description: string }> = {
  chat: { icon: MessageSquare, label: 'Chat', description: 'Interact with Aura.ai' },
  checklist: { icon: ListChecks, label: 'Checklist', description: 'Track build progress' },
  code: { icon: Code2, label: 'Code', description: 'View generated source' },
  preview: { icon: LayoutGrid, label: 'Preview', description: 'Live site preview' },
};

export default function SplitLayout({ children, sidebarContent, previewContent }: SplitLayoutProps) {
  const { activeTab, setActiveTab, isSidebarCollapsed, toggleSidebar, isBuilding } = useAuraStore();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-950"
    >
      {/* Collapsed sidebar toggle (mobile/desktop) */}
      <AnimatePresence>
        {isSidebarCollapsed && (
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <PanelGroup direction="horizontal" autoSaveId="aura-layout">
        <Panel 
          minSize={20} 
          maxSize={45} 
          defaultSize={30}
          className={cn(
            "flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300",
            isSidebarCollapsed && "hidden"
          )}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                Aura.ai
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </motion.button>
          </div>

          {/* Tab Navigation */}
          <nav className="px-3 py-2 space-y-1 border-b border-gray-200 dark:border-gray-800">
            {(Object.keys(tabConfig) as TabType[]).map((tab) => {
              const { icon: Icon, label, description } = tabConfig[tab];
              const isActive = activeTab === tab;
              
              return (
                <motion.button
                  key={tab}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                    isActive 
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm" 
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <Icon className={cn("w-4.5 h-4.5 flex-shrink-0", isActive && "text-indigo-500")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", isActive && "text-indigo-700 dark:text-indigo-300")}>
                      {label}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{description}</p>
                  </div>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabIndicator"
                      className="w-1.5 h-1.5 rounded-full bg-indigo-500" 
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* Sidebar Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {sidebarContent}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Aura.ai v1.0</span>
              <span className={cn(
                "flex items-center space-x-1",
                isBuilding && "text-indigo-600 dark:text-indigo-400 animate-pulse"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", isBuilding ? "bg-indigo-500" : "bg-emerald-500")} />
                <span>{isBuilding ? 'Building' : 'Ready'}</span>
              </span>
            </div>
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-indigo-400 dark:hover:bg-indigo-600 transition-colors cursor-col-resize group">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-300 dark:bg-gray-700 group-hover:bg-indigo-500 rounded-full transition-colors" />
        </PanelResizeHandle>

        {/* Main Content Panel (Preview + Code) */}
        <Panel minSize={55} defaultSize={70} className="flex flex-col bg-gray-100 dark:bg-gray-950">
          {previewContent}
          {children}
        </Panel>
      </PanelGroup>
    </motion.div>
  );
}
