(function () {
  "use strict";

  const WORDS = [
    "Podróżuj",
    "Planuj",
    "Dziel się",
    "Zwiedzaj",
    "Twórz wspomnienia",
    "Przeżywaj",
    "Nocuj",
    "Ekscytacja",
    "Wspominaj",
  ];

  const WORD_INTERVAL = 2800;
  const CLIP_INTERVAL = 5000;

  function resolveClipSrc(clip) {
    return clip.web;
  }

  function initWordRotation() {
    const slot = document.querySelector(".hero__word-slot");
    if (!slot) return;

    var maxLen = 0;
    WORDS.forEach(function (word) {
      if (word.length > maxLen) maxLen = word.length;
    });
    slot.style.minWidth = Math.min(maxLen, 22) + "ch";

    WORDS.forEach(function (word, i) {
      const span = document.createElement("span");
      span.className = "hero__word" + (i === 0 ? " hero__word--active" : "");
      span.textContent = word;
      slot.appendChild(span);
    });

    const wordEls = slot.querySelectorAll(".hero__word");
    let index = 0;

    setInterval(function () {
      const current = wordEls[index];
      current.classList.remove("hero__word--active");
      current.classList.add("hero__word--exit");

      index = (index + 1) % wordEls.length;
      const next = wordEls[index];

      setTimeout(function () {
        wordEls.forEach(function (el) {
          el.classList.remove("hero__word--exit");
        });
        next.classList.add("hero__word--active");
      }, 400);
    }, WORD_INTERVAL);
  }

  function initVideoBackground() {
    const wrap = document.querySelector(".hero__video-wrap");
    const clips = window.WP_CLIPS;
    if (!wrap || !clips || !clips.length) return;

    const videos = clips.map(function (clip, i) {
      const video = document.createElement("video");
      video.className = "hero__video" + (i === 0 ? " hero__video--active" : "");
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("preload", "auto");

      const src = resolveClipSrc(clip);
      video.src = src;

      video.addEventListener("error", function onError() {
        video.removeEventListener("error", onError);
        if (clip.local && video.src !== clip.local) {
          video.src = clip.local;
          video.load();
        }
      });

      wrap.appendChild(video);
      return video;
    });

    let clipIndex = 0;

    function playClip(index) {
      videos.forEach(function (v, i) {
        v.classList.toggle("hero__video--active", i === index);
        if (i === index) {
          v.currentTime = 0;
          v.play().catch(function () {});
        } else {
          v.pause();
        }
      });
    }

    playClip(0);

    setInterval(function () {
      clipIndex = (clipIndex + 1) % videos.length;
      playClip(clipIndex);
    }, CLIP_INTERVAL);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initWordRotation();
    initVideoBackground();
  });
})();
