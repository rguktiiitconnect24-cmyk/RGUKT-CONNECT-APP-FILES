import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'light';
  });

  const [activeTheme, setActiveTheme] = useState(() => {
    let mode = localStorage.getItem('themeMode') || 'light';
    if (mode === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode === 'dark' ? 'dark' : 'light';
  });

  const applyTheme = useCallback(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let resolvedTheme = themeMode;
    
    if (themeMode === 'system') {
      resolvedTheme = mediaQuery.matches ? 'dark' : 'light';
    } else if (themeMode !== 'light' && themeMode !== 'dark') {
      // Safety reset for removed themes (OLED, Sunset)
      setThemeMode('light');
      resolvedTheme = 'light';
    }
    
    const root = window.document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    setActiveTheme(resolvedTheme);
    
    localStorage.setItem('themeMode', themeMode);
    localStorage.setItem('theme', resolvedTheme);
  }, [themeMode]);

  useEffect(() => {
    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'system') {
        applyTheme();
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, applyTheme]);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      // Simple toggle between light and dark if using the toggle button
      const currentActive = prev === 'system' ? activeTheme : prev;
      return currentActive === 'light' ? 'dark' : 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ 
      theme: activeTheme, 
      themeMode, 
      setThemeMode, 
      toggleTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
