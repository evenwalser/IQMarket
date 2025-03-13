
/**
 * Audio processing utilities for voice interaction
 */

// Convert Float32Array audio data to base64 encoded PCM16 for OpenAI API
export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  // Convert Float32Array (-1.0 to 1.0) to Int16Array (-32768 to 32767)
  const int16Array = new Int16Array(float32Array.length);
  
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to safe range and scale
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Convert to Uint8Array for base64 encoding
  const uint8Array = new Uint8Array(int16Array.buffer);
  
  // Convert to base64 string in chunks to avoid call stack issues
  return uint8ArrayToBase64(uint8Array);
};

// Efficient conversion of Uint8Array to base64 string
export const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
  const chunks: string[] = [];
  const chunkSize = 0x8000; // Process in ~32KB chunks
  
  // Process the array in chunks to avoid call stack size limits
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
  }
  
  return btoa(chunks.join(''));
};

// Class for audio recording with Web API
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  
  constructor(private onDataAvailable?: (data: Blob) => void) {}
  
  async start(): Promise<boolean> {
    if (this.isRecording) return true;
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000 // OpenAI requires 24kHz
        }
      });
      
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
          
          if (this.onDataAvailable) {
            this.onDataAvailable(e.data);
          }
        }
      };
      
      this.mediaRecorder.start(250); // Capture in 250ms chunks
      this.isRecording = true;
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }
  
  stop(): Blob | null {
    if (!this.isRecording || !this.mediaRecorder) return null;
    
    this.mediaRecorder.stop();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.isRecording = false;
    
    // Combine audio chunks into a single blob
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.audioChunks = [];
    
    return audioBlob;
  }
  
  isActive(): boolean {
    return this.isRecording;
  }
}
