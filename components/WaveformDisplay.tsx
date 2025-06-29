import { useEffect, useRef, useState, useMemo } from 'react';

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  trimMarkers: number[];
  onAddMarker: (time: number) => void;
  onRemoveMarker: (index: number) => void;
  onHoverTimeChange?: (time: number | null) => void;
}

interface Region {
  start: number;
  end: number;
  index: number;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  audioBuffer,
  currentTime,
  duration,
  onSeek,
  trimMarkers,
  onAddMarker,
  onRemoveMarker,
  onHoverTimeChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [hoveredMarker, setHoveredMarker] = useState<number | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Calculate regions from trim markers
  const regions: Region[] = useMemo(() => {
    const result: Region[] = [];
    const sortedMarkers = [...trimMarkers].sort((a, b) => a - b);
    
    if (sortedMarkers.length === 0) {
      // No markers, entire audio is one region
      if (duration > 0) {
        result.push({ start: 0, end: duration, index: 0 });
      }
    } else {
      // First region: start to first marker
      if (sortedMarkers[0] > 0) {
        result.push({ start: 0, end: sortedMarkers[0], index: 0 });
      }
      
      // Middle regions: between markers
      for (let i = 0; i < sortedMarkers.length - 1; i++) {
        result.push({ 
          start: sortedMarkers[i], 
          end: sortedMarkers[i + 1], 
          index: result.length 
        });
      }
      
      // Last region: last marker to end
      if (sortedMarkers[sortedMarkers.length - 1] < duration) {
        result.push({ 
          start: sortedMarkers[sortedMarkers.length - 1], 
          end: duration, 
          index: result.length 
        });
      }
    }
    
    return result;
  }, [trimMarkers, duration]);

  // Generate waveform data from audio buffer
  useEffect(() => {
    if (!audioBuffer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / width);
    const waveform: number[] = [];

    for (let i = 0; i < width; i++) {
      const start = i * samplesPerPixel;
      const end = start + samplesPerPixel;
      let max = 0;

      for (let j = start; j < end && j < channelData.length; j++) {
        max = Math.max(max, Math.abs(channelData[j]));
      }

      waveform.push(max);
    }

    setWaveformData(waveform);
  }, [audioBuffer]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0 || duration === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const centerY = height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw regions background
    regions.forEach((region, index) => {
      const startX = (region.start / duration) * width;
      const endX = (region.end / duration) * width;
      
      // Alternate colors for regions
      const isHovered = hoveredRegion === index;
      const colors = [
        isHovered ? '#dbeafe' : '#f1f5f9', // blue-100 : slate-100
        isHovered ? '#fef3c7' : '#f8fafc', // amber-100 : slate-50
      ];
      
      ctx.fillStyle = colors[index % 2];
      ctx.fillRect(startX, 0, endX - startX, height);
      
      // Draw region border
      ctx.strokeStyle = isHovered ? '#3b82f6' : '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, 0, endX - startX, height);
      
      // Draw region label
      if (endX - startX > 50) { // Only show label if region is wide enough
        ctx.fillStyle = isHovered ? '#1e40af' : '#64748b';
        ctx.font = '12px sans-serif';
        const regionDuration = region.end - region.start;
        const label = `${Math.floor(regionDuration / 60)}:${(regionDuration % 60).toFixed(0).padStart(2, '0')}`;
        const textWidth = ctx.measureText(label).width;
        const textX = startX + (endX - startX - textWidth) / 2;
        ctx.fillText(label, textX, height - 10);
      }
    });

    // Draw waveform
    ctx.fillStyle = '#cbd5e1'; // slate-300
    waveformData.forEach((amplitude, i) => {
      const barHeight = amplitude * centerY * 0.7;
      ctx.fillRect(i, centerY - barHeight, 1, barHeight * 2);
    });

    // Draw progress
    const progressX = ((hoverTime !== null ? hoverTime : currentTime) / duration) * width;
    ctx.fillStyle = '#3b82f6'; // blue-500
    waveformData.slice(0, progressX).forEach((amplitude, i) => {
      const barHeight = amplitude * centerY * 0.7;
      ctx.fillRect(i, centerY - barHeight, 1, barHeight * 2);
    });

    // Draw playhead (hover or current)
    ctx.strokeStyle = '#ef4444'; // red-500
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

    // Draw playhead time label
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    const timeLabel = `${Math.floor((hoverTime !== null ? hoverTime : currentTime) / 60)}:${((hoverTime !== null ? hoverTime : currentTime) % 60).toFixed(0).padStart(2, '0')}`;
    const timeLabelWidth = ctx.measureText(timeLabel).width;
    const timeLabelX = Math.max(5, Math.min(width - timeLabelWidth - 5, progressX - timeLabelWidth / 2));
    ctx.fillText(timeLabel, timeLabelX, 20);

    // Draw trim markers
    trimMarkers.forEach((marker, index) => {
      const markerX = (marker / duration) * width;
      const isHovered = hoveredMarker === index;
      
      // Marker line
      ctx.strokeStyle = isHovered ? '#f59e0b' : '#d97706'; // amber-500 : amber-600
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(markerX, 0);
      ctx.lineTo(markerX, height);
      ctx.stroke();
      
      // Marker handle (top)
      ctx.fillStyle = isHovered ? '#f59e0b' : '#d97706';
      ctx.fillRect(markerX - 4, 0, 8, 12);
      
      // Marker handle (bottom)
      ctx.fillRect(markerX - 4, height - 12, 8, 12);
      
      // Marker time label
      ctx.fillStyle = isHovered ? '#92400e' : '#d97706';
      ctx.font = 'bold 11px sans-serif';
      const time = `${Math.floor(marker / 60)}:${(marker % 60).toFixed(0).padStart(2, '0')}`;
      const textWidth = ctx.measureText(time).width;
      const textX = Math.max(2, Math.min(width - textWidth - 2, markerX - textWidth / 2));
      ctx.fillText(time, textX, height - 20);
    });

  }, [waveformData, currentTime, duration, trimMarkers, hoveredMarker, hoveredRegion, regions, hoverTime]);

  // Sync hoverTime lên parent
  useEffect(() => {
    if (onHoverTimeChange) onHoverTimeChange(hoverTime);
  }, [hoverTime, onHoverTimeChange]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickTime = (x / canvas.width) * duration;

    // Check if clicking on a marker
    const markerThreshold = 8; // pixels
    for (let i = 0; i < trimMarkers.length; i++) {
      const markerX = (trimMarkers[i] / duration) * canvas.width;
      if (Math.abs(x - markerX) <= markerThreshold) {
        if (event.shiftKey) {
          // Remove marker with shift+click
          onRemoveMarker(i);
        } else {
          // Seek to marker
          onSeek(trimMarkers[i]);
        }
        return;
      }
    }

    if (event.shiftKey) {
      // Add trim marker when shift+click
      onAddMarker(clickTime);
    } else {
      // Seek to position
      onSeek(clickTime);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const hoverTime = (x / canvas.width) * duration;
    setHoverTime(hoverTime);

    // Check if hovering over a marker
    const markerThreshold = 8;
    let foundMarker = null;
    for (let i = 0; i < trimMarkers.length; i++) {
      const markerX = (trimMarkers[i] / duration) * canvas.width;
      if (Math.abs(x - markerX) <= markerThreshold) {
        foundMarker = i;
        break;
      }
    }
    setHoveredMarker(foundMarker);

    // Check if hovering over a region
    let foundRegion = null;
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      if (hoverTime >= region.start && hoverTime <= region.end) {
        foundRegion = i;
        break;
      }
    }
    setHoveredRegion(foundRegion);

    // Update cursor
    canvas.style.cursor = foundMarker !== null ? 'pointer' : 'crosshair';
  };

  const handleCanvasMouseLeave = () => {
    setHoveredMarker(null);
    setHoveredRegion(null);
    setHoverTime(null);
    if (onHoverTimeChange) onHoverTimeChange(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={800}
        height={120}
        className="w-full h-32 border border-slate-200 rounded bg-white shadow-sm"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
      />
      <div className="text-xs text-slate-500 space-y-1">
        <div>• Click để di chuyển playhead</div>
        <div>• Shift+Click để đặt/xóa điểm cắt</div>
        <div>• Sẽ xuất {regions.length} file audio</div>
      </div>
      
      {/* Region info */}
      {regions.length > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
          {regions.map((region, index) => (
            <div 
              key={index}
              className={`p-2 rounded border ${
                hoveredRegion === index 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="font-medium">Đoạn {index + 1}</div>
              <div className="text-slate-600">
                {Math.floor(region.start / 60)}:{(region.start % 60).toFixed(0).padStart(2, '0')} - {' '}
                {Math.floor(region.end / 60)}:{(region.end % 60).toFixed(0).padStart(2, '0')}
              </div>
              <div className="text-slate-500">
                ({Math.floor((region.end - region.start) / 60)}:{((region.end - region.start) % 60).toFixed(0).padStart(2, '0')})
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

