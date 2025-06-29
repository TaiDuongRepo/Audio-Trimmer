import { useCallback } from 'react';

interface AudioExportOptions {
  audioBuffer: AudioBuffer;
  audioContext: AudioContext;
  trimMarkers: number[];
  originalFileName: string;
}

interface ExportedSegment {
  name: string;
  blob: Blob;
  duration: number;
  startTime: number;
  endTime: number;
}

export const useAudioExporter = () => {
  const exportAudioSegments = useCallback(async (options: AudioExportOptions): Promise<ExportedSegment[]> => {
    const { audioBuffer, audioContext, trimMarkers, originalFileName } = options;
    
    if (!audioBuffer || !audioContext) {
      throw new Error('Audio buffer hoặc audio context không hợp lệ');
    }

    // Lọc marker trùng đầu/cuối file (0 hoặc duration)
    const duration = audioBuffer.duration;
    let sortedMarkers = [...trimMarkers]
      .map(m => Math.max(0, Math.min(duration, m))) // Clamp vào [0, duration]
      .filter((m, i, arr) => arr.indexOf(m) === i) // Unique
      .sort((a, b) => a - b)
      .filter(m => m > 0 && m < duration); // Chỉ loại đúng 0 và duration
    // Không loại marker gần nhau

    // DEBUG LOG
    console.log('ExportAudioSegments: trimMarkers:', trimMarkers);
    console.log('ExportAudioSegments: sortedMarkers:', sortedMarkers);

    const segments: { start: number; end: number }[] = [];
    
    if (sortedMarkers.length === 0) {
      // No markers, export entire audio
      segments.push({ start: 0, end: duration });
    } else {
      // First segment: start to first marker
      segments.push({ start: 0, end: sortedMarkers[0] });
      // Middle segments: between markers
      for (let i = 0; i < sortedMarkers.length - 1; i++) {
        segments.push({ 
          start: sortedMarkers[i], 
          end: sortedMarkers[i + 1]
        });
      }
      // Last segment: last marker to end
      segments.push({ 
        start: sortedMarkers[sortedMarkers.length - 1], 
        end: duration
      });
    }

    // DEBUG LOG
    console.log('ExportAudioSegments: segments:', segments);

    const exportedSegments: ExportedSegment[] = [];
    const baseFileName = originalFileName.replace(/\.[^/.]+$/, ""); // Remove extension

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const startSample = Math.floor(segment.start * audioBuffer.sampleRate);
      const endSample = Math.floor(segment.end * audioBuffer.sampleRate);
      const segmentLength = endSample - startSample;
      
      // Create new audio buffer for this segment
      const segmentBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        segmentLength,
        audioBuffer.sampleRate
      );
      
      // Copy audio data for each channel
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const segmentData = segmentBuffer.getChannelData(channel);
        
        for (let sample = 0; sample < segmentLength; sample++) {
          segmentData[sample] = originalData[startSample + sample] || 0;
        }
      }
      
      // Convert to WAV blob
      const wavBlob = await audioBufferToWav(segmentBuffer);
      
      const segmentName = segments.length === 1 
        ? `${baseFileName}_trimmed.wav`
        : `${baseFileName}_part${i + 1}.wav`;
      
      exportedSegments.push({
        name: segmentName,
        blob: wavBlob,
        duration: segment.end - segment.start,
        startTime: segment.start,
        endTime: segment.end
      });
    }

    return exportedSegments;
  }, []);

  const downloadSegments = useCallback((segments: ExportedSegment[]) => {
    segments.forEach(segment => {
      const url = URL.createObjectURL(segment.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = segment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }, []);

  return {
    exportAudioSegments,
    downloadSegments
  };
};

// Helper function to convert AudioBuffer to WAV blob
async function audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioBuffer.length * blockAlign;
  const bufferSize = 44 + dataSize;
  
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Convert audio data
  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

