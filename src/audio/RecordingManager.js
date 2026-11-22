/**
 * RecordingManager - handles canvas recording using MediaRecorder
 */

export class RecordingManager {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingStartTime = 0;
    this.stream = null;
    this.canvas = null;
    this.onDataAvailable = null;
    this.onStop = null;
    this.recordingTimer = null;
  }

  async startRecording(canvas, options = {}) {
    if (this.isRecording) return false;

    try {
      this.canvas = canvas;

      // Check for canvas.captureStream support
      if (!canvas.captureStream) {
        throw new Error('Canvas captureStream not supported');
      }

      // Check for MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported');
      }

      // Create stream from canvas
      const fps = options.fps || 30;
      this.stream = canvas.captureStream(fps);

      // Add audio if available (optional)
      // if (audioManager.audioContext) {
      //   const audioDest = audioManager.audioContext.createMediaStreamDestination();
      //   audioManager.masterGain.connect(audioDest);
      //   audioDest.stream.getAudioTracks().forEach(track => this.stream.addTrack(track));
      // }

      // Determine mime type
      const mimeType = this.getSupportedMimeType(options.mimeType);

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
        if (this.onDataAvailable) this.onDataAvailable(event);
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        this.recordingStartTime = 0;
        if (this.recordingTimer) {
          clearInterval(this.recordingTimer);
          this.recordingTimer = null;
        }
        if (this.onStop) this.onStop(this.getBlob());
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      // Start recording timer
      this.recordingTimer = setInterval(() => {
        if (this.onStop) {
          // Could emit progress updates
        }
      }, 1000);

      return true;
    } catch (e) {
      console.error('Failed to start recording:', e);
      this.cleanup();
      return false;
    }
  }

  getSupportedMimeType(preferred) {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    if (preferred && MediaRecorder.isTypeSupported(preferred)) {
      return preferred;
    }

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm'; // Fallback
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return null;

    return new Promise((resolve) => {
      this.onStop = (blob) => {
        this.cleanup();
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  async downloadRecording(filename = 'cursor-playground-recording.webm') {
    const blob = await this.stopRecording();
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

  getBlob() {
    if (this.recordedChunks.length === 0) return null;
    return new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || 'video/webm' });
  }

  getRecordingTime() {
    if (!this.isRecording || !this.recordingStartTime) return 0;
    return Date.now() - this.recordingStartTime;
  }

  getState() {
    return {
      isRecording: this.isRecording,
      duration: this.getRecordingTime(),
      mimeType: this.mediaRecorder?.mimeType,
    };
  }

  cleanup() {
    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingStartTime = 0;
  }

  isSupported() {
    return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
  }
}

export const recordingManager = new RecordingManager();