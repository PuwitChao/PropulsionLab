import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [textSize, setTextSize] = useState(parseFloat(localStorage.getItem('textSize')) || 1.0);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('textSize', textSize);
    document.documentElement.style.setProperty('--font-scale', textSize);
  }, [textSize]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <SettingsContext.Provider value={{ textSize, setTextSize, theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};
