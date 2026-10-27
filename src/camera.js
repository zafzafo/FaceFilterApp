/**
 * Camera stream manager with front/rear switching and built-in synthetic face simulator for demo/fallback.
 */
export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.facingMode = 'user'; // 'user' | 'environment'
    this.isDemoMode = false;
    this.demoAnimId = null;
    this.demoCanvas = null;
    this.demoCtx = null;
    this.availableDevices = [];
  }

  async getDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter(d => d.kind === 'videoinput');
      return this.availableDevices;
    } catch (err) {
      console.warn('Could not enumerate devices:', err);
      return [];
    }
  }

  async startCamera(facingMode = this.facingMode) {
    this.stopDemo();
    this.stopCamera();
    this.facingMode = facingMode;
    this.isDemoMode = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera API (getUserMedia) not supported in this browser environment.');
    }

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: this.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play().then(resolve);
        };
      });
      return { success: true, mode: 'camera', facingMode: this.facingMode };
    } catch (err) {
      console.warn('Direct camera start failed:', err);
      // Try fallback with minimal constraints
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.video.srcObject = this.stream;
        await new Promise((resolve) => {
          this.video.onloadedmetadata = () => {
            this.video.play().then(resolve);
          };
        });
        return { success: true, mode: 'camera', facingMode: 'default' };
      } catch (fallbackErr) {
        console.error('Webcam access failed completely:', fallbackErr);
        throw fallbackErr;
      }
    }
  }

  async flipCamera() {
    if (this.isDemoMode) {
      // In demo mode, flip toggles alternate demo portrait
      this.demoFaceType = (this.demoFaceType === 1) ? 2 : 1;
      return { success: true, mode: 'demo', facingMode: this.facingMode };
    }
    const newFacing = this.facingMode === 'user' ? 'environment' : 'user';
    return await this.startCamera(newFacing);
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video.srcObject) {
      this.video.srcObject = null;
    }
  }

  /**
   * Generates a high quality animated face simulation rendered to an HTML5 canvas and piped
   * to the video element via captureStream().
   * MediaPipe FaceMesh can track this realistic face seamlessly!
   */
  startDemoMode() {
    this.stopCamera();
    this.stopDemo();
    this.isDemoMode = true;

    if (!this.demoCanvas) {
      this.demoCanvas = document.createElement('canvas');
      this.demoCanvas.width = 640;
      this.demoCanvas.height = 480;
      this.demoCtx = this.demoCanvas.getContext('2d');
    }

    const canvas = this.demoCanvas;
    const ctx = this.demoCtx;
    let startTime = performance.now();

    const drawDemoFrame = (now) => {
      if (!this.isDemoMode) return;
      const elapsed = (now - startTime) / 1000;

      // Realistic breathing and head sway (harmonic motions)
      const headSwayX = Math.sin(elapsed * 0.8) * 35;
      const headSwayY = Math.cos(elapsed * 0.6) * 15;
      const headRoll = Math.sin(elapsed * 0.7) * 0.12; // slight head tilt
      const mouthOpenAmount = Math.max(0, Math.sin(elapsed * 1.5) * 1.2 - 0.4); // opens mouth periodically
      const blink = (Math.sin(elapsed * 2.2) > 0.94) ? 0.1 : 1.0; // natural blinking

      const w = canvas.width;
      const h = canvas.height;

      // Studio backdrop gradient
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Studio ambient rim lighting
      const lightGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 80, w * 0.5, h * 0.4, 300);
      lightGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2 + headSwayX, h / 2 + headSwayY);
      ctx.rotate(headRoll);

      // Shoulders & Chest
      ctx.beginPath();
      ctx.ellipse(0, 230, 180, 110, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#334155';
      ctx.fill();

      // Neck
      ctx.beginPath();
      ctx.roundRect(-38, 90, 76, 90, 15);
      ctx.fillStyle = '#d49774';
      ctx.fill();

      // Neck shadow
      ctx.beginPath();
      ctx.ellipse(0, 95, 45, 15, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fill();

      // Ears
      // Left ear
      ctx.beginPath();
      ctx.ellipse(-92, 0, 16, 28, -0.1, 0, Math.PI * 2);
      ctx.fillStyle = '#e2a380';
      ctx.fill();
      // Right ear
      ctx.beginPath();
      ctx.ellipse(92, 0, 16, 28, 0.1, 0, Math.PI * 2);
      ctx.fillStyle = '#e2a380';
      ctx.fill();

      // Face Oval (Skin)
      ctx.beginPath();
      ctx.ellipse(0, -10, 90, 120, 0, 0, Math.PI * 2);
      const skinGrad = ctx.createRadialGradient(-15, -30, 20, 0, 0, 130);
      skinGrad.addColorStop(0, '#ffd1b3');
      skinGrad.addColorStop(0.7, '#f4b292');
      skinGrad.addColorStop(1, '#df9270');
      ctx.fillStyle = skinGrad;
      ctx.fill();

      // Hair (Behind & Top)
      ctx.beginPath();
      ctx.arc(0, -50, 96, Math.PI, 0, false);
      ctx.quadraticCurveTo(105, 30, 90, 70);
      ctx.quadraticCurveTo(75, -20, 60, -40);
      ctx.quadraticCurveTo(0, -20, -60, -40);
      ctx.quadraticCurveTo(-75, -20, -90, 70);
      ctx.quadraticCurveTo(-105, 30, -96, -50);
      ctx.fillStyle = '#261b17';
      ctx.fill();

      // Eyebrows
      ctx.strokeStyle = '#3d251a';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      // Left brow
      ctx.beginPath();
      ctx.moveTo(-60, -35);
      ctx.quadraticCurveTo(-38, -48, -16, -37);
      ctx.stroke();
      // Right brow
      ctx.beginPath();
      ctx.moveTo(16, -37);
      ctx.quadraticCurveTo(38, -48, 60, -35);
      ctx.stroke();

      // Eyes (Left & Right)
      const drawEye = (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        // Sclera
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 11 * blink, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#c99b8b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (blink > 0.3) {
          // Iris (warm hazel/brown)
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#533728';
          ctx.fill();

          // Pupil
          ctx.beginPath();
          ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#0f0a07';
          ctx.fill();

          // Specular catchlight
          ctx.beginPath();
          ctx.arc(-2, -2, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
        ctx.restore();
      };

      drawEye(-38, -18);
      drawEye(38, -18);

      // Nose
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(-2, 10, -12, 18);
      ctx.quadraticCurveTo(0, 22, 12, 18);
      ctx.strokeStyle = 'rgba(163, 92, 64, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Nostrils
      ctx.beginPath();
      ctx.arc(-7, 18, 2.5, 0, Math.PI * 2);
      ctx.arc(7, 18, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#8b4b32';
      ctx.fill();

      // Rosy Cheek accents
      ctx.beginPath();
      ctx.ellipse(-50, 14, 18, 12, -0.1, 0, Math.PI * 2);
      ctx.ellipse(50, 14, 18, 12, 0.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fill();

      // Mouth
      const mouthY = 56;
      const mouthH = 4 + mouthOpenAmount * 24;
      ctx.save();
      ctx.translate(0, mouthY);

      if (mouthOpenAmount > 0.15) {
        // Open mouth cavity
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, mouthH, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#5c1015';
        ctx.fill();

        // Upper teeth
        ctx.beginPath();
        ctx.roundRect(-16, -mouthH + 1, 32, 6, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Visible tongue inside
        ctx.beginPath();
        ctx.ellipse(0, mouthH * 0.4, 14, mouthH * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#d65163';
        ctx.fill();
      }

      // Lips
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.quadraticCurveTo(0, -7, 28, 0);
      ctx.quadraticCurveTo(0, mouthH * 0.8 + 6, -28, 0);
      ctx.fillStyle = '#c75965';
      ctx.fill();

      ctx.restore();
      ctx.restore();

      this.demoAnimId = requestAnimationFrame(drawDemoFrame);
    };

    this.demoAnimId = requestAnimationFrame(drawDemoFrame);

    try {
      const stream = canvas.captureStream(30);
      this.video.srcObject = stream;
      this.video.play().catch(e => console.warn('Demo video play failed:', e));
      return { success: true, mode: 'demo' };
    } catch (err) {
      console.error('Failed to capture stream from canvas:', err);
      return { success: false, error: err };
    }
  }

  stopDemo() {
    if (this.demoAnimId) {
      cancelAnimationFrame(this.demoAnimId);
      this.demoAnimId = null;
    }
  }
}
