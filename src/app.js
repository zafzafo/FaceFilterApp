import { CameraManager } from './camera.js';
import { FaceTracker } from './tracker.js';
import { FilterEngine } from './filters.js';
import { sounds } from './audio.js';

class FaceFilterApp {
  constructor() {
    this.video = document.getElementById('camera-video');
    this.canvas = document.getElementById('filter-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.camera = new CameraManager(this.video);
    this.tracker = new FaceTracker();
    this.filters = new FilterEngine();

    this.currentFilter = 'dog'; // Default to dog filter for instant delight
    this.showDebugMesh = false;
    this.timerSeconds = 0; // 0 (instant), 3, 5
    this.isCapturing = false;
    this.currentFaces = [];
    this.lastFrameTime = performance.now();
    this.isLoopRunning = false;

    // DOM References
    this.fpsValueEl = document.getElementById('fps-value');
    this.facesCountEl = document.getElementById('faces-count');
    this.filterButtons = document.querySelectorAll('.filter-pill');
    this.shutterBtn = document.getElementById('btn-shutter');
    this.flipBtn = document.getElementById('btn-flip');
    this.timerBtn = document.getElementById('btn-timer');
    this.debugToggleBtn = document.getElementById('btn-debug');
    this.demoToggleBtn = document.getElementById('btn-demo');
    this.flashEl = document.getElementById('camera-flash');
    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownText = document.getElementById('countdown-text');

    // Snapshot Modal
    this.snapshotModal = document.getElementById('snapshot-modal');
    this.snapshotImage = document.getElementById('snapshot-image');
    this.downloadBtn = document.getElementById('btn-download');
    this.retakeBtn = document.getElementById('btn-retake');

    // Notification toast
    this.toastEl = document.getElementById('toast');

    this.init();
  }

  async init() {
    this.setupEventListeners();

    this.showToast('Initializing Face Detection AI...', 3000);

    // Initialize MediaPipe tracker
    try {
      await this.tracker.initialize();
      this.tracker.onResultsCallback = (faces, fps) => {
        this.currentFaces = faces;
        if (this.fpsValueEl) this.fpsValueEl.textContent = fps || 0;
        if (this.facesCountEl) this.facesCountEl.textContent = faces.length;
      };
    } catch (err) {
      console.error('Failed to initialize FaceTracker:', err);
      this.showToast('FaceMesh loading error: ' + err.message, 5000);
    }

    // Try starting camera; fallback to Demo Mode if camera is not available
    try {
      await this.camera.startCamera('user');
      this.showToast('Camera active! Face filters ready.', 2500);
    } catch (camErr) {
      console.warn('Camera failed, switching to interactive Demo Portrait Mode:', camErr);
      this.camera.startDemoMode();
      this.updateDemoButtonUI(true);
      this.showToast('Camera unavailable - Running Demo Mode!', 4000);
    }

    this.startRenderLoop();
  }

  setupEventListeners() {
    // Filter selection
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playSwitch();
        const filter = btn.dataset.filter;
        this.setFilter(filter);
      });
    });

    // Flip camera
    if (this.flipBtn) {
      this.flipBtn.addEventListener('click', async () => {
        sounds.playSwitch();
        this.flipBtn.classList.add('rotate-anim');
        setTimeout(() => this.flipBtn.classList.remove('rotate-anim'), 400);

        try {
          await this.camera.flipCamera();
          this.showToast(`Switched to ${this.camera.facingMode === 'environment' ? 'Rear' : 'Front'} camera`, 2000);
        } catch (e) {
          this.showToast('Could not flip camera', 2000);
        }
      });
    }

    // Shutter capture
    if (this.shutterBtn) {
      this.shutterBtn.addEventListener('click', () => {
        this.triggerCaptureFlow();
      });
    }

    // Timer selector (0s -> 3s -> 5s -> 0s)
    if (this.timerBtn) {
      this.timerBtn.addEventListener('click', () => {
        sounds.playSwitch();
        if (this.timerSeconds === 0) this.timerSeconds = 3;
        else if (this.timerSeconds === 3) this.timerSeconds = 5;
        else this.timerSeconds = 0;

        const label = this.timerSeconds === 0 ? 'Off' : `${this.timerSeconds}s`;
        this.timerBtn.querySelector('.btn-label').textContent = label;
        this.timerBtn.classList.toggle('active', this.timerSeconds > 0);
        this.showToast(`Timer set to: ${label}`, 1500);
      });
    }

    // Debug mesh toggle
    if (this.debugToggleBtn) {
      this.debugToggleBtn.addEventListener('click', () => {
        sounds.playSwitch();
        this.showDebugMesh = !this.showDebugMesh;
        this.debugToggleBtn.classList.toggle('active', this.showDebugMesh);
        this.showToast(`Landmark Wireframe: ${this.showDebugMesh ? 'ON' : 'OFF'}`, 1500);
      });
    }

    // Demo Mode toggle
    if (this.demoToggleBtn) {
      this.demoToggleBtn.addEventListener('click', async () => {
        sounds.playSwitch();
        if (this.camera.isDemoMode) {
          try {
            await this.camera.startCamera();
            this.updateDemoButtonUI(false);
            this.showToast('Switched to Live Camera', 2000);
          } catch (e) {
            this.showToast('Webcam unavailable. Staying in Demo Mode.', 2500);
          }
        } else {
          this.camera.startDemoMode();
          this.updateDemoButtonUI(true);
          this.showToast('Demo Portrait Mode active', 2000);
        }
      });
    }

    // Snapshot Modal Actions
    if (this.retakeBtn) {
      this.retakeBtn.addEventListener('click', () => {
        sounds.playSwitch();
        this.snapshotModal.classList.add('hidden');
      });
    }

    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => {
        sounds.playSwitch();
        const link = document.createElement('a');
        link.download = `face-filter-${this.currentFilter}-${Date.now()}.png`;
        link.href = this.snapshotImage.src;
        link.click();
        this.showToast('Photo saved!', 2000);
      });
    }

    // Window resize
    window.addEventListener('resize', () => {
      this.syncCanvasDimensions();
    });
  }

  setFilter(filterName) {
    this.currentFilter = filterName;
    this.filterButtons.forEach(btn => {
      const isSelected = btn.dataset.filter === filterName;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
  }

  updateDemoButtonUI(isDemo) {
    if (!this.demoToggleBtn) return;
    this.demoToggleBtn.classList.toggle('active', isDemo);
    const label = this.demoToggleBtn.querySelector('.btn-label');
    if (label) {
      label.textContent = isDemo ? 'Demo ON' : 'Live Cam';
    }
  }

  syncCanvasDimensions() {
    if (!this.video || this.video.videoWidth === 0) return;
    const vWidth = this.video.videoWidth;
    const vHeight = this.video.videoHeight;

    if (this.canvas.width !== vWidth || this.canvas.height !== vHeight) {
      this.canvas.width = vWidth;
      this.canvas.height = vHeight;
    }
  }

  startRenderLoop() {
    this.isLoopRunning = true;

    const render = async (now) => {
      if (!this.isLoopRunning) return;

      const delta = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      // Update animations inside FilterEngine
      this.filters.update(delta);

      // Verify video is playing and dimensions match
      if (this.video.readyState >= 2) {
        this.syncCanvasDimensions();

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Process FaceMesh detection concurrently
        this.tracker.processVideoFrame(this.video, w, h);

        // Draw camera frame to canvas
        this.ctx.save();
        // Clear canvas
        this.ctx.clearRect(0, 0, w, h);

        // If front camera, mirror image naturally like a selfie mirror
        if (this.camera.facingMode === 'user') {
          this.ctx.translate(w, 0);
          this.ctx.scale(-1, 1);
        }

        this.ctx.drawImage(this.video, 0, 0, w, h);

        // Render Active Filter if faces detected
        if (this.currentFilter !== 'none') {
          this.filters.renderFilter(this.currentFilter, this.ctx, this.video, this.currentFaces, w, h);
        }

        // Render debug mesh if enabled
        if (this.showDebugMesh) {
          this.filters.renderDebugMesh(this.ctx, this.currentFaces, w, h);
        }

        this.ctx.restore();
      }

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  async triggerCaptureFlow() {
    if (this.isCapturing) return;
    this.isCapturing = true;

    if (this.timerSeconds > 0) {
      let remaining = this.timerSeconds;
      this.countdownOverlay.classList.remove('hidden');
      this.countdownText.textContent = remaining;
      sounds.playBeep(false);

      while (remaining > 0) {
        await new Promise(r => setTimeout(r, 1000));
        remaining--;
        if (remaining > 0) {
          this.countdownText.textContent = remaining;
          sounds.playBeep(false);
        }
      }
      this.countdownOverlay.classList.add('hidden');
    }

    // Capture snapshot!
    sounds.playBeep(true);
    sounds.playShutter();

    // Trigger visual camera flash
    this.flashEl.classList.remove('flash-anim');
    void this.flashEl.offsetWidth; // trigger reflow
    this.flashEl.classList.add('flash-anim');

    // Create high-res snapshot
    const snapshotUrl = this.canvas.toDataURL('image/png');
    this.snapshotImage.src = snapshotUrl;
    this.snapshotModal.classList.remove('hidden');

    this.isCapturing = false;
  }

  showToast(message, duration = 2500) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.add('visible');

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.remove('visible');
      setTimeout(() => this.toastEl.classList.add('hidden'), 300);
    }, duration);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new FaceFilterApp();
});
