"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Play, 
  Pause, 
  Download, 
  Scissors, 
  FileAudio,
  Clock,
  Loader2
} from "lucide-react";
import { useAudioProcessor } from "@/hooks/useAudioProcessor";
import { useAudioExporter } from "@/hooks/useAudioExporter";
import { WaveformDisplay } from "@/components/WaveformDisplay";
import { SubtitlePanel } from "@/components/SubtitlePanel";

export default function AudioTrimmer() {
  const {
    audioInfo,
    error,
    loadAudioFile,
    playAudio,
    pauseAudio,
    seekTo,
    getCurrentTime,
    audioElement
  } = useAudioProcessor();

  const { exportAudioSegments, downloadSegments } = useAudioExporter();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimMarkers, setTrimMarkers] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [waveformHoverTime, setWaveformHoverTime] = useState<number | null>(null);

  // Update current time
  useEffect(() => {
    if (!audioElement) return;

    const updateTime = () => {
      setCurrentTime(audioElement.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audioElement.addEventListener('timeupdate', updateTime);
    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime);
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioElement]);

  // Lắng nghe phím Space để play/pause hoặc play tại playhead
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (!isPlaying) {
          if (waveformHoverTime !== null) {
            seekTo(waveformHoverTime);
            playAudio();
          } else {
            playAudio();
          }
        } else {
          pauseAudio();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, waveformHoverTime, seekTo, playAudio, pauseAudio]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      await loadAudioFile(file);
      setTrimMarkers([]); // Reset trim markers
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const addTrimMarker = () => {
    if (audioInfo) {
      const newMarker = getCurrentTime();
      setTrimMarkers(prev => [...prev, newMarker].sort((a, b) => a - b));
    }
  };

  const handleSeek = (time: number) => {
    seekTo(time);
    setCurrentTime(time);
  };

  const handleAddMarkerFromWaveform = (time: number) => {
    setTrimMarkers(prev => [...prev, time].sort((a, b) => a - b));
  };

  const removeTrimMarker = (index: number) => {
    setTrimMarkers(prev => prev.filter((_, i) => i !== index));
  };

  const handleExportAudio = async () => {
    if (!audioInfo?.audioBuffer || !audioInfo?.audioContext) return;

    setIsExporting(true);
    try {
      // DEBUG LOG
      console.log('handleExportAudio: trimMarkers:', trimMarkers);
      const segments = await exportAudioSegments({
        audioBuffer: audioInfo.audioBuffer,
        audioContext: audioInfo.audioContext,
        trimMarkers,
        originalFileName: audioInfo.file.name
      });

      downloadSegments(segments);
    } catch (error) {
      console.error('Export error:', error);
      alert('Có lỗi xảy ra khi xuất file audio');
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate number of output files
  const getOutputFileCount = () => {
    if (!audioInfo) return 0;
    if (trimMarkers.length === 0) return 1;
    
    const sortedMarkers = [...trimMarkers].sort((a, b) => a - b);
    let count = 0;
    
    // First segment
    if (sortedMarkers[0] > 0) count++;
    
    // Middle segments
    for (let i = 0; i < sortedMarkers.length - 1; i++) {
      count++;
    }
    
    // Last segment
    if (sortedMarkers[sortedMarkers.length - 1] < audioInfo.duration) count++;
    
    return count;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Scissors className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Audio Trimmer</h1>
              <p className="text-sm text-slate-600">Cắt và chỉnh sửa audio chuyên nghiệp</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Upload Section */}
            {!audioInfo ? (
              <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
                <CardContent className="relative flex flex-col items-center justify-center py-16 w-full" onDragOver={e => e.preventDefault()} onDrop={e => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('audio/')) {
                    handleFileUpload({ target: { files: [file] } } as any);
                  }
                }}>
                  <div className="p-4 bg-blue-50 rounded-full mb-4">
                    <Upload className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Tải lên file audio
                  </h3>
                  <p className="text-slate-600 text-center mb-6 max-w-md">
                    Hỗ trợ các định dạng MP3, WAV, M4A, OGG. Kéo thả file hoặc click để chọn.
                  </p>
                  <div className="relative inline-block">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Chọn file audio
                    </Button>
                    <Input
                      id="audio-upload"
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                  {error && (
                    <p className="text-red-600 text-sm mt-4 text-center max-w-md">
                      {error}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Audio Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileAudio className="h-5 w-5" />
                      {audioInfo.file.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>Kích thước: {(audioInfo.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Thời lượng: {formatTime(audioInfo.duration)}
                      </span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-green-600 font-medium">
                        Sẽ xuất {getOutputFileCount()} file
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Audio Timeline */}
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle>Timeline Audio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Waveform */}
                    <WaveformDisplay
                      audioBuffer={audioInfo.audioBuffer}
                      currentTime={currentTime}
                      duration={audioInfo.duration}
                      onSeek={handleSeek}
                      trimMarkers={trimMarkers}
                      onAddMarker={handleAddMarkerFromWaveform}
                      onRemoveMarker={removeTrimMarker}
                      onHoverTimeChange={setWaveformHoverTime}
                    />

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Progress value={(currentTime / audioInfo.duration) * 100} className="h-2" />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(audioInfo.duration)}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={togglePlayPause}
                        variant="outline"
                        size="sm"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        onClick={addTrimMarker}
                        variant="outline"
                        size="sm"
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Đặt điểm cắt
                      </Button>
                      <div className="flex-1" />
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleExportAudio}
                        disabled={isExporting}
                      >
                        {isExporting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Xuất file ({getOutputFileCount()})
                      </Button>
                    </div>

                    {/* Trim Markers */}
                    {trimMarkers.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Điểm cắt ({trimMarkers.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {trimMarkers.map((marker, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs"
                            >
                              <span>{formatTime(marker)}</span>
                              <button
                                onClick={() => removeTrimMarker(index)}
                                className="ml-1 text-amber-600 hover:text-amber-800"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <SubtitlePanel
              audioFile={audioInfo?.file || null}
              currentTime={currentTime}
              duration={audioInfo?.duration || 0}
              onSeek={handleSeek}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

