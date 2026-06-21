(function () {
  if (window.__AICUPA_BG_MUSIC_LOADED__) return;
  window.__AICUPA_BG_MUSIC_LOADED__ = true;

  // 1. 动态引入 Tone.js
  const script = document.createElement("script");
  script.src = "https://unpkg.com/tone";
  script.async = true;
  document.head.appendChild(script);

  script.onload = () => {
    initPlugin();
  };

  function initPlugin() {
    // 2. 注入全局样式 (包含曲目列表的抽屉动画)
    const style = document.createElement("style");
    style.textContent = `
      .music-floating-container {
        position: fixed;
        right: 20px;
        bottom: 120px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        z-index: 999999;
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
      .music-icon-wrapper:active { cursor: grabbing; transform: scale(0.95); }
      .music-icon-wrapper svg { fill: #00e5ff; width: 20px; height: 20px; pointer-events: none; }
      .music-icon-wrapper.playing svg { animation: musicPulse 1.5s infinite alternate; }
      
      @keyframes musicPulse {
        0% { transform: scale(1); filter: drop-shadow(0 0 2px #00e5ff); }
        100% { transform: scale(1.12); filter: drop-shadow(0 0 8px #00e5ff); }
      }
      
      /* 控制面板基础样式 */
      .music-control-panel {
        position: absolute;
        right: 15px;
        background: #0f172a;
        border: 1px solid #1e293b;
        padding: 12px 45px 12px 15px;
        border-radius: 16px 0 0 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 200px;
        opacity: 0;
        transform: translateX(20px);
        transition: opacity 0.3s, transform 0.3s, height 0.3s;
        pointer-events: none;
        box-shadow: -5px 5px 15px rgba(0,0,0,0.5);
        overflow: hidden;
      }
      
      /* Hover 激活主面板 */
      .music-floating-container:not(.dragging):hover .music-control-panel {
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
      }
      
      /* 左靠齐适配 */
      .music-floating-container.align-left .music-control-panel {
        right: auto;
        left: 15px;
        border-radius: 0 16px 16px 0;
        padding: 12px 15px 12px 45px;
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
        font-weight: bold;
      }
      
      .panel-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      
      .music-ctrl-btn {
        background: none;
        border: 1px solid #334155;
        color: #e2e8f0;
        font-size: 10px;
        padding: 3px 8px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
      }
      .music-ctrl-btn:hover { border-color: #00e5ff; color: #00e5ff; }
      
      .music-progress-container { width: 100%; height: 4px; background: #334155; border-radius: 2px; position: relative; overflow: hidden; }
      .music-progress-bar { height: 100%; width: 0%; background: #00e5ff; transition: width 0.5s linear; }
      
      /* === 新增：曲库列表样式 === */
      .music-playlist-drawer {
        border-top: 1px solid #1e293b;
        margin-top: 4px;
        padding-top: 8px;
        display: none; /* 默认折叠 */
        flex-direction: column;
        gap: 4px;
        max-height: 150px;
        overflow-y: auto;
      }
      /* 自定义滚动条 */
      .music-playlist-drawer::-webkit-scrollbar { width: 4px; }
      .music-playlist-drawer::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
      
      /* 控制面板展开状态样式触发 */
      .music-control-panel.list-expanded .music-playlist-drawer {
        display: flex;
      }
      
      .playlist-item {
        font-size: 10px;
        color: #94a3b8;
        padding: 5px 6px;
        cursor: pointer;
        border-radius: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: all 0.2s;
      }
      .playlist-item:hover {
        background: rgba(0, 229, 255, 0.1);
        color: #ffffff;
      }
      .playlist-item.active {
        color: #00e5ff;
        background: rgba(0, 229, 255, 0.15);
        font-weight: bold;
        border-left: 2px solid #00e5ff;
      }
    `;
    document.head.appendChild(style);

    // 3. 动态插入 DOM (加入了 LIST 列表切换按钮和列表容器)
    const container = document.createElement("div");
    container.className = "music-floating-container";
    container.id = "music-container";
    container.innerHTML = `
      <div class="music-control-panel" id="control-panel">
        <div class="music-title" id="track-name">1. Crystal Piano</div>
        <div class="music-progress-container">
          <div class="music-progress-bar" id="track-progress"></div>
        </div>
        <div class="panel-row">
          <button class="music-ctrl-btn" id="btn-toggle">PLAY</button>
          <button class="music-ctrl-btn" id="btn-list">LIST ☰</button>
        </div>
        <div class="music-playlist-drawer" id="playlist-drawer"></div>
      </div>
      <div class="music-icon-wrapper" id="icon-trigger">
        <svg viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
    `;
    document.body.appendChild(container);

    // 4. 音频核心配置与多曲目矩阵
    let isPlaying = false;
    let currentTrackIndex = 0;
    let progressTimer = null;
    let currentStep = 0;

    const tracks = [
      { name: "1. Crystal Piano", stepsMax: 12, bpm: 72 },
      { name: "2. Ambient Canon", stepsMax: 16, bpm: 72 },
      { name: "3. Always With Me", stepsMax: 16, bpm: 84 },
      { name: "4. Air on G String", stepsMax: 16, bpm: 60 },
      { name: "5. Gymnopédie No.1", stepsMax: 8, bpm: 54 },
    ];

    const reverb = new Tone.Reverb({
      decay: 7,
      preDelay: 0.15,
      wet: 0.45,
    }).toDestination();
    const delay = new Tone.FeedbackDelay({
      delayTime: "4n.",
      feedback: 0.35,
      wet: 0.2,
    }).connect(reverb);
    const filter = new Tone.Filter({
      frequency: 2000,
      type: "lowpass",
    }).connect(delay);

    const padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.3, decay: 2, sustain: 0.5, release: 3.5 },
    }).connect(filter);
    padSynth.volume.value = -18;

    const leadSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.6, sustain: 0.1, release: 1.2 },
    }).connect(filter);
    leadSynth.volume.value = -10;

    // 乐理矩阵
    const pChords = [
      ["F3", "A3", "C4", "E4"],
      ["G3", "B3", "D4", "G4"],
      ["C3", "E3", "G3", "B3"],
    ];
    const pScale = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6"];
    const cChords = [
      ["C3", "E4"],
      ["G3", "D4"],
      ["A2", "C4"],
      ["E3", "B3"],
      ["F2", "A3"],
      ["C3", "G3"],
      ["F2", "A3"],
      ["G2", "B3"],
    ];
    const cMelody = [
      ["C5", "G5"],
      ["B4", "G5"],
      ["A4", "E5"],
      ["G4", "E5"],
      ["F4", "C5"],
      ["E4", "C5"],
      ["F4", "C5"],
      ["D4", "G4"],
    ];
    const ghibliChords = [
      ["F3", "A3", "C4"],
      ["C3", "E3", "G3"],
      ["G3", "B3", "D4"],
      ["A2", "C3", "E3"],
      ["F3", "A3", "C4"],
      ["C3", "E3", "G3"],
      ["G3", "B3", "D4"],
      ["C3", "E4", "G4"],
    ];
    const ghibliMelody = [
      ["A4", "C5"],
      ["G4", "C5"],
      ["F4", "D5"],
      ["E4", "C5"],
      ["F4", "A4"],
      ["E4", "G4"],
      ["D4", "F4"],
      ["C4", "E5"],
    ];
    const bachBass = [
      ["C3", "E4"],
      ["B2", "D4"],
      ["A2", "C4"],
      ["G2", "B3"],
      ["F2", "A3"],
      ["E2", "G3"],
      ["D2", "F3"],
      ["G2", "F3"],
    ];
    const bachMelody = [
      ["E5", "G5"],
      ["F5", "A5"],
      ["C5", "E5"],
      ["B4", "D5"],
      ["A4", "C5"],
      ["G4", "B4"],
      ["F4", "A4"],
      ["B4", "G5"],
    ];
    const satieChords = [
      ["G2", "B3", "D4", "F#4"],
      ["D2", "F#3", "A3", "C#4"],
    ];
    const satieMelody = ["F#5", "A5", "C#6", "B5", "E5", "D5", "A4", "F#4"];

    function setupTransport() {
      Tone.getTransport().cancel();
      Tone.getTransport().bpm.value = tracks[currentTrackIndex].bpm;
      currentStep = 0;

      Tone.getTransport().scheduleRepeat((time) => {
        const step = currentStep;
        if (currentTrackIndex === 0) {
          padSynth.triggerAttackRelease(
            pChords[step % pChords.length],
            "2n",
            time,
          );
          if (Math.random() > 0.3)
            leadSynth.triggerAttackRelease(
              pScale[Math.floor(Math.random() * pScale.length)],
              "4n",
              time + Math.random() * 0.1,
            );
        } else if (currentTrackIndex === 1) {
          const idx = step % 8;
          padSynth.triggerAttackRelease(cChords[idx], "2n", time);
          leadSynth.triggerAttackRelease(cMelody[idx][step % 2], "4n", time);
          if (Math.random() > 0.5)
            leadSynth.triggerAttackRelease(
              cMelody[idx][1],
              "8n",
              time + Tone.Time("4n"),
            );
        } else if (currentTrackIndex === 2) {
          const idx = step % 8;
          padSynth.triggerAttackRelease(ghibliChords[idx], "2n", time);
          leadSynth.triggerAttackRelease(
            ghibliMelody[idx][Math.floor(Math.random() * 2)],
            "4n",
            time,
          );
        } else if (currentTrackIndex === 3) {
          const idx = step % 8;
          padSynth.triggerAttackRelease(bachBass[idx], "2n", time);
          leadSynth.triggerAttackRelease(
            step % 2 === 0 ? bachMelody[idx][0] : bachMelody[idx][1],
            "4n",
            time,
          );
        } else if (currentTrackIndex === 4) {
          padSynth.triggerAttackRelease(satieChords[step % 2], "1m", time);
          if (step % 2 === 0)
            leadSynth.triggerAttackRelease(
              satieMelody[Math.floor(step / 2) % satieMelody.length],
              "2n",
              time + Tone.Time("4n"),
            );
        }
        currentStep++;
      }, "2n");
    }

    // 5. DOM 节点引用与渲染逻辑
    const icon = document.getElementById("icon-trigger");
    const btnToggle = document.getElementById("btn-toggle");
    const btnList = document.getElementById("btn-list");
    const panel = document.getElementById("control-panel");
    const drawer = document.getElementById("playlist-drawer");
    const trackName = document.getElementById("track-name");
    const progressBar = document.getElementById("track-progress");

    // 动态渲染曲目列表
    function renderPlaylist() {
      drawer.innerHTML = "";
      tracks.forEach((track, index) => {
        const item = document.createElement("div");
        item.className = `playlist-item ${index === currentTrackIndex ? "active" : ""}`;
        item.innerText = track.name;

        // 绑定点击曲目切歌事件
        item.addEventListener("click", (e) => {
          e.stopPropagation(); // 阻止冒泡
          selectTrack(index);
        });
        drawer.appendChild(item);
      });
    }

    function selectTrack(index) {
      currentTrackIndex = index;
      trackName.innerText = tracks[currentTrackIndex].name;
      currentStep = 0;
      progressBar.style.width = "0%";
      renderPlaylist(); // 刷新高亮状态

      if (isPlaying) {
        setupTransport();
      } else {
        togglePlay(); // 如果之前没播放，点击列表曲目直接触发播放
      }
    }

    // 6. 交互控制
    let isDragging = false,
      hasMoved = false;
    let startX = 0,
      startY = 0,
      initialLeft = 0,
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
    }

    function onMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - startX,
        deltaY = clientY - startY;
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) hasMoved = true;
      let nl = initialLeft + deltaX,
        nt = initialTop + deltaY;
      nl = Math.max(10, Math.min(window.innerWidth - 55, nl));
      nt = Math.max(10, Math.min(window.innerHeight - 55, nt));
      container.style.left = `${nl}px`;
      container.style.top = `${nt}px`;
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove("dragging");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      const rect = container.getBoundingClientRect();
      const sw = window.innerWidth;
      container.style.transition =
        "left 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)";
      if (rect.left + rect.width / 2 < sw / 2) {
        container.style.left = "20px";
        container.classList.add("align-left");
      } else {
        container.style.left = `${sw - rect.width - 20}px`;
        container.classList.remove("align-left");
      }
      setTimeout(() => {
        container.style.transition = "";
      }, 300);
    }

    async function togglePlay() {
      if (hasMoved) return; // 拖拽时不执行点击
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

    // 事件注册
    icon.addEventListener("mousedown", onStart);
    icon.addEventListener("click", togglePlay);
    btnToggle.addEventListener("click", togglePlay);

    // LIST 按钮：控制列表展开与收起
    btnList.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.toggle("list-expanded");
    });

    // 首次渲染列表
    renderPlaylist();
  }
})();
