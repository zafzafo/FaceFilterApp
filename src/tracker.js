/**
 * Real-time MediaPipe FaceMesh tracker with coordinate smoothing (EMA) and multi-face geometric metrics.
 */

// Indices for the outer face oval boundary (36 points)
export const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
];

export class FaceTracker {
  constructor() {
    this.faceMesh = null;
    this.isReady = false;
    this.isProcessing = false;
    this.smoothedFaces = []; // Stores smoothed landmarks per face index
    this.smoothingFactor = 0.65; // 0.65 current + 0.35 previous for crisp responsiveness with zero jitter
    this.onResultsCallback = null;
    this.lastTimestamp = 0;
    this.fps = 0;
    this.fpsTimer = performance.now();
    this.frameCount = 0;
  }

  async initialize() {
    if (typeof window.FaceMesh === 'undefined') {
      throw new Error('MediaPipe FaceMesh script is not loaded in the window scope.');
    }

    this.faceMesh = new window.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    this.faceMesh.setOptions({
      maxNumFaces: 4,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults((results) => {
      this.handleResults(results);
    });

    // Warm-up
    this.isReady = true;
    return true;
  }

  async processVideoFrame(videoElement, width, height) {
    if (!this.isReady || !this.faceMesh || this.isProcessing) return;
    if (!videoElement || videoElement.readyState < 2) return;

    this.isProcessing = true;
    try {
      await this.faceMesh.send({ image: videoElement });
    } catch (err) {
      console.warn('FaceMesh frame processing error:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  handleResults(results) {
    const now = performance.now();
    this.frameCount++;
    if (now - this.fpsTimer >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = now;
    }

    const multiFaceLandmarks = results.multiFaceLandmarks || [];
    const imageW = results.image ? (results.image.width || 1280) : 1280;
    const imageH = results.image ? (results.image.height || 720) : 720;

    const processedFaces = [];

    // Align smoothing buffer with current detected face count
    while (this.smoothedFaces.length > multiFaceLandmarks.length) {
      this.smoothedFaces.pop();
    }

    for (let f = 0; f < multiFaceLandmarks.length; f++) {
      const rawLandmarks = multiFaceLandmarks[f];
      if (!this.smoothedFaces[f] || this.smoothedFaces[f].length !== rawLandmarks.length) {
        // Initialize with raw
        this.smoothedFaces[f] = rawLandmarks.map(pt => ({ x: pt.x, y: pt.y, z: pt.z }));
      } else {
        // Apply Exponential Moving Average (EMA) smoothing
        const sf = this.smoothedFaces[f];
        const alpha = this.smoothingFactor;
        for (let i = 0; i < rawLandmarks.length; i++) {
          const raw = rawLandmarks[i];
          sf[i].x = sf[i].x * (1 - alpha) + raw.x * alpha;
          sf[i].y = sf[i].y * (1 - alpha) + raw.y * alpha;
          sf[i].z = sf[i].z * (1 - alpha) + raw.z * alpha;
        }
      }

      const smoothed = this.smoothedFaces[f];
      // Compute pixel-space metrics for rendering
      const metrics = this.computeMetrics(smoothed, imageW, imageH);
      processedFaces.push({
        rawLandmarks,
        smoothedLandmarks: smoothed,
        metrics,
        imageW,
        imageH
      });
    }

    if (this.onResultsCallback) {
      this.onResultsCallback(processedFaces, this.fps);
    }
  }

  computeMetrics(landmarks, width, height) {
    // Helper to get pixel coordinates
    const pt = (index) => {
      const l = landmarks[index] || { x: 0, y: 0, z: 0 };
      return {
        x: l.x * width,
        y: l.y * height,
        z: (l.z || 0) * width
      };
    };

    // Key facial landmarks
    const foreheadTop = pt(10);
    const chin = pt(152);
    const noseTip = pt(1);
    const noseBridge = pt(168);
    const noseBottom = pt(2);

    // Left eye (landmark 468 or average of 33, 133)
    const leftEye = landmarks[468] ? pt(468) : {
      x: (pt(33).x + pt(133).x) / 2,
      y: (pt(33).y + pt(133).y) / 2,
      z: (pt(33).z + pt(133).z) / 2
    };

    // Right eye (landmark 473 or average of 263, 362)
    const rightEye = landmarks[473] ? pt(473) : {
      x: (pt(263).x + pt(362).x) / 2,
      y: (pt(263).y + pt(362).y) / 2,
      z: (pt(263).z + pt(362).z) / 2
    };

    const eyeMidpoint = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
      z: (leftEye.z + rightEye.z) / 2
    };

    const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    const faceHeight = Math.hypot(chin.x - foreheadTop.x, chin.y - foreheadTop.y);

    // Roll angle (2D head tilt in radians)
    const rollAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

    // Yaw (left / right head turn estimate: -1 to 1)
    const distToLeft = Math.hypot(noseTip.x - leftEye.x, noseTip.y - leftEye.y);
    const distToRight = Math.hypot(noseTip.x - rightEye.x, noseTip.y - rightEye.y);
    const yaw = (distToRight - distToLeft) / Math.max(1, eyeDistance);

    // Pitch (up / down head tilt estimate: -1 to 1)
    const pitch = (noseTip.y - eyeMidpoint.y) / Math.max(1, faceHeight) - 0.35;

    // Mouth openness
    const upperInnerLip = pt(13);
    const lowerInnerLip = pt(14);
    const mouthHeight = Math.hypot(lowerInnerLip.x - upperInnerLip.x, lowerInnerLip.y - upperInnerLip.y);
    const mouthOpenRatio = mouthHeight / Math.max(1, eyeDistance * 0.3); // > 0.4 indicates open mouth
    const isMouthOpen = mouthOpenRatio > 0.35;

    // Left and right temple points for width
    const leftTemple = pt(234);
    const rightTemple = pt(454);
    const faceWidth = Math.hypot(rightTemple.x - leftTemple.x, rightTemple.y - leftTemple.y);

    // Cheeks
    const leftCheek = pt(205);
    const rightCheek = pt(425);

    // Forehead anchor points for crown / ears / antennae
    const leftForeheadTop = pt(67);
    const rightForeheadTop = pt(297);

    // Face oval pixel points for clipping
    const ovalPoints = FACE_OVAL_INDICES.map(idx => pt(idx));

    return {
      foreheadTop,
      chin,
      noseTip,
      noseBridge,
      noseBottom,
      leftEye,
      rightEye,
      eyeMidpoint,
      eyeDistance,
      faceHeight,
      faceWidth,
      rollAngle,
      yaw,
      pitch,
      mouthHeight,
      mouthOpenRatio,
      isMouthOpen,
      upperInnerLip,
      lowerInnerLip,
      leftTemple,
      rightTemple,
      leftCheek,
      rightCheek,
      leftForeheadTop,
      rightForeheadTop,
      ovalPoints,
      pt
    };
  }
}
