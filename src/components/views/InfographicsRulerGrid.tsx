import React from 'react';
import { 
  Grid, Ruler, Magnet, Crosshair, Columns, 
  Trash2, Plus, Eye, EyeOff, Check, Sliders,
  Square, LayoutGrid
} from 'lucide-react';

export type RulerUnit = 'px' | 'cm' | 'inch';
export type GridStyle = 'dots' | 'lines' | 'columns' | 'thirds';

export interface GuideLine {
  id: string;
  type: 'h' | 'v';
  pos: number; // in pixels
  color?: string;
}

interface HorizontalRulerProps {
  width: number;
  height?: number;
  unit: RulerUnit;
  mousePos: { x: number; y: number } | null;
  selectedBox: { left: number; width: number } | null;
  guides: GuideLine[];
  onAddGuide?: (type: 'v', pos: number) => void;
  onRemoveGuide?: (id: string) => void;
}

export const CanvasHorizontalRuler: React.FC<HorizontalRulerProps> = ({
  width,
  height = 24,
  unit,
  mousePos,
  selectedBox,
  guides,
  onAddGuide,
}) => {
  // Unit conversion
  // 1 in = 96 px, 1 cm = 37.795 px
  const pxPerCm = 37.79527559;
  const pxPerInch = 96;

  const ticks: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];

  if (unit === 'px') {
    // Major ticks every 100px, medium every 50px, minor every 10px
    for (let x = 0; x <= width; x += 10) {
      const isMajor = x % 100 === 0;
      const isMedium = x % 50 === 0 && !isMajor;

      const tickHeight = isMajor ? 14 : isMedium ? 9 : 5;
      const y1 = height - tickHeight;
      const y2 = height;

      ticks.push(
        <line
          key={`h-tick-${x}`}
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          stroke={isMajor ? '#94a3b8' : isMedium ? '#cbd5e1' : '#e2e8f0'}
          strokeWidth={isMajor ? 1.2 : 1}
        />
      );

      if (isMajor && x > 0 && x < width - 20) {
        labels.push(
          <text
            key={`h-label-${x}`}
            x={x + 3}
            y={10}
            fontSize="9"
            fontFamily="monospace"
            fill="#64748b"
            textAnchor="start"
            fontWeight="500"
            className="select-none"
          >
            {x}
          </text>
        );
      }
    }
  } else if (unit === 'cm') {
    // Every mm (3.78px), half cm (18.9px), whole cm (37.8px)
    const totalCm = width / pxPerCm;
    for (let cm = 0; cm <= totalCm; cm += 0.1) {
      const x = cm * pxPerCm;
      if (x > width) break;
      const roundedMm = Math.round(cm * 10);
      const isMajor = roundedMm % 10 === 0;
      const isHalf = roundedMm % 5 === 0 && !isMajor;

      const tickHeight = isMajor ? 14 : isHalf ? 9 : 5;
      ticks.push(
        <line
          key={`h-cm-tick-${roundedMm}`}
          x1={x}
          y1={height - tickHeight}
          x2={x}
          y2={height}
          stroke={isMajor ? '#94a3b8' : isHalf ? '#cbd5e1' : '#e2e8f0'}
          strokeWidth={isMajor ? 1.2 : 1}
        />
      );

      if (isMajor && cm > 0 && x < width - 15) {
        labels.push(
          <text
            key={`h-cm-label-${cm}`}
            x={x + 2}
            y={10}
            fontSize="9"
            fontFamily="monospace"
            fill="#64748b"
            textAnchor="start"
            fontWeight="500"
            className="select-none"
          >
            {Math.round(cm)}
          </text>
        );
      }
    }
  } else {
    // Inch
    const totalInches = width / pxPerInch;
    for (let inch = 0; inch <= totalInches; inch += 0.125) {
      const x = inch * pxPerInch;
      if (x > width) break;
      const eighths = Math.round(inch * 8);
      const isMajor = eighths % 8 === 0;
      const isHalf = eighths % 4 === 0 && !isMajor;
      const isQuarter = eighths % 2 === 0 && !isMajor && !isHalf;

      const tickHeight = isMajor ? 14 : isHalf ? 10 : isQuarter ? 7 : 4;
      ticks.push(
        <line
          key={`h-in-tick-${eighths}`}
          x1={x}
          y1={height - tickHeight}
          x2={x}
          y2={height}
          stroke={isMajor ? '#94a3b8' : isHalf ? '#cbd5e1' : '#e2e8f0'}
          strokeWidth={isMajor ? 1.2 : 1}
        />
      );

      if (isMajor && inch > 0 && x < width - 15) {
        labels.push(
          <text
            key={`h-in-label-${inch}`}
            x={x + 2}
            y={10}
            fontSize="9"
            fontFamily="monospace"
            fill="#64748b"
            textAnchor="start"
            fontWeight="500"
            className="select-none"
          >
            {Math.round(inch)}″
          </text>
        );
      }
    }
  }

  const verticalGuides = guides.filter((g) => g.type === 'v');

  return (
    <div
      className="relative bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 select-none group cursor-crosshair"
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={(e) => {
        if (!onAddGuide) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        onAddGuide('v', Math.round(clickX));
      }}
      title="คลิกบนไม้บรรทัดเพื่อเพิ่มเส้นไกด์แนวตั้ง"
    >
      <svg width={width} height={height} className="block overflow-visible pointer-events-none">
        {/* Background Ticks */}
        {ticks}
        {labels}

        {/* Selected Object Span Range Highlight */}
        {selectedBox && selectedBox.width > 0 && (
          <g>
            <rect
              x={selectedBox.left}
              y={2}
              width={Math.max(2, selectedBox.width)}
              height={height - 4}
              fill="rgba(59, 130, 246, 0.25)"
              stroke="#3b82f6"
              strokeWidth={1}
              rx={2}
            />
            <line x1={selectedBox.left} y1={0} x2={selectedBox.left} y2={height} stroke="#2563eb" strokeWidth={1.5} />
            <line x1={selectedBox.left + selectedBox.width} y1={0} x2={selectedBox.left + selectedBox.width} y2={height} stroke="#2563eb" strokeWidth={1.5} />
          </g>
        )}

        {/* Vertical Guide markers on ruler */}
        {verticalGuides.map((g) => (
          <g key={g.id} className="cursor-pointer pointer-events-auto">
            <polygon
              points={`${g.pos - 4},0 ${g.pos + 4},0 ${g.pos},7`}
              fill={g.color || '#06b6d4'}
            />
            <line x1={g.pos} y1={0} x2={g.pos} y2={height} stroke={g.color || '#06b6d4'} strokeWidth={1.5} />
          </g>
        ))}

        {/* Real-time Mouse tracker on ruler */}
        {mousePos && mousePos.x >= 0 && mousePos.x <= width && (
          <g>
            <line
              x1={mousePos.x}
              y1={0}
              x2={mousePos.x}
              y2={height}
              stroke="#ef4444"
              strokeWidth={1.5}
            />
            <polygon
              points={`${mousePos.x - 3},${height} ${mousePos.x + 3},${height} ${mousePos.x},${height - 6}`}
              fill="#ef4444"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

interface VerticalRulerProps {
  height: number;
  width?: number;
  unit: RulerUnit;
  mousePos: { x: number; y: number } | null;
  selectedBox: { top: number; height: number } | null;
  guides: GuideLine[];
  onAddGuide?: (type: 'h', pos: number) => void;
  onRemoveGuide?: (id: string) => void;
}

export const CanvasVerticalRuler: React.FC<VerticalRulerProps> = ({
  height,
  width = 24,
  unit,
  mousePos,
  selectedBox,
  guides,
  onAddGuide,
}) => {
  const pxPerCm = 37.79527559;
  const pxPerInch = 96;

  const ticks: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];

  if (unit === 'px') {
    for (let y = 0; y <= height; y += 10) {
      const isMajor = y % 100 === 0;
      const isMedium = y % 50 === 0 && !isMajor;

      const tickWidth = isMajor ? 14 : isMedium ? 9 : 5;
      const x1 = width - tickWidth;
      const x2 = width;

      ticks.push(
        <line
          key={`v-tick-${y}`}
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke={isMajor ? '#94a3b8' : isMedium ? '#cbd5e1' : '#e2e8f0'}
          strokeWidth={isMajor ? 1.2 : 1}
        />
      );

      if (isMajor && y > 0 && y < height - 10) {
        labels.push(
          <text
            key={`v-label-${y}`}
            x={10}
            y={y + 3}
            fontSize="8"
            fontFamily="monospace"
            fill="#64748b"
            textAnchor="end"
            fontWeight="500"
            className="select-none"
            transform={`rotate(-90 10 ${y + 3})`}
          >
            {y}
          </text>
        );
      }
    }
  } else if (unit === 'cm') {
    const totalCm = height / pxPerCm;
    for (let cm = 0; cm <= totalCm; cm += 0.1) {
      const y = cm * pxPerCm;
      if (y > height) break;
      const roundedMm = Math.round(cm * 10);
      const isMajor = roundedMm % 10 === 0;
      const isHalf = roundedMm % 5 === 0 && !isMajor;

      const tickWidth = isMajor ? 14 : isHalf ? 9 : 5;
      ticks.push(
        <line
          key={`v-cm-tick-${roundedMm}`}
          x1={width - tickWidth}
          y1={y}
          x2={width}
          y2={y}
          stroke={isMajor ? '#94a3b8' : isHalf ? '#cbd5e1' : '#e2e8f0'}
          strokeWidth={isMajor ? 1.2 : 1}
        />
      );

      if (isMajor && cm > 0 && y < height - 10) {
        labels.push(
          <text
            key={`v-cm-label-${cm}`}
            x={10}
            y={y + 3}
            fontSize="8"
            fontFamily="monospace"
            fill="#64748b"
            textAnchor="end"
            fontWeight="500"
            className="select-none"
            transform={`rotate(-90 10 ${y + 3})`}
          >
            {Math.round(cm)}
          </text>
        );
      }
    }
  } else {
    // Inch
    const totalInches = height / pxPerInch;
    for (let inch = 0; inch <= totalInches; inch += 0.125) {
      const y = inch * pxPerInch;
      if (y > height) break;
      const eighths = Math.round(inch * 8);
      const isMajor = eighths % 8 === 0;
      const isHalf = eighths % 4 === 0 && !isMajor;
      const isQuarter = eighths % 2 === 0 && !isMajor && !isHalf;

      const tickWidth = isMajor ? 14 : isHalf ? 10 : isQuarter ? 7 : 4;
      ticks.push(
        <line
          key={`v-in-tick-${eighths}`}
          x1={width - tickWidth}
          y1={y}
          x2={width}
          y2={y}
          stroke={isMajor ? '#94a3b8' : isHalf ? '#cbd5e1' : '#e2e8f0'}
          strokeWidth={isMajor ? 1.2 : 1}
        />
      );

      if (isMajor && inch > 0 && y < height - 10) {
        labels.push(
          <text
            key={`v-in-label-${inch}`}
            x={10}
            y={y + 3}
            fontSize="8"
            fontFamily="monospace"
            fill="#64748b"
            textAnchor="end"
            fontWeight="500"
            className="select-none"
            transform={`rotate(-90 10 ${y + 3})`}
          >
            {Math.round(inch)}″
          </text>
        );
      }
    }
  }

  const horizontalGuides = guides.filter((g) => g.type === 'h');

  return (
    <div
      className="relative bg-slate-100 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 select-none group cursor-crosshair shrink-0"
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={(e) => {
        if (!onAddGuide) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        onAddGuide('h', Math.round(clickY));
      }}
      title="คลิกบนไม้บรรทัดเพื่อเพิ่มเส้นไกด์แนวนอน"
    >
      <svg width={width} height={height} className="block overflow-visible pointer-events-none">
        {ticks}
        {labels}

        {/* Selected Object Span Range Highlight */}
        {selectedBox && selectedBox.height > 0 && (
          <g>
            <rect
              x={2}
              y={selectedBox.top}
              width={width - 4}
              height={Math.max(2, selectedBox.height)}
              fill="rgba(59, 130, 246, 0.25)"
              stroke="#3b82f6"
              strokeWidth={1}
              rx={2}
            />
            <line x1={0} y1={selectedBox.top} x2={width} y2={selectedBox.top} stroke="#2563eb" strokeWidth={1.5} />
            <line x1={0} y1={selectedBox.top + selectedBox.height} x2={width} y2={selectedBox.top + selectedBox.height} stroke="#2563eb" strokeWidth={1.5} />
          </g>
        )}

        {/* Horizontal Guide markers on ruler */}
        {horizontalGuides.map((g) => (
          <g key={g.id} className="cursor-pointer pointer-events-auto">
            <polygon
              points={`0,${g.pos - 4} 0,${g.pos + 4} 7,${g.pos}`}
              fill={g.color || '#06b6d4'}
            />
            <line x1={0} y1={g.pos} x2={width} y2={g.pos} stroke={g.color || '#06b6d4'} strokeWidth={1.5} />
          </g>
        ))}

        {/* Real-time Mouse tracker on ruler */}
        {mousePos && mousePos.y >= 0 && mousePos.y <= height && (
          <g>
            <line
              x1={0}
              y1={mousePos.y}
              x2={width}
              y2={mousePos.y}
              stroke="#ef4444"
              strokeWidth={1.5}
            />
            <polygon
              points={`${width},${mousePos.y - 3} ${width},${mousePos.y + 3} ${width - 6},${mousePos.y}`}
              fill="#ef4444"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

interface CornerBoxProps {
  unit: RulerUnit;
  onCycleUnit: () => void;
  size?: number;
}

export const CanvasCornerBox: React.FC<CornerBoxProps> = ({ unit, onCycleUnit, size = 24 }) => {
  return (
    <button
      onClick={onCycleUnit}
      style={{ width: `${size}px`, height: `${size}px` }}
      className="bg-slate-200 dark:bg-slate-800 border-r border-b border-slate-300 dark:border-slate-700 flex items-center justify-center text-[9px] font-bold font-mono text-slate-700 dark:text-slate-300 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer select-none shrink-0"
      title={`หน่วยวัดปัจจุบัน: ${unit.toUpperCase()} (คลิกเพื่อเปลี่ยนหน่วย px/cm/inch)`}
    >
      {unit}
    </button>
  );
};

interface GridOverlayProps {
  width: number;
  height: number;
  showGrid: boolean;
  gridStyle: GridStyle;
  gridSize: number;
  gridColor?: string;
  gridOpacity?: number;
  guides: GuideLine[];
  showGuides: boolean;
  onRemoveGuide?: (id: string) => void;
}

export const CanvasGridOverlay: React.FC<GridOverlayProps> = ({
  width,
  height,
  showGrid,
  gridStyle,
  gridSize,
  gridColor = '#3b82f6',
  gridOpacity = 0.2,
  guides,
  showGuides,
  onRemoveGuide,
}) => {
  if (!showGrid && (!showGuides || guides.length === 0)) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-[5]"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <svg width={width} height={height} className="w-full h-full">
        <defs>
          {/* Dot Grid Pattern */}
          <pattern
            id="ruler-grid-dots"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={gridSize / 2}
              cy={gridSize / 2}
              r={1.25}
              fill={gridColor}
              fillOpacity={gridOpacity * 1.5}
            />
          </pattern>

          {/* Line Mesh Grid Pattern */}
          <pattern
            id="ruler-grid-lines"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke={gridColor}
              strokeWidth="0.75"
              strokeOpacity={gridOpacity}
            />
          </pattern>

          {/* Major 5x Grid Pattern for lines */}
          <pattern
            id="ruler-grid-lines-major"
            width={gridSize * 5}
            height={gridSize * 5}
            patternUnits="userSpaceOnUse"
          >
            <rect width={gridSize * 5} height={gridSize * 5} fill="url(#ruler-grid-lines)" />
            <path
              d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`}
              fill="none"
              stroke={gridColor}
              strokeWidth="1.5"
              strokeOpacity={gridOpacity * 1.8}
            />
          </pattern>
        </defs>

        {/* 1. Dot Grid Rendering */}
        {showGrid && gridStyle === 'dots' && (
          <rect width={width} height={height} fill="url(#ruler-grid-dots)" />
        )}

        {/* 2. Line Grid Rendering */}
        {showGrid && gridStyle === 'lines' && (
          <rect width={width} height={height} fill="url(#ruler-grid-lines-major)" />
        )}

        {/* 3. 12-Column Layout Grid */}
        {showGrid && gridStyle === 'columns' && (
          <g>
            {Array.from({ length: 12 }).map((_, colIdx) => {
              const sideMargin = 32;
              const gutter = 16;
              const usableWidth = width - sideMargin * 2 - gutter * 11;
              const colWidth = Math.max(10, usableWidth / 12);
              const colLeft = sideMargin + colIdx * (colWidth + gutter);

              return (
                <g key={`col-${colIdx}`}>
                  <rect
                    x={colLeft}
                    y={0}
                    width={colWidth}
                    height={height}
                    fill={gridColor}
                    fillOpacity={gridOpacity * 0.4}
                    stroke={gridColor}
                    strokeWidth={0.5}
                    strokeOpacity={gridOpacity * 0.8}
                  />
                  <text
                    x={colLeft + colWidth / 2}
                    y={20}
                    fontSize="9"
                    fontFamily="monospace"
                    fill={gridColor}
                    fillOpacity={gridOpacity * 2}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {colIdx + 1}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* 4. Rule of Thirds Grid (3x3) */}
        {showGrid && gridStyle === 'thirds' && (
          <g>
            {/* Horizontal 1/3 and 2/3 lines */}
            <line
              x1={0}
              y1={height / 3}
              x2={width}
              y2={height / 3}
              stroke={gridColor}
              strokeWidth={1.5}
              strokeOpacity={gridOpacity * 2}
              strokeDasharray="4,4"
            />
            <line
              x1={0}
              y1={(height * 2) / 3}
              x2={width}
              y2={(height * 2) / 3}
              stroke={gridColor}
              strokeWidth={1.5}
              strokeOpacity={gridOpacity * 2}
              strokeDasharray="4,4"
            />

            {/* Vertical 1/3 and 2/3 lines */}
            <line
              x1={width / 3}
              y1={0}
              x2={width / 3}
              y2={height}
              stroke={gridColor}
              strokeWidth={1.5}
              strokeOpacity={gridOpacity * 2}
              strokeDasharray="4,4"
            />
            <line
              x1={(width * 2) / 3}
              y1={0}
              x2={(width * 2) / 3}
              y2={height}
              stroke={gridColor}
              strokeWidth={1.5}
              strokeOpacity={gridOpacity * 2}
              strokeDasharray="4,4"
            />

            {/* Focal Crosshairs (+) */}
            {[
              { x: width / 3, y: height / 3 },
              { x: (width * 2) / 3, y: height / 3 },
              { x: width / 3, y: (height * 2) / 3 },
              { x: (width * 2) / 3, y: (height * 2) / 3 },
            ].map((pt, i) => (
              <g key={`focal-${i}`}>
                <circle cx={pt.x} cy={pt.y} r={6} fill="none" stroke={gridColor} strokeWidth={2} strokeOpacity={gridOpacity * 3} />
                <circle cx={pt.x} cy={pt.y} r={2} fill={gridColor} fillOpacity={gridOpacity * 3} />
              </g>
            ))}
          </g>
        )}

        {/* 5. Custom Guidelines Layer */}
        {showGuides &&
          guides.map((g) => {
            const color = g.color || '#06b6d4';
            if (g.type === 'h') {
              return (
                <g key={g.id} className="pointer-events-auto group/guide">
                  <line
                    x1={0}
                    y1={g.pos}
                    x2={width}
                    y2={g.pos}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="3,3"
                  />
                  {/* Guide Label & Delete Pill */}
                  <g transform={`translate(10, ${Math.max(14, g.pos - 10)})`}>
                    <rect
                      x={0}
                      y={0}
                      width={52}
                      height={18}
                      rx={4}
                      fill={color}
                      className="cursor-pointer"
                      onClick={() => onRemoveGuide?.(g.id)}
                    />
                    <text
                      x={26}
                      y={12}
                      fontSize="9"
                      fontFamily="monospace"
                      fill="#ffffff"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      Y: {g.pos}
                    </text>
                  </g>
                </g>
              );
            } else {
              return (
                <g key={g.id} className="pointer-events-auto group/guide">
                  <line
                    x1={g.pos}
                    y1={0}
                    x2={g.pos}
                    y2={height}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="3,3"
                  />
                  {/* Guide Label & Delete Pill */}
                  <g transform={`translate(${Math.max(6, g.pos - 26)}, 10)`}>
                    <rect
                      x={0}
                      y={0}
                      width={52}
                      height={18}
                      rx={4}
                      fill={color}
                      className="cursor-pointer"
                      onClick={() => onRemoveGuide?.(g.id)}
                    />
                    <text
                      x={26}
                      y={12}
                      fontSize="9"
                      fontFamily="monospace"
                      fill="#ffffff"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      X: {g.pos}
                    </text>
                  </g>
                </g>
              );
            }
          })}
      </svg>
    </div>
  );
};

interface RulerGridControlPanelProps {
  showRuler: boolean;
  setShowRuler: (v: boolean) => void;
  rulerUnit: RulerUnit;
  setRulerUnit: (u: RulerUnit) => void;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  gridStyle: GridStyle;
  setGridStyle: (s: GridStyle) => void;
  gridSize: number;
  setGridSize: (s: number) => void;
  gridOpacity: number;
  setGridOpacity: (o: number) => void;
  snapToGrid: boolean;
  setSnapToGrid: (s: boolean) => void;
  guides: GuideLine[];
  showGuides: boolean;
  setShowGuides: (v: boolean) => void;
  onAddCenterGuides: () => void;
  onClearGuides: () => void;
}

export const RulerGridControlPanel: React.FC<RulerGridControlPanelProps> = ({
  showRuler,
  setShowRuler,
  rulerUnit,
  setRulerUnit,
  showGrid,
  setShowGrid,
  gridStyle,
  setGridStyle,
  gridSize,
  setGridSize,
  gridOpacity,
  setGridOpacity,
  snapToGrid,
  setSnapToGrid,
  guides,
  showGuides,
  setShowGuides,
  onAddCenterGuides,
  onClearGuides,
}) => {
  return (
    <div className="space-y-4 text-xs">
      {/* 1. Ruler Settings */}
      <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-light)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-[var(--text-primary)]">ไม้บรรทัด (Rulers)</span>
          </div>
          <button
            onClick={() => setShowRuler(!showRuler)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
              showRuler
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-slate-200 dark:bg-slate-700 text-[var(--text-secondary)]'
            }`}
          >
            {showRuler ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {showRuler ? 'เปิดอยู่' : 'ปิด'}
          </button>
        </div>

        {showRuler && (
          <div className="pt-2 border-t border-[var(--border-light)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-secondary)]">หน่วยวัด (Unit):</span>
            <div className="flex gap-1 bg-[var(--bg-surface)] p-0.5 rounded-lg border border-[var(--border-medium)]">
              {(['px', 'cm', 'inch'] as RulerUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setRulerUnit(u)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                    rulerUnit === u
                      ? 'bg-blue-500 text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Grid System */}
      <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-light)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-[var(--text-primary)]">ตารางนำสายตา (Grid)</span>
          </div>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
              showGrid
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-slate-200 dark:bg-slate-700 text-[var(--text-secondary)]'
            }`}
          >
            {showGrid ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {showGrid ? 'เปิดอยู่' : 'ปิด'}
          </button>
        </div>

        {showGrid && (
          <div className="space-y-2.5 pt-2 border-t border-[var(--border-light)]">
            {/* Grid Style Selector */}
            <div className="space-y-1">
              <span className="text-[11px] text-[var(--text-secondary)] font-medium block">รูปแบบตาราง:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'dots', label: 'จุดนำสายตา (Dots)', icon: Grid },
                  { id: 'lines', label: 'ตารางเส้น (Mesh)', icon: LayoutGrid },
                  { id: 'columns', label: '12 คอลัมน์ (Layout)', icon: Columns },
                  { id: 'thirds', label: 'กฎ 3 ส่วน (Thirds)', icon: Crosshair },
                ].map((st) => {
                  const Icon = st.icon;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setGridStyle(st.id as GridStyle)}
                      className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all text-[10px] font-semibold ${
                        gridStyle === st.id
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                          : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid Size (for dots & lines) */}
            {(gridStyle === 'dots' || gridStyle === 'lines') && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[var(--text-secondary)]">ระยะห่างช่อง:</span>
                <div className="flex gap-1">
                  {[10, 20, 40, 50].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setGridSize(sz)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        gridSize === sz
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid Opacity Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-secondary)]">ความโปร่งใสของตาราง:</span>
                <span className="font-mono text-[var(--text-muted)]">{Math.round(gridOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.6"
                step="0.05"
                value={gridOpacity}
                onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Snap to Grid Feature */}
      <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-light)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Magnet className={`w-4 h-4 ${snapToGrid ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} />
          <div>
            <div className="font-bold text-[var(--text-primary)]">ดูดติดเส้นตาราง (Snap to Grid)</div>
            <div className="text-[10px] text-[var(--text-secondary)]">จัดตำแหน่งวัตถุลงช่องตารางอัตโนมัติ</div>
          </div>
        </div>
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
            snapToGrid
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-slate-200 dark:bg-slate-700 text-[var(--text-secondary)]'
          }`}
        >
          {snapToGrid ? 'เปิด' : 'ปิด'}
        </button>
      </div>

      {/* 4. Guidelines Manager */}
      <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-light)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-cyan-500" />
            <span className="font-bold text-[var(--text-primary)]">เส้นไกด์นำสายตา (Guides)</span>
          </div>
          <span className="text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold px-1.5 py-0.5 rounded">
            {guides.length} เส้น
          </span>
        </div>

        <div className="flex gap-1.5 pt-1">
          <button
            onClick={onAddCenterGuides}
            className="flex-1 py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] hover:bg-cyan-500/10 border border-[var(--border-medium)] hover:border-cyan-400 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
            title="เพิ่มเส้นกึ่งกลางแกน X และ Y"
          >
            <Plus className="w-3 h-3" />
            เพิ่มเส้นกึ่งกลางแคนวาส
          </button>
          {guides.length > 0 && (
            <button
              onClick={onClearGuides}
              className="py-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
              title="ลบเส้นไกด์ทั้งหมด"
            >
              <Trash2 className="w-3 h-3" />
              ลบทั้งหมด
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
