import { useState, useCallback, useEffect } from 'react';
import { Layers, RotateCcw, ZoomIn, ZoomOut, Box, Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';

// Note: In a real implementation, this would use @deck.gl/react
// For this demo, we'll create a WebGL-based 3D viewer

interface Point3D {
  x: number;
  y: number;
  z: number;
  value?: number;
}

interface SurfaceData {
  name: string;
  data: Point3D[];
  color: string;
  visible: boolean;
  opacity: number;
}

interface SubsurfaceViewerProps {
  surfaces?: SurfaceData[];
  width?: number;
  height?: number;
}

// Demo surfaces
const DEMO_SURFACES: SurfaceData[] = [
  {
    name: 'Top reservoir',
    color: '#d44211',
    visible: true,
    opacity: 0.8,
    data: []
  },
  {
    name: 'Oil-Water Contact',
    color: '#2d6a4f',
    visible: true,
    opacity: 0.6,
    data: []
  },
  {
    name: 'Base reservoir',
    color: '#d97706',
    visible: true,
    opacity: 0.5,
    data: []
  }
];

// Generate grid data
function generateGridSurface(size: number, amplitude: number, frequency: number): Point3D[] {
  const data: Point3D[] = [];
  for (let i = 0; i <= size; i++) {
    for (let j = 0; j <= size; j++) {
      const x = (i / size - 0.5) * 2000;
      const y = (j / size - 0.5) * 2000;
      const z = amplitude * Math.sin(x / frequency) * Math.cos(y / frequency);
      data.push({ x, y, z });
    }
  }
  return data;
}

export function SubsurfaceViewer({
  surfaces = DEMO_SURFACES,
  width = 800,
  height = 600
}: SubsurfaceViewerProps) {
  const [rotation, setRotation] = useState({ x: 30, y: 45 });
  const [zoom, setZoom] = useState(1);
  const [localSurfaces, setLocalSurfaces] = useState(() => 
    surfaces.map((s, i) => ({
      ...s,
      data: generateGridSurface(20, 100 + i * 50, 300)
    }))
  );
  const [showWireframe, setShowWireframe] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | 'top' | 'front'>('3d');
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Animation loop
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      // Could add auto-rotation here
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMouse.x;
    const deltaY = e.clientY - lastMouse.y;
    
    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x + deltaY * 0.5)),
      y: prev.y + deltaX * 0.5
    }));
    
    setLastMouse({ x: e.clientX, y: e.clientY });
  }, [isDragging, lastMouse]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setRotation({ x: 30, y: 45 });
    setZoom(1);
  }, []);

  const toggleLayer = (index: number) => {
    setLocalSurfaces(prev => prev.map((s, i) => 
      i === index ? { ...s, visible: !s.visible } : s
    ));
  };

  // Simple CSS 3D projection
  const projectPoint = useCallback((point: Point3D): { x: number; y: number } => {
    const radX = (rotation.x * Math.PI) / 180;
    const radY = (rotation.y * Math.PI) / 180;
    
    // Rotate around Y axis
    let x = point.x * Math.cos(radY) - point.z * Math.sin(radY);
    let z = point.x * Math.sin(radY) + point.z * Math.cos(radY);
    
    // Rotate around X axis
    const y = point.y * Math.cos(radX) - z * Math.sin(radX);
    z = point.y * Math.sin(radX) + z * Math.cos(radX);
    
    // Apply zoom and perspective
    const scale = zoom * (500 / (500 + z));
    
    return {
      x: width / 2 + x * scale,
      y: height / 2 + y * scale
    };
  }, [rotation, zoom, width, height]);

  // Generate path for surface mesh
  const generateMeshPath = useCallback((data: Point3D[], _size: number = 20) => {
    const paths: string[] = [];
    const gridSize = Math.sqrt(data.length);
    
    for (let i = 0; i < gridSize - 1; i++) {
      for (let j = 0; j < gridSize - 1; j++) {
        const idx = i * gridSize + j;
        const p1 = data[idx];
        const p2 = data[idx + 1];
        const p3 = data[idx + gridSize + 1];
        
        if (p1 && p2 && p3) {
          const proj1 = projectPoint(p1);
          const proj2 = projectPoint(p2);
          const proj3 = projectPoint(p3);
          
          paths.push(`M ${proj1.x} ${proj1.y} L ${proj2.x} ${proj2.y} L ${proj3.x} ${proj3.y} Z`);
        }
      }
    }
    
    return paths;
  }, [projectPoint]);

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-sandstone-50 border-b border-sandstone-200">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-sandstone-900">3D Subsurface Viewer</h3>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          {(['3d', 'top', 'front'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                if (mode === 'top') setRotation({ x: -90, y: 0 });
                else if (mode === 'front') setRotation({ x: 0, y: 0 });
                else setRotation({ x: 30, y: 45 });
              }}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                viewMode === mode
                  ? 'bg-primary-600 text-white'
                  : 'bg-sandstone-200 text-sandstone-600 hover:bg-sandstone-300'
              )}
            >
              {mode === '3d' ? '3D' : mode === 'top' ? 'Top' : 'Front'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* 3D Canvas */}
        <div className="flex-1 relative" style={{ width, height }}>
          <svg
            width={width}
            height={height}
            className="bg-gradient-to-br from-sandstone-100 to-sandstone-200 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#C7C0B0" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Render surfaces */}
            {localSurfaces.map((surface) => (
              surface.visible && (
                <g key={surface.name}>
                  {generateMeshPath(surface.data).slice(0, 100).map((path, i) => (
                    <path
                      key={i}
                      d={path}
                      fill={surface.color}
                      fillOpacity={surface.opacity * 0.3}
                      stroke={showWireframe ? surface.color : 'none'}
                      strokeWidth={showWireframe ? 0.5 : 0}
                    />
                  ))}
                </g>
              )
            ))}

            {/* Axis indicators */}
            <g transform="translate(50, 50)">
              <line x1="0" y1="0" x2="30" y2="0" stroke="#d44211" strokeWidth="2" />
              <text x="35" y="4" fill="#d44211" fontSize="10">X</text>
              <line x1="0" y1="0" x2="0" y2="30" stroke="#2d6a4f" strokeWidth="2" />
              <text x="5" y="35" fill="#2d6a4f" fontSize="10">Y</text>
              <line x1="0" y1="0" x2="-20" y2="-20" stroke="#2563eb" strokeWidth="2" />
              <text x="-35" y="-25" fill="#2563eb" fontSize="10">Z</text>
            </g>
          </svg>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <button
              onClick={() => setZoom(z => Math.min(3, z * 1.2))}
              className="p-2 bg-white border border-sandstone-200 rounded shadow hover:bg-sandstone-50"
            >
              <ZoomIn className="w-4 h-4 text-sandstone-600" />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}
              className="p-2 bg-white border border-sandstone-200 rounded shadow hover:bg-sandstone-50"
            >
              <ZoomOut className="w-4 h-4 text-sandstone-600" />
            </button>
            <button
              onClick={resetView}
              className="p-2 bg-white border border-sandstone-200 rounded shadow hover:bg-sandstone-50"
            >
              <RotateCcw className="w-4 h-4 text-sandstone-600" />
            </button>
          </div>

          {/* Wireframe Toggle */}
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={clsx(
                'px-3 py-1.5 text-xs rounded shadow flex items-center gap-1',
                showWireframe
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-sandstone-600 border border-sandstone-200'
              )}
            >
              <Layers className="w-3 h-3" />
              Wireframe
            </button>
          </div>
        </div>

        {/* Layer Panel */}
        <div className="w-48 bg-sandstone-50 border-l border-sandstone-200 p-3">
          <h4 className="text-xs font-semibold text-sandstone-500 uppercase tracking-wide mb-3">
            Layers
          </h4>
          
          <div className="space-y-2">
            {localSurfaces.map((surface, idx) => (
              <div
                key={surface.name}
                className="flex items-center justify-between p-2 bg-white rounded border border-sandstone-100"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleLayer(idx)}
                    className="text-sandstone-400 hover:text-sandstone-600"
                  >
                    {surface.visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: surface.color }}
                  />
                  <span className="text-xs text-sandstone-700 truncate">
                    {surface.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-sandstone-200">
            <h4 className="text-xs font-semibold text-sandstone-500 uppercase tracking-wide mb-2">
              Controls
            </h4>
            <p className="text-xs text-sandstone-500">
              Drag to rotate • Scroll to zoom
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
