/**
 * High-performance, visually stunning Face Filter Renderers.
 * 1. Dog Filter 🐶 (Floppy bouncing ears, shiny nose, reactive lick tongue, puppy blush)
 * 2. Royal Crown 👑 (3D gold crown with rubies, sapphires, pearls, and animated glints)
 * 3. Face Color Inversion 🔄 (Precise face oval polygon clipping with inverted colors inside, untouched surroundings)
 * 4. Cool Sunglasses 😎 (Aviator/wayfarer frames with gradient tint and dynamic light glare)
 * 5. Alien Filter 👽 (Bioluminescent green face tint, oversized almond obsidian eyes, twin bobbing antennae)
 */

export class FilterEngine {
  constructor() {
    this.sparkleTimer = 0;
    this.tongueExtension = 0; // Smooth reactive interpolation for mouth opening
    this.antennaWiggle = 0;
    this.glareOffset = 0;
    this.earBounce = 0;
    this.prevRoll = 0;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
  }

  update(delta) {
    this.sparkleTimer += delta;
    this.glareOffset = (this.glareOffset + delta * 40) % 200;
  }

  renderFilter(filterType, ctx, videoElement, faces, width, height) {
    if (!faces || faces.length === 0) return;

    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      const m = face.metrics;

      ctx.save();
      switch (filterType) {
        case 'dog':
          this.renderDogFilter(ctx, m);
          break;
        case 'crown':
          this.renderCrownFilter(ctx, m);
          break;
        case 'invert':
          this.renderInversionFilter(ctx, videoElement, m, width, height);
          break;
        case 'sunglasses':
          this.renderSunglassesFilter(ctx, m);
          break;
        case 'alien':
          this.renderAlienFilter(ctx, m);
          break;
        default:
          break;
      }
      ctx.restore();
    }
  }

  // ==========================================
  // 1. DOG FILTER 🐶
  // ==========================================
  renderDogFilter(ctx, m) {
    const scale = m.eyeDistance / 100;
    const now = performance.now() / 1000;

    // Estimate ear bounce from head movement
    const rollDelta = (m.rollAngle - this.prevRoll);
    this.prevRoll = m.rollAngle;
    this.earBounce = this.earBounce * 0.85 + rollDelta * 1.5;

    // --- Puppy Cheeks & Blushes ---
    ctx.save();
    const blushR = 25 * scale;
    ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
    ctx.filter = 'blur(6px)';
    ctx.beginPath();
    ctx.arc(m.leftCheek.x, m.leftCheek.y, blushR, 0, Math.PI * 2);
    ctx.arc(m.rightCheek.x, m.rightCheek.y, blushR, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = 'none';

    // Whisker freckles
    ctx.fillStyle = '#451a03';
    const drawFreckles = (cx, cy) => {
      ctx.beginPath();
      ctx.arc(cx - 8 * scale, cy - 4 * scale, 1.8 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 8 * scale, cy - 2 * scale, 1.8 * scale, 0, Math.PI * 2);
      ctx.arc(cx, cy + 6 * scale, 1.8 * scale, 0, Math.PI * 2);
      ctx.fill();
    };
    drawFreckles(m.leftCheek.x, m.leftCheek.y);
    drawFreckles(m.rightCheek.x, m.rightCheek.y);
    ctx.restore();

    // --- Dynamic Dog Tongue ---
    // Smooth tongue extension: pops out more when mouth opens, or subtle cute tongue when closed
    const targetTongue = m.isMouthOpen ? Math.min(1.0, m.mouthOpenRatio * 1.4) : (Math.sin(now * 3) > 0.8 ? 0.3 : 0.05);
    this.tongueExtension += (targetTongue - this.tongueExtension) * 0.25;

    if (this.tongueExtension > 0.08) {
      ctx.save();
      ctx.translate(m.lowerInnerLip.x, m.lowerInnerLip.y + 4 * scale);
      ctx.rotate(m.rollAngle);

      const tongueW = 34 * scale;
      const tongueL = (30 + this.tongueExtension * 65) * scale;
      const tongueWiggle = Math.sin(now * 12) * (4 * scale * this.tongueExtension);

      // Tongue body
      ctx.save();
      ctx.translate(tongueWiggle, 0);

      // Gradient shading
      const tongueGrad = ctx.createLinearGradient(0, 0, 0, tongueL);
      tongueGrad.addColorStop(0, '#f472b6');
      tongueGrad.addColorStop(0.6, '#ec4899');
      tongueGrad.addColorStop(1, '#db2777');

      ctx.beginPath();
      ctx.moveTo(-tongueW * 0.5, 0);
      ctx.bezierCurveTo(-tongueW * 0.55, tongueL * 0.6, -tongueW * 0.4, tongueL, 0, tongueL);
      ctx.bezierCurveTo(tongueW * 0.4, tongueL, tongueW * 0.55, tongueL * 0.6, tongueW * 0.5, 0);
      ctx.closePath();
      ctx.fillStyle = tongueGrad;
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8 * scale;
      ctx.fill();

      // Tongue center indentation line
      ctx.strokeStyle = '#be185d';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.moveTo(0, 4 * scale);
      ctx.lineTo(0, tongueL * 0.75);
      ctx.stroke();

      // Specular shine on tongue tip
      ctx.beginPath();
      ctx.ellipse(-5 * scale, tongueL * 0.75, 4 * scale, 8 * scale, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();

      ctx.restore();
      ctx.restore();
    }

    // --- Dog Nose ---
    ctx.save();
    ctx.translate(m.noseTip.x, m.noseTip.y);
    ctx.rotate(m.rollAngle);

    const noseW = 42 * scale;
    const noseH = 28 * scale;

    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10 * scale;
    ctx.shadowOffsetY = 4 * scale;

    // Dark brown/black nose gradient
    const noseGrad = ctx.createRadialGradient(0, -noseH * 0.2, 2 * scale, 0, 0, noseW * 0.6);
    noseGrad.addColorStop(0, '#382216');
    noseGrad.addColorStop(0.7, '#1e140f');
    noseGrad.addColorStop(1, '#0c0704');

    ctx.beginPath();
    ctx.moveTo(-noseW * 0.5, -noseH * 0.3);
    ctx.quadraticCurveTo(0, -noseH * 0.5, noseW * 0.5, -noseH * 0.3);
    ctx.quadraticCurveTo(noseW * 0.6, noseH * 0.2, 0, noseH * 0.55);
    ctx.quadraticCurveTo(-noseW * 0.6, noseH * 0.2, -noseW * 0.5, -noseH * 0.3);
    ctx.closePath();
    ctx.fillStyle = noseGrad;
    ctx.fill();

    // Nostrils
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#050302';
    ctx.beginPath();
    ctx.ellipse(-noseW * 0.25, noseH * 0.08, 4 * scale, 2.5 * scale, 0.2, 0, Math.PI * 2);
    ctx.ellipse(noseW * 0.25, noseH * 0.08, 4 * scale, 2.5 * scale, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight on nose
    ctx.beginPath();
    ctx.ellipse(-noseW * 0.18, -noseH * 0.15, 6 * scale, 3 * scale, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();
    ctx.restore();

    // --- Floppy Dog Ears ---
    const drawDogEar = (anchorX, anchorY, isLeft) => {
      ctx.save();
      ctx.translate(anchorX, anchorY);
      const earSign = isLeft ? -1 : 1;
      const dynamicSway = isLeft ? this.earBounce : -this.earBounce;
      const naturalAngle = m.rollAngle + (isLeft ? -0.35 : 0.35) + dynamicSway + Math.sin(now * 2) * 0.05;
      ctx.rotate(naturalAngle);

      const earW = 60 * scale;
      const earH = 130 * scale;

      // Outer ear shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 12 * scale;
      ctx.shadowOffsetY = 6 * scale;

      // Outer ear shape
      const earGrad = ctx.createLinearGradient(0, 0, earSign * earW, earH);
      earGrad.addColorStop(0, '#a16207'); // warm golden brown
      earGrad.addColorStop(0.5, '#78350f');
      earGrad.addColorStop(1, '#451a03');

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(earSign * earW * 1.3, earH * 0.2, earSign * earW * 1.2, earH * 0.85, earSign * earW * 0.3, earH);
      ctx.bezierCurveTo(-earSign * earW * 0.3, earH * 0.9, -earSign * earW * 0.2, earH * 0.4, 0, 0);
      ctx.fillStyle = earGrad;
      ctx.fill();

      // Inner ear flap (pinkish warm)
      ctx.shadowColor = 'transparent';
      const innerGrad = ctx.createLinearGradient(0, earH * 0.2, earSign * earW * 0.8, earH * 0.8);
      innerGrad.addColorStop(0, '#f472b6');
      innerGrad.addColorStop(1, '#db2777');

      ctx.beginPath();
      ctx.moveTo(0, earH * 0.2);
      ctx.bezierCurveTo(earSign * earW * 0.8, earH * 0.35, earSign * earW * 0.7, earH * 0.75, earSign * earW * 0.25, earH * 0.85);
      ctx.bezierCurveTo(0, earH * 0.75, -earSign * earW * 0.05, earH * 0.4, 0, earH * 0.2);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      ctx.restore();
    };

    // Position ears on upper temples
    const leftEarAnchor = {
      x: m.leftForeheadTop.x - 20 * scale * Math.cos(m.rollAngle),
      y: m.leftForeheadTop.y - 20 * scale * Math.sin(m.rollAngle)
    };
    const rightEarAnchor = {
      x: m.rightForeheadTop.x + 20 * scale * Math.cos(m.rollAngle),
      y: m.rightForeheadTop.y + 20 * scale * Math.sin(m.rollAngle)
    };

    drawDogEar(leftEarAnchor.x, leftEarAnchor.y, true);
    drawDogEar(rightEarAnchor.x, rightEarAnchor.y, false);
  }

  // ==========================================
  // 2. ROYAL CROWN FILTER 👑
  // ==========================================
  renderCrownFilter(ctx, m) {
    const scale = (m.eyeDistance / 100) * 1.25;
    const now = performance.now() / 1000;

    ctx.save();
    // Anchor crown right above forehead top
    const crownOffsetY = 70 * scale;
    const crownX = m.foreheadTop.x - crownOffsetY * Math.sin(m.rollAngle);
    const crownY = m.foreheadTop.y - crownOffsetY * Math.cos(m.rollAngle);

    ctx.translate(crownX, crownY);
    ctx.rotate(m.rollAngle);

    // Dynamic 3D tilt perspective (yaw/pitch)
    ctx.scale(1.0 - Math.abs(m.yaw) * 0.2, 1.0);

    const w = 150 * scale;
    const h = 80 * scale;

    // Crown shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 18 * scale;
    ctx.shadowOffsetY = 8 * scale;

    // Velvet inner cap (Royal deep red)
    const velvetGrad = ctx.createRadialGradient(0, -h * 0.35, 10 * scale, 0, -h * 0.1, w * 0.45);
    velvetGrad.addColorStop(0, '#991b1b');
    velvetGrad.addColorStop(0.7, '#7f1d1d');
    velvetGrad.addColorStop(1, '#450a0a');

    ctx.beginPath();
    ctx.ellipse(0, -h * 0.25, w * 0.38, h * 0.4, 0, Math.PI, 0);
    ctx.fillStyle = velvetGrad;
    ctx.fill();

    // Velvet trim folds
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(-w * 0.28, -h * 0.2);
    ctx.quadraticCurveTo(0, -h * 0.45, w * 0.28, -h * 0.2);
    ctx.stroke();

    // Gold Gradient for Crown Spikes and Arches
    const goldGrad = ctx.createLinearGradient(-w * 0.5, -h, w * 0.5, 0);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.2, '#facc15');
    goldGrad.addColorStop(0.5, '#eab308');
    goldGrad.addColorStop(0.8, '#ca8a04');
    goldGrad.addColorStop(1, '#854d0e');

    // Ornate Crown Silhouette with 5 peaks
    ctx.beginPath();
    ctx.moveTo(-w * 0.48, 0);
    // Peak 1 (Left low)
    ctx.lineTo(-w * 0.44, -h * 0.55);
    ctx.lineTo(-w * 0.32, -h * 0.25);
    // Peak 2 (Left mid)
    ctx.lineTo(-w * 0.22, -h * 0.8);
    ctx.lineTo(-w * 0.1, -h * 0.35);
    // Peak 3 (Center High Imperial)
    ctx.lineTo(0, -h * 1.05);
    // Peak 4 (Right mid)
    ctx.lineTo(w * 0.1, -h * 0.35);
    ctx.lineTo(w * 0.22, -h * 0.8);
    // Peak 5 (Right low)
    ctx.lineTo(w * 0.32, -h * 0.25);
    ctx.lineTo(w * 0.44, -h * 0.55);
    ctx.lineTo(w * 0.48, 0);
    ctx.closePath();
    ctx.fillStyle = goldGrad;
    ctx.fill();

    // Golden Cross / Fleuron on top center peak
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, -h * 1.08, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-2 * scale, -h * 1.25, 4 * scale, 14 * scale);
    ctx.fillRect(-7 * scale, -h * 1.2, 14 * scale, 3.5 * scale);

    // Crown Base Band (Embossed gold band)
    const bandGrad = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 14 * scale);
    bandGrad.addColorStop(0, '#ca8a04');
    bandGrad.addColorStop(0.5, '#fef08a');
    bandGrad.addColorStop(1, '#a16207');

    ctx.beginPath();
    ctx.roundRect(-w * 0.5, 0, w, 14 * scale, 5 * scale);
    ctx.fillStyle = bandGrad;
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // Gemstones on Base Band
    const drawGem = (x, y, color, shineColor, size) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8 * scale;
      ctx.beginPath();
      ctx.arc(x, y, size * scale, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      // Gem highlight
      ctx.beginPath();
      ctx.arc(x - size * scale * 0.3, y - size * scale * 0.3, size * scale * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = shineColor;
      ctx.fill();
      ctx.restore();
    };

    // Central Ruby
    drawGem(0, 7 * scale, '#dc2626', '#fca5a5', 5.5);
    // Sapphires
    drawGem(-w * 0.22, 7 * scale, '#2563eb', '#93c5fd', 4.5);
    drawGem(w * 0.22, 7 * scale, '#2563eb', '#93c5fd', 4.5);
    // Emeralds
    drawGem(-w * 0.38, 7 * scale, '#16a34a', '#86efac', 3.8);
    drawGem(w * 0.38, 7 * scale, '#16a34a', '#86efac', 3.8);

    // Pearls on peak tips
    const drawPearl = (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, 4 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 1.2 * scale, y - 1.2 * scale, 1.5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };
    drawPearl(-w * 0.44, -h * 0.55);
    drawPearl(-w * 0.22, -h * 0.8);
    drawPearl(w * 0.22, -h * 0.8);
    drawPearl(w * 0.44, -h * 0.55);

    // Sparkle twinkling glints
    const drawSparkle = (x, y, phase) => {
      const sp = Math.max(0, Math.sin(now * 4 + phase));
      if (sp < 0.15) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(now * 2 + phase);
      const len = 14 * scale * sp;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.moveTo(0, -len);
      ctx.quadraticCurveTo(0, 0, len, 0);
      ctx.quadraticCurveTo(0, 0, 0, len);
      ctx.quadraticCurveTo(0, 0, -len, 0);
      ctx.quadraticCurveTo(0, 0, 0, -len);
      ctx.fill();
      ctx.restore();
    };

    drawSparkle(0, 7 * scale, 0);
    drawSparkle(-w * 0.22, -h * 0.8, 1.8);
    drawSparkle(w * 0.22, -h * 0.8, 3.4);
    drawSparkle(0, -h * 1.08, 4.9);

    ctx.restore();
  }

  // ==========================================
  // 3. FACE COLOR INVERSION 🔄
  // ==========================================
  renderInversionFilter(ctx, videoElement, m, width, height) {
    if (!m.ovalPoints || m.ovalPoints.length < 5) return;

    // Resize offscreen canvas if needed
    if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }

    const offCtx = this.offscreenCtx;
    offCtx.clearRect(0, 0, width, height);

    // 1. Draw inverted video to offscreen canvas
    offCtx.save();
    offCtx.filter = 'invert(100%)';
    offCtx.drawImage(videoElement, 0, 0, width, height);
    offCtx.restore();

    // 2. On main canvas, save context and create clipping path matching face oval
    ctx.save();
    ctx.beginPath();
    const pts = m.ovalPoints;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      // Smooth spline interpolation between oval landmark points
      const xc = (pts[i].x + pts[(i + 1) % pts.length].x) / 2;
      const yc = (pts[i].y + pts[(i + 1) % pts.length].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    ctx.closePath();

    // Clip to the face interior exclusively!
    ctx.clip();

    // Draw the inverted offscreen canvas inside the face mask
    ctx.drawImage(this.offscreenCanvas, 0, 0, width, height);

    // Soft neon rim indicator around the face boundary
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const xc = (pts[i].x + pts[(i + 1) % pts.length].x) / 2;
      const yc = (pts[i].y + pts[(i + 1) % pts.length].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)'; // subtle cyan aura
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }

  // ==========================================
  // 4. COOL SUNGLASSES 😎
  // ==========================================
  renderSunglassesFilter(ctx, m) {
    const scale = (m.eyeDistance / 100) * 1.2;

    ctx.save();
    ctx.translate(m.eyeMidpoint.x, m.eyeMidpoint.y);
    ctx.rotate(m.rollAngle);

    // Sunglasses Dimensions
    const glassW = 190 * scale;
    const glassH = 68 * scale;
    const lensW = 76 * scale;
    const lensH = 58 * scale;
    const bridgeW = 24 * scale;

    // Drop Shadow on face
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 16 * scale;
    ctx.shadowOffsetY = 8 * scale;

    // Metallic Aviator/Wayfarer Frame Gradient (Black & Brushed Titanium)
    const frameGrad = ctx.createLinearGradient(-glassW * 0.5, -glassH * 0.5, glassW * 0.5, glassH * 0.5);
    frameGrad.addColorStop(0, '#09090b');
    frameGrad.addColorStop(0.5, '#27272a');
    frameGrad.addColorStop(1, '#09090b');

    // --- Nose Bridge Bar ---
    ctx.beginPath();
    ctx.roundRect(-bridgeW * 0.5, -lensH * 0.15, bridgeW, 5 * scale, 2 * scale);
    ctx.fillStyle = '#e4e4e7';
    ctx.fill();

    // Upper Brow Top Bar
    ctx.beginPath();
    ctx.roundRect(-glassW * 0.38, -lensH * 0.48, glassW * 0.76, 4.5 * scale, 2 * scale);
    ctx.fillStyle = '#d4d4d8';
    ctx.fill();

    // Function to draw individual lens & rim
    const drawLens = (isLeft) => {
      const sign = isLeft ? -1 : 1;
      const lensCenterX = sign * (lensW * 0.5 + bridgeW * 0.45);
      const lensCenterY = 0;

      ctx.save();
      ctx.translate(lensCenterX, lensCenterY);

      // Outer Frame Rim
      ctx.beginPath();
      ctx.roundRect(-lensW * 0.5, -lensH * 0.45, lensW, lensH, [18 * scale, 18 * scale, 26 * scale, 26 * scale]);
      ctx.fillStyle = frameGrad;
      ctx.fill();
      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 2.5 * scale;
      ctx.stroke();

      // Inner Lens Tint (Sleek deep polarized dark violet/cyan gradient)
      const innerW = lensW - 6 * scale;
      const innerH = lensH - 6 * scale;

      const lensGrad = ctx.createLinearGradient(0, -innerH * 0.5, 0, innerH * 0.5);
      lensGrad.addColorStop(0, 'rgba(15, 23, 42, 0.96)');
      lensGrad.addColorStop(0.5, 'rgba(30, 27, 75, 0.93)');
      lensGrad.addColorStop(1, 'rgba(14, 116, 144, 0.90)');

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-innerW * 0.5, -innerH * 0.45, innerW, innerH, [15 * scale, 15 * scale, 23 * scale, 23 * scale]);
      ctx.clip();

      ctx.fillStyle = lensGrad;
      ctx.fill();

      // Dynamic Shimmering Light Glare / Specular Streak
      const glarePos = ((this.glareOffset + (isLeft ? 0 : 40)) % 160) - 80;
      const glareGrad = ctx.createLinearGradient(glarePos - 25 * scale, -innerH * 0.5, glarePos + 25 * scale, innerH * 0.5);
      glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      glareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
      glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.rotate(-0.4);
      ctx.fillStyle = glareGrad;
      ctx.fillRect(-innerW, -innerH, innerW * 2, innerH * 2);

      // Corner specular point
      ctx.beginPath();
      ctx.ellipse(-innerW * 0.25, -innerH * 0.25, 6 * scale, 2.5 * scale, 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fill();

      ctx.restore();
      ctx.restore();
    };

    drawLens(true);  // Left lens
    drawLens(false); // Right lens

    // Side Temple Hinges
    ctx.fillStyle = '#f4f4f5';
    ctx.beginPath();
    ctx.roundRect(-glassW * 0.48 - 4 * scale, -lensH * 0.4, 6 * scale, 8 * scale, 2 * scale);
    ctx.roundRect(glassW * 0.48 - 2 * scale, -lensH * 0.4, 6 * scale, 8 * scale, 2 * scale);
    ctx.fill();

    ctx.restore();
  }

  // ==========================================
  // 5. ALIEN FILTER 👽
  // ==========================================
  renderAlienFilter(ctx, m) {
    const scale = (m.eyeDistance / 100);
    const now = performance.now() / 1000;

    // 1. Bioluminescent Alien Green Skin Tint (clipped to face contour)
    if (m.ovalPoints && m.ovalPoints.length > 5) {
      ctx.save();
      ctx.beginPath();
      const pts = m.ovalPoints;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const xc = (pts[i].x + pts[(i + 1) % pts.length].x) / 2;
        const yc = (pts[i].y + pts[(i + 1) % pts.length].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.closePath();
      ctx.clip();

      // Ethereal green / cyan luminescent overlay
      const faceGrad = ctx.createRadialGradient(
        m.eyeMidpoint.x, m.eyeMidpoint.y, 20 * scale,
        m.eyeMidpoint.x, m.eyeMidpoint.y, 140 * scale
      );
      faceGrad.addColorStop(0, 'rgba(74, 222, 128, 0.45)');
      faceGrad.addColorStop(0.7, 'rgba(34, 197, 94, 0.38)');
      faceGrad.addColorStop(1, 'rgba(16, 185, 129, 0.30)');
      ctx.fillStyle = faceGrad;
      ctx.fill();

      // Alien cheekbone contours
      ctx.fillStyle = 'rgba(5, 150, 105, 0.25)';
      ctx.beginPath();
      ctx.ellipse(m.leftCheek.x, m.leftCheek.y, 20 * scale, 35 * scale, -0.3, 0, Math.PI * 2);
      ctx.ellipse(m.rightCheek.x, m.rightCheek.y, 20 * scale, 35 * scale, 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 2. Twin Alien Antennae (Above the head)
    const drawAntenna = (baseX, baseY, isLeft) => {
      ctx.save();
      ctx.translate(baseX, baseY);
      const sign = isLeft ? -1 : 1;
      const sway = Math.sin(now * 3 + (isLeft ? 0 : Math.PI * 0.5)) * 0.15;
      ctx.rotate(m.rollAngle + sign * 0.25 + sway);

      const antH = 80 * scale;
      const stemEndX = sign * 25 * scale;
      const stemEndY = -antH;

      // Stem (Glowing neon green wire)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(sign * 5 * scale, -antH * 0.5, stemEndX, stemEndY);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 4 * scale;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10 * scale;
      ctx.stroke();

      // Pulsing Plasma Orb at tip
      const pulse = 1.0 + Math.sin(now * 5 + (isLeft ? 0 : 2)) * 0.2;
      const orbRadius = 11 * scale * pulse;

      // Outer glow
      ctx.beginPath();
      ctx.arc(stemEndX, stemEndY, orbRadius * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
      ctx.fill();

      // Inner glowing orb
      const orbGrad = ctx.createRadialGradient(stemEndX - 2 * scale, stemEndY - 2 * scale, 2 * scale, stemEndX, stemEndY, orbRadius);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.3, '#a7f3d0');
      orbGrad.addColorStop(0.7, '#22c55e');
      orbGrad.addColorStop(1, '#15803d');

      ctx.beginPath();
      ctx.arc(stemEndX, stemEndY, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 16 * scale;
      ctx.fill();

      ctx.restore();
    };

    drawAntenna(m.leftForeheadTop.x, m.leftForeheadTop.y, true);
    drawAntenna(m.rightForeheadTop.x, m.rightForeheadTop.y, false);

    // 3. Giant Glossy Obsidian Alien Eyes
    const drawAlienEye = (eyePos, isLeft) => {
      ctx.save();
      ctx.translate(eyePos.x, eyePos.y);
      const eyeTilt = m.rollAngle + (isLeft ? -0.25 : 0.25);
      ctx.rotate(eyeTilt);

      const eyeRadiusX = 36 * scale;
      const eyeRadiusY = 24 * scale;

      // Eye shadow socket
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 14 * scale;

      // Deep Black Obsidian Eye Body
      const eyeGrad = ctx.createRadialGradient(-6 * scale, -6 * scale, 4 * scale, 0, 0, eyeRadiusX);
      eyeGrad.addColorStop(0, '#1c1917');
      eyeGrad.addColorStop(0.6, '#09090b');
      eyeGrad.addColorStop(1, '#000000');

      ctx.beginPath();
      // Almond / Tear-drop extraterrestrial eye shape
      ctx.ellipse(0, 0, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = eyeGrad;
      ctx.fill();

      // Bioluminescent neon rim
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.75)';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // Starry cosmic reflection inside
      ctx.beginPath();
      ctx.arc(4 * scale, 5 * scale, 1.2 * scale, 0, Math.PI * 2);
      ctx.arc(-8 * scale, 8 * scale, 1.0 * scale, 0, Math.PI * 2);
      ctx.arc(10 * scale, -6 * scale, 0.8 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#a7f3d0';
      ctx.fill();

      // Big primary glossy highlight
      ctx.beginPath();
      ctx.ellipse(-eyeRadiusX * 0.35, -eyeRadiusY * 0.35, 9 * scale, 5 * scale, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();

      // Secondary smaller reflection
      ctx.beginPath();
      ctx.ellipse(eyeRadiusX * 0.3, eyeRadiusY * 0.3, 4 * scale, 2 * scale, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      ctx.restore();
    };

    drawAlienEye(m.leftEye, true);
    drawAlienEye(m.rightEye, false);
  }

  // ==========================================
  // DEBUG FACE MESH WIREFRAME
  // ==========================================
  renderDebugMesh(ctx, faces, width, height) {
    if (!faces || faces.length === 0) return;

    for (let f = 0; f < faces.length; f++) {
      const face = faces[f];
      const landmarks = face.smoothedLandmarks;
      if (!landmarks) continue;

      ctx.save();
      // Draw 468 landmark points
      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      for (let i = 0; i < landmarks.length; i++) {
        const x = landmarks[i].x * width;
        const y = landmarks[i].y * height;
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Face Oval boundary
      const pts = face.metrics.ovalPoints;
      if (pts && pts.length > 0) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw Key Anchor Points
      const drawKeyPoint = (pt, label, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      };
      drawKeyPoint(face.metrics.noseTip, 'Nose', '#f43f5e');
      drawKeyPoint(face.metrics.leftEye, 'L-Eye', '#eab308');
      drawKeyPoint(face.metrics.rightEye, 'R-Eye', '#eab308');
      drawKeyPoint(face.metrics.foreheadTop, 'Forehead', '#a855f7');
      drawKeyPoint(face.metrics.chin, 'Chin', '#10b981');

      ctx.restore();
    }
  }
}
