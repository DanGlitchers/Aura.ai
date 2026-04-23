// FILE: lib/theme/ThemeEngine.tsx
'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Laptop, Palette } from 'lucide-react';
import { useEffect, useState, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

// Aura.ai Brand Colors & Design Tokens
export const AURA_THEME = {
  light: {
    background: 'bg-white',
    surface: 'bg-gray-50',
    text: 'text-gray-900',
    textMuted: 'text-gray-600',
    border: 'border-gray-200',
    accent: {
      primary: 'from-indigo-600 to-purple-600',
      primaryHover: 'from-indigo-700 to-purple-700',
      text: 'text-indigo-600',
    },
  },
  dark: {
    background: 'bg-gray-950',
    surface: 'bg-gray-900',
    text: 'text-gray-100',
    textMuted: 'text-gray-400',
    border: 'border-gray-800',
    accent: {
      primary: 'from-indigo-500 to-purple-500',
      primaryHover: 'from-indigo-400 to-purple-400',
      text: 'text-indigo-400',
    },
  },
  gradients: [
    'from-indigo-500 via-purple-500 to-pink-500',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-amber-500 via-orange-500 to-rose-500',
    'from-violet-500 via-fuchsia-500 to-pink-500',
  ],
  animations: {
    entrance: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } },
    scale: { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } },
    pulse: { animate: { scale: [1, 1.05, 1] }, transition: { duration: 2, repeat: Infinity } },
  },
} as const;

type ThemeMode = 'light' | 'dark' | 'system';
type GradientPreset = (typeof AURA_THEME.gradients)[number];

interface ThemeContextType {
  theme: ThemeMode;
  gradient: GradientPreset;
  setTheme: (mode: ThemeMode) => void;
  setGradient: (preset: GradientPreset) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function AuraThemeProvider({ children }: { children: React.ReactNode }) {
  const [gradient, setGradient] = useState<GradientPreset>(AURA_THEME.gradients[0]);
  
  // Apply gradient as CSS variable for global access
  useEffect(() => {
    document.documentElement.style.setProperty('--aura-gradient', gradient);
  }, [gradient]);

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeContext.Provider value={{ 
        theme: 'system', // Will be resolved by next-themes
        gradient, 
        setTheme: () => {}, // Wrapped below
        setGradient,
        toggleTheme: () => {}, // Wrapped below
      }}>
        {/* Global CSS Variables Injection */}
        <style jsx global>{`
          :root {
            --aura-gradient: ${gradient};
            --aura-radius: 0.75rem;
            --aura-shadow: 0 10px 40px -10px rgba(99, 102, 241, 0.3);
          }
          .dark {
            --aura-shadow: 0 10px 40px -10px rgba(99, 102, 241, 0.5);
          }
          @media (prefers-reduced-motion: reduce) {
            * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
          }
        `}</style>
        {children}
      </ThemeContext.Provider>
    </NextThemesProvider>
  );
}

export function useAuraTheme() {
  const context = useContext(ThemeContext);
  const { theme, setTheme: nextSetTheme } = useTheme();
  
  if (!context) throw new Error('useAuraTheme must be used within AuraThemeProvider');
  
  return {
    ...context,
    theme: theme as ThemeMode,
    setTheme: nextSetTheme,
    toggleTheme: () => nextSetTheme(theme === 'dark' ? 'light' : 'dark'),
  };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useAuraTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return <div className={cn("w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse", className)} />;

  const icons = {
    light: <Sun className="w-4.5 h-4.5 text-amber-500" />,
    dark: <Moon className="w-4.5 h-4.5 text-indigo-400" />,
    system: <Laptop className="w-4.5 h-4.5 text-gray-500" />,
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={cn(
        "relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
        "border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition-all duration-200",
        className
      )}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ opacity: 0, rotate: -15 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 15 }}
          transition={{ duration: 0.15 }}
        >
          {icons[theme as keyof typeof icons]}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}

export function GradientSelector({ className }: { className?: string }) {
  const { gradient, setGradient } = useAuraTheme();
  
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Palette className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <div className="flex space-x-1.5">
        {AURA_THEME.gradients.map((preset) => (
          <motion.button
            key={preset}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setGradient(preset)}
            className={cn(
              "w-5 h-5 rounded-full bg-gradient-to-br transition-all duration-200 ring-2 ring-offset-2 dark:ring-offset-gray-900",
              preset,
              gradient === preset 
                ? "ring-indigo-500 scale-110" 
                : "ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600"
            )}
            aria-label={`Select ${preset} gradient`}
          />
        ))}
      </div>
    </div>
  );
}
