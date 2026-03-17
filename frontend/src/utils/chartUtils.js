export const getLayout = (theme, extra = {}) => {
  const isLight = theme === 'light';
  const textColor = isLight ? '#0f172a' : '#e2e8f0';
  const gridColor = isLight ? '#e2e8f0' : '#1a1a1a';
  const lineColor = isLight ? '#cbd5e1' : '#333';

  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: textColor, family: 'var(--font-family)', size: 10 },
    margin: { l: 52, r: 20, t: 32, b: 52 },
    template: isLight ? 'plotly_white' : 'plotly_dark',
    autosize: true,
    showlegend: true,
    legend: { font: { size: 9, color: textColor } },
    ...extra,
    xaxis: { 
      ...extra.xaxis, 
      gridcolor: gridColor, 
      linecolor: lineColor, 
      tickfont: { color: isLight ? '#64748b' : '#94a3b8' },
      title: { 
        text: extra.xaxis?.title?.text || extra.xaxis?.title || '',
        font: { color: textColor } 
      } 
    },
    yaxis: { 
      ...extra.yaxis, 
      gridcolor: gridColor, 
      linecolor: lineColor, 
      tickfont: { color: isLight ? '#64748b' : '#94a3b8' },
      title: { 
        text: extra.yaxis?.title?.text || extra.yaxis?.title || '',
        font: { color: textColor } 
      } 
    },
    yaxis2: { 
      ...extra.yaxis2, 
      gridcolor: gridColor, 
      linecolor: lineColor, 
      tickfont: { color: isLight ? '#64748b' : '#94a3b8' },
      title: { 
        text: extra.yaxis2?.title?.text || extra.yaxis2?.title || '',
        font: { color: textColor } 
      } 
    },
  };
};

export const ax = (theme, title) => ({ 
  title: { text: title }, 
  gridcolor: theme === 'light' ? '#e2e8f0' : '#1a1a1a', 
  zeroline: false, 
  linecolor: theme === 'light' ? '#cbd5e1' : '#333' 
})
