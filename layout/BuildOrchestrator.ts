// FILE: lib/orchestrator/BuildOrchestrator.ts
import { BuildSession, ChecklistItem, CodeChunk, BuildStatus } from '@/lib/types';
import { auraAPI } from '@/lib/api/auraService';
import { AURA_CONFIG } from '@/lib/config';

/**
 * BuildOrchestrator: Core state machine controller for Aura.ai build pipeline
 * Manages the sequence: Prompt → Checklist → Chunked Code → Preview → Feedback
 */
export class BuildOrchestrator {
  private session: BuildSession;
  private abortController: AbortController | null = null;
  private chunkQueue: number[] = [];
  private progressCallbacks: ((progress: number) => void)[] = [];

  constructor(initialPrompt: string) {
    this.session = {
      id: crypto.randomUUID(),
      prompt: initialPrompt,
      status: 'idle',
      checklist: [],
      codeChunks: [],
      previewUrl: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  // Subscribe to progress updates
  onProgress(callback: (progress: number) => void) {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyProgress(progress: number) {
    this.progressCallbacks.forEach(cb => cb(progress));
  }

  // Main build sequence
  async executeBuild(): Promise<BuildSession> {
    try {
      this.abortController = new AbortController();
      
      // Phase 1: Comprehension & Planning
      await this.runPhase('comprehending', 10, async () => {
        await this.simulateAIProcessing(800);
      });
      
      // Phase 2: Checklist Generation
      const checklist = await this.runPhase('planning', 25, async () => {
        return await auraAPI.generateChecklist(this.session.prompt);
      });
      this.session.checklist = checklist;
      
      // Phase 3: Chunked Code Generation (7 iterations minimum)
      await this.runPhase('building', 85, async (updateProgress) => {
        for (let i = 0; i < AURA_CONFIG.build.minChunks; i++) {
          if (this.abortController?.signal.aborted) throw new Error('Build cancelled');
          
          // Update checklist status
          this.updateChecklistProgress(i, checklist.length);
          
          // Stream code chunk
          const chunk = await auraAPI.streamCodeChunk(this.session.id, i);
          this.session.codeChunks.push(chunk);
          this.session.updatedAt = Date.now();
          
          // Progress update
          const chunkProgress = 25 + Math.round((i + 1) / AURA_CONFIG.build.minChunks * 60);
          updateProgress(chunkProgress);
          
          // Realistic delay between chunks
          if (i < AURA_CONFIG.build.minChunks - 1) {
            await this.simulateAIProcessing(AURA_CONFIG.build.streamDelay);
          }
        }
      });
      
      // Phase 4: Preview Preparation
      await this.runPhase('previewing', 95, async () => {
        this.session.previewUrl = `/preview/${this.session.id}`;
        // Mark all tasks complete
        this.session.checklist = this.session.checklist.map(item => ({
          ...item,
          status: 'complete',
          completedAt: Date.now(),
        }));
      });
      
      // Phase 5: Completion
      this.session.status = 'complete';
      this.session.updatedAt = Date.now();
      this.notifyProgress(100);
      
      return this.session;
      
    } catch (error: any) {
      console.error('[BuildOrchestrator] Build failed:', error);
      this.session.status = 'error';
      this.session.error = {
        message: error.message || 'Unexpected build error',
        recoverable: error.name !== 'CriticalBuildError',
      };
      this.session.updatedAt = Date.now();
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  // Helper: Run a build phase with progress tracking
  private async runPhase<T>(
    status: BuildStatus, 
    targetProgress: number, 
    executor: (updateProgress: (p: number) => void) => Promise<T>
  ): Promise<T> {
    this.session.status = status;
    const startProgress = this.session.status === 'idle' ? 0 : 25;
    
    // Smooth progress animation to target
    const updateProgress = (progress: number) => {
      const clamped = Math.min(progress, targetProgress);
      this.notifyProgress(clamped);
    };
    
    // Animate progress from current to target
    this.animateProgress(startProgress, targetProgress - 5);
    
    try {
      const result = await executor(updateProgress);
      this.animateProgress(targetProgress - 5, targetProgress);
      return result;
    } catch (error) {
      this.notifyProgress(startProgress); // Reset on error
      throw error;
    }
  }

  // Helper: Smooth progress animation
  private animateProgress(from: number, to: number, duration = 400) {
    const start = performance.now();
    const step = (timestamp: number) => {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(from + (to - from) * eased);
      this.notifyProgress(current);
      
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Helper: Simulate AI processing delay with variability
  private async simulateAIProcessing(baseMs: number) {
    const variability = baseMs * 0.3;
    const delay = baseMs + (Math.random() - 0.5) * variability;
    return new Promise(resolve => setTimeout(resolve, Math.max(200, delay)));
  }

  // Helper: Update checklist items as building progresses
  private updateChecklistProgress(chunkIndex: number, totalTasks: number) {
    const taskIndex = Math.min(chunkIndex, totalTasks - 1);
    if (this.session.checklist[taskIndex]?.status === 'pending') {
      this.session.checklist[taskIndex].status = 'in-progress';
    }
    // Mark previous tasks as complete
    for (let i = 0; i < taskIndex; i++) {
      if (this.session.checklist[i]?.status === 'in-progress') {
        this.session.checklist[i] = {
          ...this.session.checklist[i],
          status: 'complete',
          completedAt: Date.now(),
        };
      }
    }
  }

  // Public API: Cancel ongoing build
  cancel() {
    this.abortController?.abort();
    this.session.status = 'error';
    this.session.error = { message: 'Build cancelled by user', recoverable: true };
    this.notifyProgress(0);
  }

  // Public API: Get current session state
  getSession(): BuildSession {
    return { ...this.session };
  }

  // Public API: Resume from error state
  async resume(): Promise<BuildSession> {
    if (!this.session.error?.recoverable) {
      throw new Error('Build cannot be resumed');
    }
    this.session.error = undefined;
    return this.executeBuild();
  }
}
