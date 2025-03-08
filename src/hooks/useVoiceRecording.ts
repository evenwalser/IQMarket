import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

interface VoiceRecordingOptions {
  onRecordingComplete?: (audioBase64: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  maxDuration?: number; // Maximum recording duration in ms
  silenceThreshold?: number; // Amplitude threshold for silence detection
  silenceTimeout?: number; // How long silence must persist to auto-stop (ms)
  sampleRate?: number; // Sample rate for audio recording
  encoderBitRate?: number; // Bit rate for the encoder
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  recordingTime: number;
  audioUrl: string | null;
  audioBlob: Blob | null;
  audioBase64: string | null;
}

/**
 * Custom hook for voice recording with advanced features
 */
export const useVoiceRecording = (options: VoiceRecordingOptions = {}) => {
  // Default options
  const {
    onRecordingComplete,
    onRecordingStart,
    onRecordingStop,
    maxDuration = 60000, // 1 minute by default
    silenceThreshold = 0.01, // Very low by default
    silenceTimeout = 2000, // 2 seconds by default
    sampleRate = 48000,
    encoderBitRate = 128000,
    echoCancellation = true,
    noiseSuppression = true,
    autoGainControl = true,
  } = options;

  // State
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    isProcessing: false,
    recordingTime: 0,
    audioUrl: null,
    audioBlob: null,
    audioBase64: null,
  });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timeUpdateIntervalRef = useRef<number | null>(null);
  const maxDurationTimeoutRef = useRef<number | null>(null);
  const silenceDetectionRef = useRef<{
    lastNonSilentTime: number;
    analyser: AnalyserNode | null;
    silenceCheckInterval: number | null;
  }>({
    lastNonSilentTime: 0,
    analyser: null,
    silenceCheckInterval: null,
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Reset all state and refs
   */
  const resetRecording = useCallback(() => {
    // Clear all intervals and timeouts
    if (timeUpdateIntervalRef.current) {
      window.clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }

    if (maxDurationTimeoutRef.current) {
      window.clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }

    if (silenceDetectionRef.current.silenceCheckInterval) {
      window.clearInterval(silenceDetectionRef.current.silenceCheckInterval);
      silenceDetectionRef.current.silenceCheckInterval = null;
    }

    // Stop and release the media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close the audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    // Reset the silence detection
    silenceDetectionRef.current = {
      lastNonSilentTime: 0,
      analyser: null,
      silenceCheckInterval: null,
    };

    // Reset chunks
    audioChunksRef.current = [];

    // Reset media recorder
    mediaRecorderRef.current = null;

    // Reset time tracking
    startTimeRef.current = 0;
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      // Reset any previous recording state
      resetRecording();

      // Request microphone access
      setState(prev => ({ ...prev, isProcessing: true }));
      console.log("Requesting microphone access");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation,
          noiseSuppression,
          autoGainControl,
        },
      });

      streamRef.current = stream;

      // Create and configure the MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: encoderBitRate,
      });

      mediaRecorderRef.current = mediaRecorder;

      // Set up the audio context for silence detection
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      silenceDetectionRef.current.analyser = analyser;

      // Set up event handlers
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        processRecording();
        if (onRecordingStop) {
          onRecordingStop();
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setState(prev => ({ ...prev, isRecording: true, isProcessing: false }));
      console.log("Recording started");

      // Start the timer update interval
      timeUpdateIntervalRef.current = window.setInterval(() => {
        const currentTime = Date.now() - startTimeRef.current;
        setState(prev => ({ ...prev, recordingTime: currentTime }));
      }, 100);

      // Set up automatic stop after maxDuration
      maxDurationTimeoutRef.current = window.setTimeout(() => {
        console.log(`Recording reached maximum duration of ${maxDuration}ms`);
        stopRecording();
      }, maxDuration);

      // Set up silence detection interval
      silenceDetectionRef.current.lastNonSilentTime = Date.now();
      silenceDetectionRef.current.silenceCheckInterval = window.setInterval(() => {
        if (!silenceDetectionRef.current.analyser) return;

        const bufferLength = silenceDetectionRef.current.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        silenceDetectionRef.current.analyser.getByteFrequencyData(dataArray);

        // Calculate the average amplitude
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength / 255;

        // Check if the sound is above the threshold
        if (average > silenceThreshold) {
          silenceDetectionRef.current.lastNonSilentTime = Date.now();
        } else {
          const silenceDuration = Date.now() - silenceDetectionRef.current.lastNonSilentTime;
          
          // If silence has persisted for longer than the threshold, stop recording
          if (silenceDuration > silenceTimeout) {
            console.log(`Silence detected for ${silenceDuration}ms, stopping recording`);
            stopRecording();
          }
        }
      }, 100);

      // Notify the caller
      if (onRecordingStart) {
        onRecordingStart();
      }

    } catch (error) {
      console.error("Error starting recording:", error);
      resetRecording();
      setState(prev => ({ ...prev, isProcessing: false }));
      toast.error("Could not access microphone. Please check permissions.");
    }
  }, [
    resetRecording, 
    onRecordingStart, 
    onRecordingStop, 
    maxDuration, 
    silenceThreshold, 
    silenceTimeout,
    sampleRate,
    encoderBitRate,
    echoCancellation,
    noiseSuppression,
    autoGainControl
  ]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !state.isRecording) {
      console.warn("No active recording to stop");
      return;
    }

    if (mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
        setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));
        console.log("Recording stopped");
      } catch (error) {
        console.error("Error stopping recording:", error);
        toast.error("Error stopping recording");
      }
    }
  }, [state.isRecording]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !state.isRecording || state.isPaused) {
      return;
    }

    try {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
      console.log("Recording paused");

      // Pause the timer
      if (timeUpdateIntervalRef.current) {
        window.clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    } catch (error) {
      console.error("Error pausing recording:", error);
      toast.error("Error pausing recording");
    }
  }, [state.isRecording, state.isPaused]);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !state.isRecording || !state.isPaused) {
      return;
    }

    try {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      console.log("Recording resumed");

      // Resume the timer
      timeUpdateIntervalRef.current = window.setInterval(() => {
        const currentTime = Date.now() - startTimeRef.current;
        setState(prev => ({ ...prev, recordingTime: currentTime }));
      }, 100);
    } catch (error) {
      console.error("Error resuming recording:", error);
      toast.error("Error resuming recording");
    }
  }, [state.isRecording, state.isPaused]);

  /**
   * Process the recorded audio chunks
   */
  const processRecording = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      console.warn("No audio chunks to process");
      setState(prev => ({ ...prev, isProcessing: false }));
      return;
    }

    try {
      console.log(`Processing ${audioChunksRef.current.length} audio chunks`);
      
      // Create a blob from the audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Convert to base64
      const base64 = await blobToBase64(audioBlob);
      
      setState(prev => ({
        ...prev,
        audioBlob,
        audioUrl,
        audioBase64: base64,
        isProcessing: false,
      }));
      
      console.log("Recording processed successfully");
      
      if (onRecordingComplete && base64) {
        onRecordingComplete(base64);
      }
    } catch (error) {
      console.error("Error processing recording:", error);
      setState(prev => ({ ...prev, isProcessing: false }));
      toast.error("Error processing recording");
    }
  }, [onRecordingComplete]);

  /**
   * Convert a blob to a base64 string
   */
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Extract just the base64 data without the MIME type prefix
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  /**
   * Cancel the current recording
   */
  const cancelRecording = useCallback(() => {
    if (state.isRecording) {
      // Stop the recorder, but don't process the result
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.error("Error stopping recorder during cancel:", error);
        }
      }
    }
    
    resetRecording();
    
    setState({
      isRecording: false,
      isPaused: false,
      isProcessing: false,
      recordingTime: 0,
      audioUrl: null,
      audioBlob: null,
      audioBase64: null,
    });
    
    console.log("Recording cancelled");
  }, [state.isRecording, resetRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      resetRecording();
    };
  }, [resetRecording]);

  // Return the state and functions
  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
};
