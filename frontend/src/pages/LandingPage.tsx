import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { HERO_WORDS, WP_CLIPS } from "../shared/clips";
import { Topbar } from "../shared/layout/Topbar";
import { Icon } from "../shared/ui/Icon";

const WORD_INTERVAL = 2800;
const CLIP_INTERVAL = 5000;

export function LandingPage() {
  const navigate = useNavigate();
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setExiting(true);
      window.setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % HERO_WORDS.length);
        setExiting(false);
      }, 400);
    }, WORD_INTERVAL);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const wrap = videoWrapRef.current;
    if (!wrap) return;

    const videos = WP_CLIPS.map((clip, i) => {
      const video = document.createElement("video");
      video.className = `hero__video${i === 0 ? " hero__video--active" : ""}`;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("preload", "auto");
      video.src = clip.web;
      wrap.appendChild(video);
      return video;
    });

    let clipIndex = 0;

    function playClip(index: number) {
      videos.forEach((v, i) => {
        v.classList.toggle("hero__video--active", i === index);
        if (i === index) {
          v.currentTime = 0;
          void v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }

    playClip(0);
    const interval = window.setInterval(() => {
      clipIndex = (clipIndex + 1) % videos.length;
      playClip(clipIndex);
    }, CLIP_INTERVAL);

    return () => {
      window.clearInterval(interval);
      videos.forEach((v) => v.remove());
    };
  }, []);

  const maxWordLen = Math.min(Math.max(...HERO_WORDS.map((w) => w.length)), 22);

  return (
    <div className="app app--landing">
      <Topbar landing />
      <div className="app-body app-body--landing">
        <main className="main main--landing">
          <section className="hero" aria-label="Strona główna">
            <div className="hero__video-wrap" ref={videoWrapRef} aria-hidden="true" />
            <div className="hero__overlay" aria-hidden="true" />

            <div className="hero__content">
              <div className="hero__split">
                <div className="hero__brand">
                  <img
                    src="/logo/WanderPall-logo_color.svg"
                    alt=""
                    className="hero__brand-logo"
                    width={120}
                    height={88}
                  />
                  <p className="hero__brand-name">
                    <span className="hero__brand-wander">Wander</span>
                    <span className="hero__brand-pall">Pall</span>
                  </p>
                </div>

                <div className="hero__message">
                  <h1 className="hero__headline">
                    <span
                      className="hero__word-slot"
                      aria-live="polite"
                      style={{ minWidth: `${maxWordLen}ch` }}
                    >
                      <span
                        className={`hero__word hero__word--active${exiting ? " hero__word--exit" : ""}`}
                      >
                        {HERO_WORDS[wordIndex]}
                      </span>
                    </span>
                    &nbsp;
                    <span className="hero__together">razem.</span>
                  </h1>

                  <div className="hero__actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--hero btn--with-icon"
                      onClick={() => navigate("/register")}
                    >
                      W drogę!
                      <Icon name="arrow-right" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <footer className="hero__footer">
              <Link to="/projects" className="btn btn--secondary btn--dev">
                Przejrzyj projekt
              </Link>
              <p className="hero__dev">tryb deweloperski</p>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}
