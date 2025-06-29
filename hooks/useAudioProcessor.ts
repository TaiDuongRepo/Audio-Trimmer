import { useState, useCallback, useRef } from 'react';

interface AudioInfo {
  file: File;
  duration: number;
  audioBuffer: AudioBuffer | null;
  audioContext: AudioContext | null;
}

export const useAudioProcessor = () => {
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const loadAudioFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Create audio element for playback
      const audioElement = new Audio();
      audioElement.src = URL.createObjectURL(file);
      audioElementRef.current = audioElement;

      // Wait for metadata to load
      await new Promise((resolve, reject) => {
        audioElement.addEventListener('loadedmetadata', resolve);
        audioElement.addEventListener('error', reject);
        audioElement.load();
      });

      // Load audio buffer for processing
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      setAudioInfo({
        file,
        duration: audioElement.duration,
        audioBuffer,
        audioContext
      });

    } catch (err) {
      setError('Không thể tải file audio. Vui lòng thử lại với file khác.');
      console.error('Error loading audio:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const playAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.play();
    }
  }, []);

  const pauseAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = time;
    }
  }, []);

  const getCurrentTime = useCallback(() => {
    return audioElementRef.current?.currentTime || 0;
  }, []);

  const cleanup = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      URL.revokeObjectURL(audioElementRef.current.src);
      audioElementRef.current = null;
    }
    if (audioInfo?.audioContext) {
      audioInfo.audioContext.close();
    }
    setAudioInfo(null);
  }, [audioInfo]);

  return {
    audioInfo,
    isLoading,
    error,
    loadAudioFile,
    playAudio,
    pauseAudio,
    seekTo,
    getCurrentTime,
    cleanup,
    audioElement: audioElementRef.current
  };
};

