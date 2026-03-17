import React from 'react';
import { useSettings } from '../context/SettingsContext';

export default function Settings() {
  const { textSize, setTextSize, theme, setTheme } = useSettings();

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>User Settings</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Configure your workspace environment and display preferences.
          </p>
      </header>

      <section className="card" style={{ maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Visual Preferences</h3>
        
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Interface Theme
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setTheme('dark')}
              style={{ 
                flex: 1, padding: '1rem', borderRadius: '8px', cursor: 'pointer',
                background: theme === 'dark' ? 'var(--accent-color)' : 'var(--bg-color)',
                color: theme === 'dark' ? 'var(--bg-color)' : 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                fontWeight: 700, transition: 'all 0.2s'
              }}
            >
              DARK MODE
            </button>
            <button 
              onClick={() => setTheme('light')}
              style={{ 
                flex: 1, padding: '1rem', borderRadius: '8px', cursor: 'pointer',
                background: theme === 'light' ? 'var(--accent-color)' : 'var(--bg-color)',
                color: theme === 'light' ? 'var(--bg-color)' : 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                fontWeight: 700, transition: 'all 0.2s'
              }}
            >
              LIGHT MODE
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              Text Scaling
            </label>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {Math.round(textSize * 100)}%
            </span>
          </div>
          <input 
            type="range" 
            min="0.8" 
            max="1.5" 
            step="0.05" 
            value={textSize} 
            onChange={(e) => setTextSize(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Compact</span>
            <span>Standard</span>
            <span>Large</span>
          </div>
        </div>
      </section>

      <section className="card" style={{ maxWidth: '600px', opacity: 0.6 }}>
        <h3 style={{ marginBottom: '1rem' }}>User Control (Coming Soon)</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Future updates will include cloud synchronization, saved analysis profiles, and project collaboration features.
        </p>
        <button disabled className="button-primary" style={{ width: '100%', opacity: 0.5 }}>
          SIGN IN TO PROPULSION_LAB
        </button>
      </section>
    </div>
  );
}
