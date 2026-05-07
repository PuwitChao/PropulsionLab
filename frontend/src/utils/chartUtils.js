export const getLayout = (theme, extra = {}) => {
  const isLight = theme === 'light';
  
  // High-precision monochromatic colors
  const textColor = isLight ? '#0E0E0E' : '#FFFFFF';
  const mutedTextColor = isLight ? '#666666' : '#999999';
  const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
  const zeroLineColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const paperColor = 'rgba(0,0,0,0)'; // Always transparent, parent controls background

  return {
    paper_bgcolor: paperColor,
    plot_bgcolor: paperColor,
    font: { 
        color: textColor, 
        family: 'Inter, sans-serif', 
        size: 10 
    },
    margin: { l: 60, r: 20, t: 40, b: 60 },
    template: isLight ? 'plotly_white' : 'plotly_dark',
    autosize: true,
    showlegend: extra.showlegend ?? true,
    legend: { 
        font: { family: 'JetBrains Mono, monospace', size: 9, color: mutedTextColor },
        orientation: 'h',
        y: -0.2
    },
    hovermode: 'closest',
    ...extra,
    xaxis: { 
      ...extra.xaxis, 
      gridcolor: gridColor, 
      linecolor: zeroLineColor, 
      zeroline: false,
      tickfont: { family: 'JetBrains Mono, monospace', size: 9, color: mutedTextColor },
      title: { 
        text: extra.xaxis?.title?.text || extra.xaxis?.title || '',
        font: { family: 'Inter, sans-serif', size: 10, color: textColor, weight: 'bold' } 
      } 
    },
    yaxis: { 
      ...extra.yaxis, 
      gridcolor: gridColor, 
      linecolor: zeroLineColor, 
      zeroline: false,
      tickfont: { family: 'JetBrains Mono, monospace', size: 9, color: mutedTextColor },
      title: { 
        text: extra.yaxis?.title?.text || extra.yaxis?.title || '',
        font: { family: 'Inter, sans-serif', size: 10, color: textColor, weight: 'bold' } 
      } 
    },
    yaxis2: { 
      ...extra.yaxis2, 
      gridcolor: gridColor, 
      linecolor: zeroLineColor, 
      zeroline: false,
      tickfont: { family: 'JetBrains Mono, monospace', size: 9, color: mutedTextColor },
      title: { 
        text: extra.yaxis2?.title?.text || extra.yaxis2?.title || '',
        font: { family: 'Inter, sans-serif', size: 10, color: textColor, weight: 'bold' } 
      } 
    },
  };
};

