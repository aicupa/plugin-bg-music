(function () {
  // 防止重复注入
  if (window.__AICUPA_BG_MUSIC_LOADED__) return;
  window.__AICUPA_BG_MUSIC_LOADED__ = true;

  // ==========================================
  // 1. 动态引入 Tone.js
  // ==========================================
  const script = document.createElement("script");
  script.src = "https://unpkg.com/tone";
  script.async = true;
  document.head.appendChild(script);

  script.onload = () => {
    initPlugin();
  };

  function initPlugin() {
    // ==========================================
    // 2. 注入 CSS 霓虹深色样式
    // ==========================================
    const style = document.createElement("style");
    style.textContent = `
      .music-floating-container {
        position: fixed;
        right: 20px;
        bottom: 120px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        z-index: 999999; /* 确保在 Todolist 所有人机界面最上层 */
        touch-action: none;
        user-select: none;
      }
      .music-icon-wrapper {
        width: 45px;
        height: 45px;
        background: #0f172a;
        border: 2px solid #00e5ff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
        transition: border-color 0.3s, box-shadow 0.3s, transform 0.1s;
        position: relative;
        z-index: 2;
      }
      .music-icon-wrapper:active {
        cursor: grabbing;
        transform: scale(0.95);
      }
      .music-icon-wrapper svg {
        fill: #00e5ff;
        width: 20px;
        height: 20px;
        pointer-events: none;
      }
      .music-icon-wrapper.playing svg {
        animation: musicPulse 1.5s infinite alternate;
      }
      @keyframes musicPulse {
        0% { transform: scale(1); filter: drop-shadow(0 0 2px #00e5ff); }
        100% { transform: scale(1.12); filter: drop-shadow(0 0 8px #00e5ff); }
      }
      .music-control-panel {
        position: absolute;
        right: 15px;
        background: #0f172a;
        border: 1px solid #1e293b;
        padding: 10px 45px 10px 15px;
        border-radius: 20px 0 0 20px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 180px;
        opacity: 0;
        transform: translateX(20px);
        transition: opacity 0.3s, transform 0.3s;
        pointer-events: none;
        box-shadow: -5px 5px 15px rgba(0,0,0,0.5);
      }
      .music-floating-container:not(.dragging):hover .music-control-panel {
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
      }
      .music-floating-container.align-left .music-control-panel {
        right: auto;
        left: 15px;
        border-radius: 0 20px 20px 0;
        padding: 10px 15px 10px 45px;
        transform: translateX(-20px);
        box-shadow: 5px 5px 15px rgba(0,0,0,0.5);
      }
      .music-floating-container.align-left:not(.dragging):hover .music-control-panel {
        transform: translateX(0);
      }
      .music-floating-container:hover .music-icon-wrapper {
        border-color: #ffffff;
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
      }
      .music-title {
        color: #00e5ff;
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .panel-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .music-ctrl-btn {
        background: none;
        border: 1px solid #334155;
        color: #e2e8f0;
        font-size: 10px;
        padding: 2px 6px;
        cursor: pointer;
        border-radius: 3px;
      }
      .music-ctrl-btn:hover {
        border-color: #00e5ff;
        color: #00e5ff;
      }
      .music-progress-container {
        width: 100%;
        height: 4px;
        background: #334155;
        border-radius: 2px;
        position: relative;
        overflow: hidden;
      }
      .music-progress-bar {
        height: 100%;
        width: 0%;
        background: #00e5ff;
        transition: width 0.5s linear;
      }
    `;
    document.head.appendChild(style);

    // ==========================================
    // 3. 动态插入 DOM 结构
    // ==========================================
    const container = document.createElement("div");
    container.className = "music-floating-container";
    container.id = "music-container";
    container.innerHTML = `
      <div class="music-control-panel">
        <div class="music-title" id="track-name">Crystal Piano</div>
        <div class="music-progress-container">
          <div class="music-progress-bar" id="track-progress"></div>
        </div>
        <div class="panel-row">
          <button class="music-ctrl-btn" id="btn-toggle">PLAY</button>
          <button class="music-ctrl-btn" id="btn-switch">SWITCH</button>
        </div>
      </div>
      <div class="music-icon-wrapper" id="icon-trigger">
        <svg viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
    `;
    document.body.appendChild(container);

    // ==========================================
    // 4. 音频引擎调度逻辑
    // ==========================================
    let isPlaying = false;
    let currentTrackIndex = 0;
    let progressTimer = null;
    let currentStep = 0;

    const tracks = [
      { name: "Crystal Piano", stepsMax: 12 },
      { name: "Ambient Canon", stepsMax: 16 },
    ];

    const reverb = new Tone.Reverb({
      decay: 6,
      preDelay: 0.15,
      wet: 0.45,
    }).toDestination();
    const delay = new Tone.FeedbackDelay({
      delayTime: "4n.",
      feedback: 0.35,
      wet: 0.2,
    }).connect(reverb);
    const filter = new Tone.Filter({
      frequency: 1800,
      type: "lowpass",
    }).connect(delay);

    const padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.5, decay: 2, sustain: 0.4, release: 4 },
    }).connect(filter);
    padSynth.volume.value = -18;

    const leadSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.6, sustain: 0.1, release: 1.2 },
    }).connect(filter);
    leadSynth.volume.value = -10;

    const pianoChords = [
      ["F3", "A3", "C4", "E4", "G4"],
      ["G3", "B3", "D4", "G4"],
      ["C3", "E3", "G3", "B3", "D4"],
    ];
    const pianoScale = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6"];

    const canonChords = [
      ["C3", "E4", "G4"],
      ["G3", "D4", "B4"],
      ["A2", "C4", "E4"],
      ["E3", "B3", "G4"],
      ["F2", "A3", "C4"],
      ["C3", "G3", "E4"],
      ["F2", "A3", "C4"],
      ["G2", "B3", "D4"],
    ];
    const canonMelody = [
      ["C5", "G5"],
      ["B4", "G5"],
      ["A4", "E5"],
      ["G4", "E5"],
      ["F4", "C5"],
      ["E4", "C5"],
      ["F4", "C5"],
      ["D4", "G4"],
    ];

    function setupTransport() {
      Tone.getTransport().cancel();
      Tone.getTransport().bpm.value = 72;
      currentStep = 0;

      Tone.getTransport().scheduleRepeat((time) => {
        if (currentTrackIndex === 0) {
          const chord = pianoChords[currentStep % pianoChords.length];
          padSynth.triggerAttackRelease(chord, 5, time);
          if (Math.random() > 0.3) {
            const note =
              pianoScale[Math.floor(Math.random() * pianoScale.length)];
            leadSynth.triggerAttackRelease(
              note,
              "4n",
              time + Math.random() * 0.15,
            );
          }
        } else {
          const idx = currentStep % 8;
          padSynth.triggerAttackRelease(canonChords[idx], "2n", time);
          const pool = canonMelody[idx];
          leadSynth.triggerAttackRelease(pool[0], "4n", time);
          if (Math.random() > 0.4) {
            leadSynth.triggerAttackRelease(
              pool[1],
              "8n",
              time + Tone.Time("4n"),
            );
          }
        }
        currentStep++;
      }, "2n");
    }

    // ==========================================
    // 5. 交互绑定与拖拽定位
    // ==========================================
    const icon = document.getElementById("icon-trigger");
    const btnToggle = document.getElementById("btn-toggle");
    const btnSwitch = document.getElementById("btn-switch");
    const trackName = document.getElementById("track-name");
    const progressBar = document.getElementById("track-progress");

    let isDragging = false;
    let hasMoved = false;
    let startX = 0,
      startY = 0;
    let initialLeft = 0,
      initialTop = 0;

    function onStart(e) {
      isDragging = true;
      hasMoved = false;
      container.classList.add("dragging");

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;

      const rect = container.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      container.style.right = "auto";
      container.style.bottom = "auto";
      container.style.left = `${initialLeft}px`;
      container.style.top = `${initialTop}px`;

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
    }

    function onMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved = true;
      }

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      const padding = 10;
      newLeft = Math.max(padding, Math.min(window.innerWidth - 55, newLeft));
      newTop = Math.max(padding, Math.min(window.innerHeight - 55, newTop));

      container.style.left = `${newLeft}px`;
      container.style.top = `${newTop}px`;
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove("dragging");

      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);

      const rect = container.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const padding = 20;

      container.style.transition =
        "left 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)";
      if (rect.left + rect.width / 2 < screenWidth / 2) {
        container.style.left = `${padding}px`;
        container.classList.add("align-left");
      } else {
        container.style.left = `${screenWidth - rect.width - padding}px`;
        container.classList.remove("align-left");
      }

      setTimeout(() => {
        container.style.transition = "";
      }, 300);
    }

    async function togglePlay() {
      if (hasMoved) return; // 拖动时不触发播放/暂停

      await Tone.start();
      await reverb.ready;

      if (!isPlaying) {
        setupTransport();
        Tone.getTransport().start();
        icon.classList.add("playing");
        btnToggle.innerText = "PAUSE";
        isPlaying = true;
        progressTimer = setInterval(() => {
          const max = tracks[currentTrackIndex].stepsMax;
          progressBar.style.width = `${((currentStep % max) / max) * 100}%`;
        }, 500);
      } else {
        Tone.getTransport().stop();
        icon.classList.remove("playing");
        btnToggle.innerText = "PLAY";
        isPlaying = false;
        clearInterval(progressTimer);
      }
    }

    icon.addEventListener("mousedown", onStart);
    icon.addEventListener("touchstart", onStart, { passive: true });
    icon.addEventListener("click", togglePlay);
    btnToggle.addEventListener("click", togglePlay);

    btnSwitch.addEventListener("click", () => {
      currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
      trackName.innerText = tracks[currentTrackIndex].name;
      currentStep = 0;
      progressBar.style.width = "0%";
      if (isPlaying) setupTransport();
    });
  }
})();
