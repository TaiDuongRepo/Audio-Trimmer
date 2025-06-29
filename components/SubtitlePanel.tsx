import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Subtitles, Download, Eye, EyeOff } from 'lucide-react';

interface SubtitleEntry {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface SubtitlePanelProps {
  audioFile: File | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const SubtitlePanel: React.FC<SubtitlePanelProps> = ({
  audioFile,
  currentTime,
  duration,
  onSeek
}) => {
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);

  // Simulate subtitle detection
  useEffect(() => {
    if (!audioFile) {
      setSubtitles([]);
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis delay
    const timer = setTimeout(() => {
      // Generate mock subtitles based on audio duration
      const mockSubtitles: SubtitleEntry[] = [];
      const segmentDuration = Math.max(3, duration / 8); // Divide into ~8 segments
      
      for (let i = 0; i < Math.floor(duration / segmentDuration); i++) {
        const startTime = i * segmentDuration;
        const endTime = Math.min((i + 1) * segmentDuration, duration);
        
        mockSubtitles.push({
          id: i,
          startTime,
          endTime,
          text: generateMockSubtitleText(i)
        });
      }
      
      setSubtitles(mockSubtitles);
      setIsAnalyzing(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [audioFile, duration]);

  const generateMockSubtitleText = (index: number): string => {
    const mockTexts = [
      "Chào mừng bạn đến với audio trimmer",
      "Đây là một đoạn audio mẫu",
      "Bạn có thể cắt audio thành nhiều phần",
      "Sử dụng Shift+Click để đặt điểm cắt",
      "Timeline hiển thị waveform của audio",
      "Mỗi đoạn sẽ được xuất thành file riêng",
      "Subtitle được detect tự động",
      "Cảm ơn bạn đã sử dụng ứng dụng"
    ];
    
    return mockTexts[index % mockTexts.length];
  };

  const getCurrentSubtitle = (): SubtitleEntry | null => {
    return subtitles.find(sub => 
      currentTime >= sub.startTime && currentTime <= sub.endTime
    ) || null;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const exportSubtitles = () => {
    if (subtitles.length === 0) return;

    // Generate SRT format
    const srtContent = subtitles.map((sub, index) => {
      const startTime = formatSRTTime(sub.startTime);
      const endTime = formatSRTTime(sub.endTime);
      return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
    }).join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioFile?.name.replace(/\.[^/.]+$/, '') || 'subtitles'}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const currentSubtitle = getCurrentSubtitle();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Subtitles className="h-5 w-5" />
            Subtitle
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSubtitles(!showSubtitles)}
            >
              {showSubtitles ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            {subtitles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={exportSubtitles}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        {!audioFile ? (
          <div className="text-center text-slate-500 py-8">
            <Subtitles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Tải lên audio để xem subtitle</p>
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-sm text-slate-600">Đang phân tích audio...</p>
            <p className="text-xs text-slate-500 mt-1">Detecting speech patterns</p>
          </div>
        ) : subtitles.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <Subtitles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Không detect được subtitle</p>
            <p className="text-xs text-slate-400 mt-1">Audio có thể không chứa speech</p>
          </div>
        ) : (
          <div className="space-y-3 h-full overflow-y-auto">
            {/* Current subtitle highlight */}
            {currentSubtitle && showSubtitles && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg sticky top-0 z-10">
                <div className="text-xs text-blue-600 font-medium mb-1">
                  Đang phát ({formatTime(currentSubtitle.startTime)} - {formatTime(currentSubtitle.endTime)})
                </div>
                <div className="text-sm font-medium text-blue-900">
                  {currentSubtitle.text}
                </div>
              </div>
            )}
            
            {/* Subtitle list */}
            {showSubtitles && (
              <div className="space-y-2">
                <div className="text-xs text-slate-500 mb-2">
                  Tất cả subtitle ({subtitles.length})
                </div>
                {subtitles.map((subtitle) => (
                  <div
                    key={subtitle.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      currentSubtitle?.id === subtitle.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                    onClick={() => onSeek(subtitle.startTime)}
                  >
                    <div className="text-xs text-slate-500 mb-1">
                      {formatTime(subtitle.startTime)} - {formatTime(subtitle.endTime)}
                    </div>
                    <div className="text-sm text-slate-900">
                      {subtitle.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Summary */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
              <div className="font-medium mb-1">Thống kê</div>
              <div>• {subtitles.length} đoạn subtitle</div>
              <div>• Tổng thời lượng: {formatTime(duration)}</div>
              <div>• Trung bình: {formatTime(duration / subtitles.length)}/đoạn</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

