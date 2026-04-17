import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

const loadFromStorage = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; }
  catch { return fallback; }
};

export const SettingsProvider = ({ children }) => {
  const [textSize, setTextSize] = useState(() => parseFloat(loadFromStorage('textSize', '1.0')));
  const [theme, setTheme] = useState(() => loadFromStorage('theme', 'dark'));

  useEffect(() => {
    try { localStorage.setItem('textSize', textSize); } catch {}
    // Apply to root font-size so all rem-based and px-based text scales with it
    document.documentElement.style.fontSize = `${textSize * 14}px`;
    document.documentElement.style.setProperty('--font-scale', textSize);
  }, [textSize]);

  useEffect(() => {
    try { localStorage.setItem('theme', theme); } catch {}
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <SettingsContext.Provider value={{ textSize, setTextSize, theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};
