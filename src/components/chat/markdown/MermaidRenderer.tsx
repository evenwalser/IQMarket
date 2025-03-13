
import React, { useEffect } from 'react';
// Import mermaid as a type only import to prevent runtime issues
import type { default as Mermaid } from 'mermaid';

export const MermaidRenderer: React.FC = () => {
  useEffect(() => {
    const diagrams = document.querySelectorAll('.mermaid-diagram');
    if (diagrams.length > 0 && typeof window !== 'undefined') {
      // Dynamically import mermaid if needed
      import('mermaid').then((mermaidModule) => {
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: true,
          theme: 'neutral',
          securityLevel: 'loose'
        });
        
        diagrams.forEach((diagram) => {
          const diagramId = diagram.getAttribute('data-diagram-id');
          const diagramContent = decodeURIComponent(diagram.getAttribute('data-diagram-content') || '');
          
          try {
            mermaid.render(diagramId || 'mermaid', diagramContent).then(({ svg }) => {
              diagram.innerHTML = svg;
            });
          } catch (error) {
            console.error('Failed to render mermaid diagram:', error);
          }
        });
      }).catch((error) => {
        console.error('Failed to load mermaid:', error);
      });
    }
  }, []);

  return null;
};
