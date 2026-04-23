// FILE: store/useAuraStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { BuildSession, ChecklistItem, CodeChunk, AuraMessage, BuildStatus } from '@/lib/types';
import { auraAPI } from '@/lib/api/auraService';
import { AURA_CONFIG } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';

interface AuraState {
  // Core session state
  currentSession: BuildSession | null;
  sessions: BuildSession[];
  
  // UI state
  isBuilding: boolean;
  buildProgress: number; // 0-100
  activeTab: 'chat' | 'checklist' | 'code' | 'preview';
  isSidebarCollapsed: boolean;
  
  // Chat state
  messages: AuraMessage[];
  inputPrompt: string;
  isStreaming: boolean;
  
  // Actions
  createNewSession: (prompt: string) => Promise<void>;
  updateChecklistItem: (itemId: string, updates: Partial<ChecklistItem>) => void;
  addCodeChunk: (chunk: CodeChunk) => void;
  addMessage: (message: Omit<AuraMessage, 'id' | 'timestamp'>) => void;
  updateBuildStatus: (status: BuildStatus, progress?: number) => void;
  resetSession: () => void;
  toggleSidebar: () => void;
  setPreviewUrl: (url: string) => void;
  
  // Utilities
  getCurrentChecklist: () => ChecklistItem[];
  getCompleteCode: () => string;
  canResumeBuild: () => boolean;
}

export const useAuraStore = create<AuraState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        currentSession: null,
        sessions: [],
        isBuilding: false,
        buildProgress: 0,
        activeTab: 'chat',
        isSidebarCollapsed: false,
        messages: [
          {
            id: uuidv4(),
            role: 'assistant',
            content: "✨ Welcome to **Aura.ai** — the ultimate next-gen website builder. Describe your dream website, and I'll generate production-ready code with live preview. What would you like to build today?",
            timestamp: Date.now(),
          }
        ],
        inputPrompt: '',
        isStreaming: false,
        
        // Actions implementation
        createNewSession: async (prompt: string) => {
          const sessionId = uuidv4();
          const timestamp = Date.now();
          
          // Initialize session
          set((state) => {
            state.currentSession = {
              id: sessionId,
              prompt,
              status: 'comprehending',
              checklist: [],
              codeChunks: [],
              previewUrl: null,
              createdAt: timestamp,
              updatedAt: timestamp,
            };
            state.isBuilding = true;
            state.buildProgress = 5;
          });
          
          // Add user message
          get().addMessage({
            role: 'user',
            content: prompt,
          });
          
          try {
            // STEP 1: Generate checklist
            set((state) => {
              if (state.currentSession) {
                state.currentSession.status = 'planning';
                state.currentSession.updatedAt = Date.now();
              }
              state.buildProgress = 15;
            });
            
            const checklist = await auraAPI.generateChecklist(prompt);
            
            set((state) => {
              if (state.currentSession) {
                state.currentSession.checklist = checklist;
                state.currentSession.status = 'building';
                state.currentSession.updatedAt = Date.now();
              }
              state.buildProgress = 25;
              
              // Add assistant message with checklist summary
              state.messages.push({
                id: uuidv4(),
                role: 'assistant',
                content: `🎯 **Build Plan Created**\n\nI've analyzed your request and prepared a detailed checklist with ${checklist.length} tasks. Watch as I build your site in ${AURA_CONFIG.build.minChunks} intelligent chunks:`,
                timestamp: Date.now(),
                metadata: { checklistUpdate: checklist },
              });
            });
            
            // STEP 2: Stream code chunks (simulated with realistic delays)
            for (let i = 0; i < AURA_CONFIG.build.minChunks; i++) {
              set((state) => {
                state.isStreaming = true;
                state.buildProgress = 25 + (i * 10);
              });
              
              // Simulate network delay for realistic UX
              await new Promise(resolve => 
                setTimeout(resolve, AURA_CONFIG.build.streamDelay)
              );
              
              const chunk = await auraAPI.streamCodeChunk(sessionId, i);
              
              set((state) => {
                if (state.currentSession) {
                  state.currentSession.codeChunks.push(chunk);
                  state.currentSession.updatedAt = Date.now();
                  
                  // Update checklist progress
                  const pendingTasks = state.currentSession.checklist.filter(t => t.status === 'pending');
                  if (pendingTasks.length > 0 && i < pendingTasks.length) {
                    const taskIndex = i % pendingTasks.length;
                    state.currentSession.checklist[
                      state.currentSession.checklist.findIndex(t => t.status === 'pending')
                    ].status = 'in-progress';
                  }
                }
                
                // Add streaming message for UX feedback
                if (i % 2 === 0) {
                  state.messages.push({
                    id: uuidv4(),
                    role: 'assistant',
                    content: `✍️ Writing code chunk ${i + 1}/${AURA_CONFIG.build.minChunks}...`,
                    timestamp: Date.now(),
                    metadata: { codeChunk: chunk, buildProgress: 25 + (i * 10) },
                  });
                }
              });
            }
            
            // STEP 3: Finalize build
            set((state) => {
              if (state.currentSession) {
                state.currentSession.status = 'previewing';
                state.currentSession.previewUrl = `/preview/${sessionId}`;
                state.currentSession.updatedAt = Date.now();
                
                // Mark all checklist items as complete
                state.currentSession.checklist = state.currentSession.checklist.map(item => ({
                  ...item,
                  status: 'complete',
                  completedAt: Date.now(),
                }));
              }
              state.isStreaming = false;
              state.isBuilding = false;
              state.buildProgress = 100;
              
              // Final completion message
              state.messages.push({
                id: uuidv4(),
                role: 'assistant',
                content: `🎉 **Your Aura.ai website is ready!**\n\n✅ All ${AURA_CONFIG.build.minChunks} code chunks generated\n✅ ${get().getCurrentChecklist().length} tasks completed\n✅ Live preview active\n\n👉 Switch to the **Preview** tab to see your site in action. You can continue refining with more prompts!`,
                timestamp: Date.now(),
                metadata: { buildProgress: 100 },
              });
            });
            
            // Save session to history
            set((state) => {
              if (state.currentSession) {
                state.sessions = [state.currentSession, ...state.sessions.filter(s => s.id !== sessionId)].slice(0, 10);
              }
            });
            
          } catch (error: any) {
            console.error('[AuraStore] Build failed:', error);
            set((state) => {
              if (state.currentSession) {
                state.currentSession.status = 'error';
                state.currentSession.error = {
                  message: error.message || 'Build process interrupted',
                  recoverable: true,
                };
                state.currentSession.updatedAt = Date.now();
              }
              state.isBuilding = false;
              state.isStreaming = false;
              
              state.messages.push({
                id: uuidv4(),
                role: 'system',
                content: `⚠️ **Build interrupted**: ${error.message}\n\nDon't worry — your progress is saved. Try: 1) Check your connection 2) Simplify your prompt 3) Click "Retry" to continue.`,
                timestamp: Date.now(),
              });
            });
          }
        },
        
        updateChecklistItem: (itemId, updates) => set((state) => {
          if (state.currentSession) {
            const index = state.currentSession.checklist.findIndex(i => i.id === itemId);
            if (index !== -1) {
              state.currentSession.checklist[index] = {
                ...state.currentSession.checklist[index],
                ...updates,
                ...(updates.status === 'complete' && { completedAt: Date.now() }),
              };
              state.currentSession.updatedAt = Date.now();
            }
          }
        }),
        
        addCodeChunk: (chunk) => set((state) => {
          if (state.currentSession) {
            state.currentSession.codeChunks.push(chunk);
            state.currentSession.updatedAt = Date.now();
          }
        }),
        
        addMessage: (message) => set((state) => {
          state.messages.push({
            id: uuidv4(),
            timestamp: Date.now(),
            ...message,
          });
        }),
        
        updateBuildStatus: (status, progress) => set((state) => {
          if (state.currentSession) {
            state.currentSession.status = status;
            state.currentSession.updatedAt = Date.now();
          }
          if (progress !== undefined) state.buildProgress = progress;
          if (status === 'complete' || status === 'error') state.isBuilding = false;
        }),
        
        resetSession: () => set((state) => {
          state.currentSession = null;
          state.isBuilding = false;
          state.buildProgress = 0;
          state.isStreaming = false;
          // Keep messages for context but clear streaming indicators
          state.messages = state.messages.filter(m => m.role !== 'system' || !m.content.includes('interrupted'));
        }),
        
        toggleSidebar: () => set((state) => {
          state.isSidebarCollapsed = !state.isSidebarCollapsed;
        }),
        
        setPreviewUrl: (url) => set((state) => {
          if (state.currentSession) {
            state.currentSession.previewUrl = url;
            state.currentSession.updatedAt = Date.now();
          }
        }),
        
        // Utility getters
        getCurrentChecklist: () => {
          const session = get().currentSession;
          return session?.checklist || [];
        },
        
        getCompleteCode: () => {
          const session = get().currentSession;
          if (!session) return '';
          
          // Combine all chunks with proper ordering and separators
          return session.codeChunks
            .sort((a, b) => a.index - b.index)
            .map(chunk => {
              const separator = chunk.language === 'css' ? '\n\n/* --- */\n\n' : '\n\n// ---\n\n';
              return chunk.content + (chunk.isComplete ? '' : separator);
            })
            .join('');
        },
        
        canResumeBuild: () => {
          const session = get().currentSession;
          return session?.status === 'error' && session.error?.recoverable;
        },
      })),
      { name: 'aura-store-v1' }
    ),
    { name: 'AuraStore' }
  )
);
