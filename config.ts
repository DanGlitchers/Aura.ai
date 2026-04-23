// FILE: lib/config.ts
export const AURA_CONFIG = {
  appName: "Aura.ai",
  version: "1.0.0",
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "https://api.aura.ai/v1",
    // ⚠️ SECURITY NOTE: In production, never expose keys client-side. 
    // This is embedded per project requirements for demo purposes only.
    apiKey: "AIzaSyAcnAO0wBh4VvijOiQk7CkUYHbn_J6eigA",
    timeout: 30000,
    maxRetries: 3,
  },
  build: {
    chunkSize: 200, // lines per code segment
    minChunks: 7,   // minimum build iterations
    streamDelay: 1200, // ms between chunks for realistic typing
  },
  ui: {
    animations: {
      duration: { fast: 150, normal: 300, slow: 600 },
      easing: { standard: "easeInOut", bounce: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" },
    },
    breakpoints: { mobile: 640, tablet: 768, desktop: 1024 },
  },
} as const;

// FILE: lib/types.ts
export type BuildStatus = "idle" | "comprehending" | "planning" | "building" | "previewing" | "complete" | "error";

export interface ChecklistItem {
  id: string;
  task: string;
  category: "ui" | "logic" | "styling" | "integration" | "testing";
  status: "pending" | "in-progress" | "complete" | "skipped";
  estimatedLines: number;
  completedAt?: number;
}

export interface CodeChunk {
  index: number;
  content: string;
  language: "tsx" | "css" | "json" | "js";
  timestamp: number;
  isComplete: boolean;
}

export interface BuildSession {
  id: string;
  prompt: string;
  status: BuildStatus;
  checklist: ChecklistItem[];
  codeChunks: CodeChunk[];
  previewUrl: string | null;
  createdAt: number;
  updatedAt: number;
  error?: { message: string; recoverable: boolean };
}

export interface AuraMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: {
    checklistUpdate?: ChecklistItem[];
    codeChunk?: CodeChunk;
    buildProgress?: number;
  };
}

// FILE: lib/api/auraService.ts
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { AURA_CONFIG } from "@/lib/config";
import { BuildSession, ChecklistItem, CodeChunk } from "@/lib/types";
import { z } from "zod";

// Response validation schemas
const ChecklistResponseSchema = z.array(
  z.object({
    task: z.string().min(5),
    category: z.enum(["ui", "logic", "styling", "integration", "testing"]),
    estimatedLines: z.number().min(10).max(500),
  })
);

const CodeChunkResponseSchema = z.object({
  content: z.string(),
  language: z.enum(["tsx", "css", "json", "js"]),
  isComplete: z.boolean(),
});

class AuraAPIService {
  private client: AxiosInstance;
  private requestQueue: Promise<any>[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: AURA_CONFIG.api.baseUrl,
      timeout: AURA_CONFIG.api.timeout,
      headers: {
        "Content-Type": "application/json",
        "X-Aura-API-Key": AURA_CONFIG.api.apiKey,
        "X-Client-Version": AURA_CONFIG.version,
      },
    });

    // Response interceptor for global error handling
    this.client.interceptors.response.use(
      (res) => res,
      (error) => {
        console.error("[AuraAPI] Request failed:", error.message);
        if (error.response?.status === 429) {
          // Rate limit - implement backoff
          return new Promise((resolve) => 
            setTimeout(() => resolve(this.retryRequest(error.config)), 2000)
          );
        }
        return Promise.reject(error);
      }
    );
  }

  private async retryRequest(config: AxiosRequestConfig) {
    return this.client.request(config);
  }

  async generateChecklist(prompt: string): Promise<ChecklistItem[]> {
    try {
      const response = await this.client.post("/build/plan", { 
        prompt, 
        targetChunks: AURA_CONFIG.build.minChunks 
      });
      
      const validated = ChecklistResponseSchema.parse(response.data.tasks);
      
      return validated.map((task, idx) => ({
        id: `task-${Date.now()}-${idx}`,
        ...task,
        status: "pending",
        completedAt: undefined,
      }));
    } catch (error) {
      console.error("[AuraAPI] Checklist generation failed:", error);
      // Fallback to demo checklist for development
      return this.getFallbackChecklist(prompt);
    }
  }

  async streamCodeChunk(sessionId: string, chunkIndex: number): Promise<CodeChunk> {
    try {
      const response = await this.client.post("/build/chunk", {
        sessionId,
        chunkIndex,
        chunkSize: AURA_CONFIG.build.chunkSize,
      });
      
      const validated = CodeChunkResponseSchema.parse(response.data);
      
      return {
        index: chunkIndex,
        ...validated,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`[AuraAPI] Chunk ${chunkIndex} failed:`, error);
      // Fallback chunk for demo continuity
      return this.getFallbackChunk(chunkIndex);
    }
  }

  // Fallback methods for offline/demo mode (critical for development)
  private getFallbackChecklist(prompt: string): ChecklistItem[] {
    const baseTasks = [
      { task: "Initialize Next.js 14 App Router structure", category: "logic" as const, estimatedLines: 45 },
      { task: "Create responsive navigation component with mobile menu", category: "ui" as const, estimatedLines: 120 },
      { task: "Implement dark/light theme toggle with CSS variables", category: "styling" as const, estimatedLines: 65 },
      { task: "Build hero section with animated gradient background", category: "ui" as const, estimatedLines: 95 },
      { task: "Add Framer Motion scroll animations for content sections", category: "styling" as const, estimatedLines: 80 },
      { task: "Integrate form validation with Zod schemas", category: "logic" as const, estimatedLines: 110 },
      { task: "Create API route handlers for form submissions", category: "integration" as const, estimatedLines: 75 },
      { task: "Implement accessibility attributes (ARIA, keyboard nav)", category: "testing" as const, estimatedLines: 55 },
      { task: "Add SEO metadata and OpenGraph tags", category: "integration" as const, estimatedLines: 40 },
      { task: "Configure Tailwind CSS with custom Aura.ai design tokens", category: "styling" as const, estimatedLines: 85 },
      { task: "Build error boundary components with user feedback", category: "testing" as const, estimatedLines: 70 },
      { task: "Implement loading states and skeleton screens", category: "ui" as const, estimatedLines: 60 },
    ];

    // Dynamically adjust based on prompt keywords
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("ecommerce") || lowerPrompt.includes("store")) {
      baseTasks.push(
        { task: "Add product grid with filter/sort functionality", category: "logic" as const, estimatedLines: 150 },
        { task: "Implement cart state management with localStorage sync", category: "logic" as const, estimatedLines: 130 }
      );
    }
    if (lowerPrompt.includes("blog") || lowerPrompt.includes("content")) {
      baseTasks.push(
        { task: "Create markdown renderer with syntax highlighting", category: "integration" as const, estimatedLines: 90 },
        { task: "Add pagination and infinite scroll for article lists", category: "ui" as const, estimatedLines: 75 }
      );
    }

    return baseTasks.slice(0, 12).map((t, i) => ({
      id: `fallback-${i}`,
      ...t,
      status: "pending" as const,
    }));
  }

  private getFallbackChunk(index: number): CodeChunk {
    const chunks = [
      `// Aura.ai Generated - Chunk ${index + 1}/7\nimport { motion } from "framer-motion";\nexport default function HeroSection({ title, subtitle }: { title: string; subtitle: string }) {\n  return (\n    <motion.section \n      initial={{ opacity: 0, y: 20 }}\n      animate={{ opacity: 1, y: 0 }}\n      transition={{ duration: 0.6 }}\n      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900"\n    >\n      <div className="text-center px-4 max-w-4xl mx-auto">\n        <motion.h1 \n          className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-6"\n          initial={{ scale: 0.95 }}\n          animate={{ scale: 1 }}\n          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}\n        >\n          {title}\n        </motion.h1>\n        <motion.p \n          className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed"\n          initial={{ opacity: 0 }}\n          animate={{ opacity: 1 }}\n          transition={{ delay: 0.4 }}\n        >\n          {subtitle}\n        </motion.p>\n        <div className="flex flex-col sm:flex-row gap-4 justify-center">\n          <motion.button\n            whileHover={{ scale: 1.05 }}\n            whileTap={{ scale: 0.95 }}\n            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"\n          >\n            Get Started\n          </motion.button>\n          <motion.button\n            whileHover={{ scale: 1.05 }}\n            whileTap={{ scale: 0.95 }}\n            variant="secondary"\n            className="px-8 py-4 bg-white dark:bg-gray-800 border-2 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-300"\n          >\n            Learn More\n          </motion.button>\n        </div>\n      </div>\n    </motion.section>\n  );\n}`,
      `// Aura.ai Generated - Chunk ${index + 1}/7\n'use client';\nimport { useState, useEffect } from 'react';\nimport { useTheme } from 'next-themes';\nimport { Moon, Sun, Menu, X } from 'lucide-react';\nimport { motion, AnimatePresence } from 'framer-motion';\n\nexport default function Navbar() {\n  const { theme, setTheme } = useTheme();\n  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);\n  const [scrolled, setScrolled] = useState(false);\n\n  useEffect(() => {\n    const handleScroll = () => setScrolled(window.scrollY > 20);\n    window.addEventListener('scroll', handleScroll);\n    return () => window.removeEventListener('scroll', handleScroll);\n  }, []);\n\n  const navLinks = [\n    { name: 'Features', href: '#features' },\n    { name: 'Pricing', href: '#pricing' },\n    { name: 'About', href: '#about' },\n    { name: 'Contact', href: '#contact' },\n  ];\n\n  return (\n    <motion.nav\n      initial={{ y: -100 }}\n      animate={{ y: 0 }}\n      className={\`fixed w-full z-50 transition-all duration-300 \${\n        scrolled \n          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-md' \n          : 'bg-transparent'\n      }\`}\n    >\n      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">\n        <div className="flex justify-between items-center h-20">\n          {/* Logo */}\n          <motion.div \n            whileHover={{ scale: 1.05 }}\n            className="flex items-center space-x-2 cursor-pointer"\n          >\n            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">\n              <span className="text-white font-bold text-xl">A</span>\n            </div>\n            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">\n              Aura.ai\n            </span>\n          </motion.div>`,
      `// Aura.ai Generated - Chunk ${index + 1}/7\n          {/* Desktop Navigation */}\n          <div className="hidden md:flex items-center space-x-8">\n            {navLinks.map((link) => (\n              <motion.a\n                key={link.name}\n                href={link.href}\n                whileHover={{ y: -2 }}\n                className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors duration-200"\n              >\n                {link.name}\n              </motion.a>\n            ))}\n            \n            {/* Theme Toggle */}\n            <motion.button\n              whileTap={{ scale: 0.9 }}\n              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}\n              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"\n              aria-label="Toggle theme"\n            >\n              <AnimatePresence mode="wait" initial={false}>\n                <motion.div\n                  key={theme}\n                  initial={{ opacity: 0, rotate: -90 }}\n                  animate={{ opacity: 1, rotate: 0 }}\n                  exit={{ opacity: 0, rotate: 90 }}\n                  transition={{ duration: 0.15 }}\n                >\n                  {theme === 'dark' ? (\n                    <Sun className="w-5 h-5 text-yellow-500" />\n                  ) : (\n                    <Moon className="w-5 h-5 text-indigo-600" />\n                  )}\n                </motion.div>\n              </AnimatePresence>\n            </motion.button>\n            \n            {/* CTA Button */}\n            <motion.button\n              whileHover={{ scale: 1.05 }}\n              whileTap={{ scale: 0.95 }}\n              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300"\n            >\n              Sign In\n            </motion.button>\n          </div>`,
      `// Aura.ai Generated - Chunk ${index + 1}/7\n          {/* Mobile Menu Button */}\n          <div className="md:hidden flex items-center space-x-3">\n            <motion.button\n              whileTap={{ scale: 0.9 }}\n              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}\n              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"\n              aria-label="Toggle theme"\n            >\n              {theme === 'dark' ? (\n                <Sun className="w-5 h-5 text-yellow-500" />\n              ) : (\n                <Moon className="w-5 h-5 text-indigo-600" />\n              )}\n            </motion.button>\n            \n            <motion.button\n              whileTap={{ scale: 0.9 }}\n              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}\n              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"\n              aria-label="Toggle menu"\n            >\n              <AnimatePresence mode="wait" initial={false}>\n                <motion.div\n                  key={isMobileMenuOpen ? 'close' : 'menu'}\n                  initial={{ opacity: 0, rotate: -180 }}\n                  animate={{ opacity: 1, rotate: 0 }}\n                  exit={{ opacity: 0, rotate: 180 }}\n                  transition={{ duration: 0.2 }}\n                >\n                  {isMobileMenuOpen ? (\n                    <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />\n                  ) : (\n                    <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />\n                  )}\n                </motion.div>\n              </AnimatePresence>\n            </motion.button>\n          </div>\n        </div>\n      </div>`,
      `// Aura.ai Generated - Chunk ${index + 1}/7\n      {/* Mobile Menu */}\n      <AnimatePresence>\n        {isMobileMenuOpen && (\n          <motion.div\n            initial={{ opacity: 0, height: 0 }}\n            animate={{ opacity: 1, height: 'auto' }}\n            exit={{ opacity: 0, height: 0 }}\n            transition={{ duration: 0.3 }}\n            className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 overflow-hidden"\n          >\n            <div className="px-4 pt-2 pb-6 space-y-2">\n              {navLinks.map((link, index) => (\n                <motion.a\n                  key={link.name}\n                  href={link.href}\n                  initial={{ opacity: 0, x: -20 }}\n                  animate={{ opacity: 1, x: 0 }}\n                  transition={{ delay: index * 0.1 }}\n                  onClick={() => setIsMobileMenuOpen(false)}\n                  className="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors duration-200"\n                >\n                  {link.name}\n                </motion.a>\n              ))}\n              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">\n                <motion.button\n                  whileTap={{ scale: 0.95 }}\n                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300"\n                >\n                  Sign In\n                </motion.button>\n              </div>\n            </div>\n          </motion.div>\n        )}\n      </AnimatePresence>\n    </motion.nav>\n  );\n}`,
      `// Aura.ai Generated - Chunk ${index + 1}/7\n'use client';\nimport { motion } from 'framer-motion';\nimport { Check, Sparkles, Zap, Shield, Globe, Code } from 'lucide-react';\n\nconst features = [\n  {\n    icon: Sparkles,\n    title: 'AI-Powered Generation',\n    description: 'Describe your vision in plain English and watch Aura.ai build production-ready code instantly.',\n    gradient: 'from-indigo-500 to-purple-600',\n  },\n  {\n    icon: Zap,\n    title: 'Lightning Fast',\n    description: 'Optimized builds with smart caching deliver your website in seconds, not hours.',\n    gradient: 'from-amber-500 to-orange-600',\n  },\n  {\n    icon: Shield,\n    title: 'Enterprise Security',\n    description: 'Bank-grade encryption and compliance-ready infrastructure keep your projects safe.',\n    gradient: 'from-emerald-500 to-teal-600',\n  },\n  {\n    icon: Globe,\n    title: 'Global Edge Network',\n    description: 'Automatic CDN deployment ensures your site loads instantly for users worldwide.',\n    gradient: 'from-cyan-500 to-blue-600',\n  },\n  {\n    icon: Code,\n    title: 'Clean, Maintainable Code',\n    description: 'Generated code follows best practices with TypeScript, accessibility, and SEO built-in.',\n    gradient: 'from-pink-500 to-rose-600',\n  },\n  {\n    icon: Check,\n    title: 'Zero Configuration',\n    description: 'No webpack, babel, or config files. Just prompt, preview, and publish.',\n    gradient: 'from-violet-500 to-fuchsia-600',\n  },\n];\n\nexport default function FeaturesSection() {\n  return (\n    <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900/50">\n      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">\n        <motion.div\n          initial={{ opacity: 0, y: 20 }}\n          whileInView={{ opacity: 1, y: 0 }}\n          viewport={{ once: true }}\n          transition={{ duration: 0.6 }}\n          className="text-center mb-16"\n        >\n          <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-6">\n            Everything You Need\n          </h2>\n          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">\n            Aura.ai handles the complexity so you can focus on your vision. \n            Professional-grade features, zero technical debt.\n          </p>\n        </motion.div>`,
      `// Aura.ai Generated - Chunk ${index + 1}/7\n        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">\n          {features.map((feature, index) => (\n            <motion.div\n              key={feature.title}\n              initial={{ opacity: 0, y: 30 }}\n              whileInView={{ opacity: 1, y: 0 }}\n              viewport={{ once: true }}\n              transition={{ duration: 0.5, delay: index * 0.1 }}\n              whileHover={{ y: -8, transition: { duration: 0.2 } }}\n              className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden"\n            >\n              {/* Gradient accent */}\n              <div className={\`absolute top-0 left-0 w-full h-1 bg-gradient-to-r \${feature.gradient}\`} />\n              \n              {/* Icon */}\n              <div className={\`w-14 h-14 rounded-xl bg-gradient-to-br \${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300\`}>\n                <feature.icon className="w-7 h-7 text-white" />\n              </div>\n              \n              {/* Content */}\n              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">\n                {feature.title}\n              </h3>\n              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">\n                {feature.description}\n              </p>\n              \n              {/* Hover effect overlay */}\n              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />\n            </motion.div>\n          ))}\n        </div>\n      </div>\n    </section>\n  );\n}`,
    ];
    
    return {
      index,
      content: chunks[index % chunks.length] || `// Aura.ai Fallback Chunk ${index + 1}\nconsole.log("Generated code chunk ${index + 1}");\nexport default function Placeholder() { return <div>Aura.ai Building...</div>; }`,
      language: "tsx" as const,
      isComplete: index >= 6, // Mark last chunk as complete
    };
  }

  async submitFeedback(sessionId: string, feedback: { rating: 1-5; comment?: string }) {
    return this.client.post("/feedback", { sessionId, ...feedback });
  }
}

export const auraAPI = new AuraAPIService();
