const fs = require('fs');
let content = fs.readFileSync('src/components/views/InfographicsEditorView.tsx', 'utf8');

content = content.replace(
  /const \[zoomLevel, setZoomLevel\] = useState\(1\);/,
  `const [zoomLevel, setZoomLevel] = useState(1);
  
  // Auto-scale on mount for mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setZoomLevel(0.4);
    }
  }, []);`
);

fs.writeFileSync('src/components/views/InfographicsEditorView.tsx', content);
