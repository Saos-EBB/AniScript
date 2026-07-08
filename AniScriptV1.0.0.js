// ==UserScript==
// @name         AniScript Lite (ScriptCat)
// @namespace    SaosOne
// @version      0.2.5
// @description  Schlanke Comfort-Version für Aniworld+VOE: Autoplay, Intro-Skip, Auto-nächste-Episode, Skip-Hotkeys (X/C/V/B), Episoden-Fortschritt + Switch & Settings-Panel. Ohne externe Libraries, läuft in ScriptCat.
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

/* ═══════════════════════════════════════════════════════════════════════
 *  AniScript Lite – Comfort-Features für Aniworld + VOE-Player
 *  Basiert auf AniScript Lite 0.1.5 (Saos-EBB)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  ⚠️ WICHTIGE ERKENNTNISSE AUS DEM DEBUGGING – BITTE LESEN BEVOR ÄNDERN ⚠️
 *  (jede dieser Zeilen war Stunden an Arbeit, nicht nochmal neu lösen!)
 *
 *  1) MANIFEST V3 / BROWSER
 *     - Läuft NUR unter ScriptCat, NICHT Tampermonkey 5.5.0!
 *       TM 5.5.0 hat unter Brave einen Bug: es injiziert Scripts NICHT in
 *       Sub-iframes (nur in den Top-Frame). Der VOE-Player lebt aber in
 *       einem cross-origin iframe → TM erreicht ihn nie. ScriptCat injiziert
 *       korrekt in Frames. Getestet und bestätigt.
 *     - In den Browser-Extension-Einstellungen muss "Zugriff auf Websites"
 *       auf ALLE Websites stehen (nicht "bei bestimmten Seiten"), weil VOE
 *       ständig neue Mirror-Domains nutzt (pamelachangemission.com, u.v.a.).
 *
 *  2) FRAME-ARCHITEKTUR
 *     - Aniworld (Top-Frame) bettet den Player als iframe ein. Das Video
 *       liegt im iframe auf einer rotierenden VOE-Mirror-Domain.
 *     - Deshalb Wildcard-@match (alle URLs): wir wissen die Player-Domain
 *       nicht vorher. Das Script beendet sich auf fremden Seiten sofort.
 *     - Kommunikation iframe <-> Top-Frame läuft über postMessage (NICHT
 *       GM-Storage/CommLink wie im großen AniScript). postMessage braucht
 *       keine externen Libs und funktioniert cross-origin.
 *
 *  3) DER BIG-PLAY-FALLBACK IST NICHT OPTIONAL! (onVideo, ganz unten)
 *     - Der Klick auf div.jw-icon-display ist das, was den JWPlayer
 *       überhaupt zum Laden der Video-Quelle anstößt.
 *     - OHNE diesen Klick bleibt video.networkState für immer bei 0
 *       (NETWORK_EMPTY) und rs bei 0 → das Video startet NIE.
 *     - Bewiesen: Version ohne den Klick hing 22s bei net=0 und gab auf.
 *       Version mit Klick lief nach ~9s. Der Button SIEHT aus wie Rewind,
 *       ist aber der Lade-Trigger. NICHT entfernen!
 *
 *  4) AUTOPLAY / BRAVE
 *     - Brave blockt Autoplay MIT Ton. Deshalb: erst video.muted = true,
 *       dann play(). Stumm ist immer erlaubt.
 *     - Entmutet wird beim ERSTEN User-Klick/Tastendruck. Der Unmute-
 *       Listener MUSS capture:true + passive:true sein, sonst verschluckt
 *       er den Klick und Play/Pause im Player funktioniert nicht mehr.
 *     - net=2 heißt NUR "lädt gerade", NICHT abspielbar. Erst readyState>=3
 *       ist wirklich bereit. "playing"-Event ist die zuverlässigste Wahrheit,
 *       dass das Video tatsächlich läuft.
 *
 *  5) VOE SABOTIERT DevTools
 *     - VOE ersetzt das console-Objekt der Seite (console.clear-Fehler im
 *       Log). Deshalb loggen wir über ein eigenes Panel (postMessage an den
 *       Top-Frame), nicht über console.log im iframe.
 *
 *  6) EXTERNE LIBRARIES VERMEIDEN
 *     - Das große AniScript nutzt keyboardJS + Notiflix via @require. Die
 *       laden in ScriptCat NICHT zuverlässig in Frames. Deshalb hier alles
 *       in Vanilla-JS, kein @require.
 *
 *  NEU in 0.2.0 gegenüber 0.1.5:
 *   - Toggle-Switch in der JWPlayer-Controlbar (grün = Autoplay an)
 *   - Rechtsklick auf den Switch öffnet ein Settings-Panel
 *   - Werte persistent via GM_setValue
 * ═══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ═══════════════════════════════════════════════
  // SETTINGS – Defaults + Persistenz (GM_setValue)
  // ═══════════════════════════════════════════════
  const DEFAULTS = {
    autoPlay: true, // Video automatisch starten
    introSkip: true, // am Anfang automatisch vorspringen
    introSkipSeconds: 85, // auf welche Sekunde springen
    autoNextEpisode: true, // am Ende zur nächsten Folge
    outroThresholdSec: 90, // ab wie vielen Sek. Restzeit "nächste Folge"
    nextCountdownSec: 5, // Countdown vor dem Umschalten
    // Skip-Hotkeys: X/C/V/B springen vorwärts, Alt+Taste rückwärts.
    // Hier nur die Sekunden einstellbar, Tasten sind fest.
    skipX: 15,
    skipC: 30,
    skipV: 60,
    skipB: 90,
    // Versteckter Zustand (nicht im Settings-Panel): merkt sich, ob der
    // Theater-Modus (F) an war, um ihn nach Reload/Folgen-Wechsel
    // automatisch wiederherzustellen.
    theaterMode: false,
  };

  function loadConfig() {
    const cfg = { ...DEFAULTS };
    try {
      for (const k of Object.keys(DEFAULTS)) {
        const v = GM_getValue(k, undefined);
        if (v !== undefined) cfg[k] = v;
      }
    } catch {
      /* GM nicht verfügbar → Defaults */
    }
    return cfg;
  }
  function saveConfig(key, value) {
    CONFIG[key] = value;
    try {
      GM_setValue(key, value);
    } catch {
      /* egal */
    }
  }
  const CONFIG = loadConfig();

  const MARK = "ANISCRIPT_LITE";
  // Zwei Welten: dieses Script läuft dank Wildcard-@match potenziell überall.
  // inIframe unterscheidet, ob wir im Aniworld-Top-Frame (UI/Navigation) oder
  // im VOE-Player-iframe (Video-Steuerung) sind. Auf fremden Seiten (weder
  // Aniworld noch iframe mit Video) beenden wir uns weiter unten sofort.
  const inIframe = window.self !== window.top;
  const host = location.hostname || "";
  const isAniworld =
    /(^|\.)aniworld\.(to|tv)$/i.test(host) || /(^|\.)s\.to$/i.test(host);

  // ═══════════════════════════════════════════════
  // LOGGING – Dev-Panel entfernt. devLog ist jetzt eine No-Op-Funktion,
  // damit die vielen devLog(...)-Aufrufe im Code weiter funktionieren,
  // aber nichts anzeigen. Zum Debuggen kann man hier console.log
  // aktivieren (im iframe wegen VOE-console-Sabotage ggf. unzuverlässig).
  // ═══════════════════════════════════════════════
  function devLog(msg) {
    try {
      console.log("[AniLite]", msg);
    } catch {}
  } // temporär für FS-Diagnose

  // ═══════════════════════════════════════════════
  // TOP-FRAME (Aniworld): Episode-Navigation + Watch-Progress
  // ═══════════════════════════════════════════════
  if (!inIframe && isAniworld) {
    // ── Watch-Progress: { episodeId: prozent(0..1) } in GM-Storage ──
    const WATCH_KEY = "watchProgress";
    const WATCHED_AT = 0.8; // ab 80% gilt als "voll geschaut"
    const HIGHLIGHT_COLOR = "#ffdd00"; // fest (YAGNI – keine Farbwahl)

    function getProgress() {
      try {
        return JSON.parse(GM_getValue(WATCH_KEY) || "{}");
      } catch {
        return {};
      }
    }
    function saveProgress(obj) {
      try {
        GM_setValue(WATCH_KEY, JSON.stringify(obj));
      } catch {}
    }
    // Färbt einen Episode-Link als Gradient (Farbe bis pct%, Rest transparent)
    function colorLink(episodeId, pct) {
      const link = document.querySelector(`a[data-episode-id="${episodeId}"]`);
      if (!link) return;
      if (pct <= 0) {
        link.style.background = "";
        return;
      }
      const p = Math.round(pct * 100);
      link.style.background = `linear-gradient(to right, ${HIGHLIGHT_COLOR} ${p}%, transparent ${p}%)`;
    }
    // Alle gespeicherten Fortschritte auf die aktuell sichtbaren Links anwenden
    function applyAllProgress() {
      const data = getProgress();
      for (const [id, pct] of Object.entries(data)) colorLink(id, pct);
    }
    // Reset: alles löschen und entfärben
    function resetProgress() {
      saveProgress({});
      document
        .querySelectorAll("a[data-episode-id]")
        .forEach((a) => (a.style.background = ""));
      devLog("Watch-Progress zurückgesetzt");
    }
    // Die episodeId der aktuell geöffneten Folge aus dem Aniworld-DOM lesen
    function currentEpisodeId() {
      // aktive Episode im Nav, sonst der Titel-Container mit data-episode-id
      return (
        document.querySelector("div#stream a.active[data-episode-id]")?.dataset
          .episodeId ||
        document.querySelector("[data-episode-id]")?.dataset.episodeId ||
        null
      );
    }

    applyAllProgress(); // beim Laden sofort einfärben

    window.addEventListener("message", (ev) => {
      const d = ev.data;
      if (!d || !d[MARK]) return;
      if (d.action === "NEXT_EPISODE") {
        devLog("→ Befehl: nächste Episode");
        goToNextEpisode();
      }
      if (d.action === "TOGGLE_FULLSCREEN") {
        toggleIframeFullscreen();
      }
      if (d.action === "RESET_PROGRESS") {
        resetProgress();
      }
      if (d.action === "PROGRESS") {
        // iframe meldet nur den Fortschritt (0..1) der LAUFENDEN Folge.
        // Welche Episode das ist, weiß nur der Top-Frame → hier zuordnen.
        const id = currentEpisodeId();
        if (!id) return;
        const data = getProgress();
        const prev = data[id] || 0;
        const val = d.progress >= WATCHED_AT ? 1.0 : d.progress; // ab 80% → voll
        if (val > prev) {
          data[id] = val;
          saveProgress(data);
          colorLink(id, val);
        }
      }
    });

    // ── "Fullscreen" als CSS-THEATER-MODUS (Fake Fullscreen) ──
    // Bewusst KEINE echte Fullscreen-API. Gründe (hart erkämpfte Learnings):
    //  - Echter FS auf dem iframe stirbt beim src-Wechsel zur nächsten Folge
    //    (cross-origin Navigation ersetzt das iframe-Dokument).
    //  - Echter FS auf dem Container macht Layout-Chaos, weil Aniworlds
    //    iframe fest ~410×500px ist (Briefmarken-Video im schwarzen Screen).
    //  - Re-Fullscreen nach Wechsel scheitert an der User-Gesten-Pflicht.
    // CSS-Theater umgeht ALLES davon: Container fixed über den Viewport,
    // iframe auf 100%. Kein API-State, den der Browser beenden könnte →
    // der Folgen-Wechsel kann den Modus prinzipbedingt nicht rauswerfen.
    // Für echtes OS-Vollbild zusätzlich F11 (Browser-Chrome-FS, hängt nicht
    // an Elementen und überlebt iframe-Wechsel ebenfalls).
    let theaterOn = false;
    let theaterSaved = null; // Original-Styles zum Wiederherstellen

    function applyTheater(on) {
      const iframe = document.querySelector("div.inSiteWebStream iframe");
      const container =
        iframe?.closest("div.inSiteWebStream") || iframe?.parentElement;
      if (!iframe || !container) return false;

      if (on && !theaterOn) {
        theaterSaved = {
          c: container.getAttribute("style") || "",
          i: iframe.getAttribute("style") || "",
          bodyOverflow: document.body.style.overflow,
        };
        container.style.cssText +=
          ";position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483000;background:#000;margin:0;padding:0";
        iframe.style.cssText +=
          ";position:absolute;inset:0;width:100vw;height:100vh;border:0";
        document.body.style.overflow = "hidden";
        theaterOn = true;
        devLog("Theater-Modus AN");
      } else if (!on && theaterOn) {
        container.setAttribute("style", theaterSaved?.c || "");
        iframe.setAttribute("style", theaterSaved?.i || "");
        document.body.style.overflow = theaterSaved?.bodyOverflow || "";
        theaterOn = false;
        devLog("Theater-Modus AUS");
      }
      return true;
    }

    function toggleIframeFullscreen() {
      const next = !theaterOn;
      applyTheater(next);
      // Zustand MERKEN → überlebt jeden Reload/Folgen-Wechsel. Beim nächsten
      // Seitenladen wird der Modus unten automatisch wiederhergestellt.
      saveConfig("theaterMode", next);
    }

    // AUTO-RESTORE: War Theater beim letzten Mal an, sofort wieder aktivieren,
    // sobald der Player-iframe im DOM ist. Braucht keine User-Geste (nur CSS)
    // → funktioniert auch nach hartem Seiten-Reload. Damit muss man nie
    // scrollen: der Player liegt fix über dem Viewport.
    if (CONFIG.theaterMode) {
      if (!applyTheater(true)) {
        const thObs = new MutationObserver(() => {
          if (applyTheater(true)) thObs.disconnect();
        });
        thObs.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
        setTimeout(() => thObs.disconnect(), 20000);
      }
    }

    // "Nächste Folge": vom iframe angefordert (Video zu Ende). Läuft im
    // Top-Frame, weil nur hier die Episoden-Navigation im DOM liegt.
    //
    // SMOOTH-MODUS (für Fullscreen-Bingen): Statt die ganze Seite neu zu
    // laden (location.href → Fullscreen ginge verloren), holen wir die
    // nächste Aniworld-Seite per fetch, ziehen die Player-iframe-URL aus
    // ihrem HTML und tauschen nur die src unseres iframes. Das iframe-
    // ELEMENT bleibt im DOM → ein aktiver Fullscreen darauf überlebt.
    //
    // ACHTUNG: Selektoren hängen am ALTEN Aniworld-Layout (div#stream…,
    // div.inSiteWebStream iframe). Ändert Aniworld sein HTML, hier anpassen.
    // YAGNI: keine Multi-Layout-Erkennung wie im großen AniScript.
    async function goToNextEpisode() {
      try {
        const navContainer = document.querySelector(
          "div#stream.hosterSiteDirectNav",
        );
        if (!navContainer) {
          devLog("⚠ keine Navigation gefunden");
          return;
        }
        const uls = navContainer.querySelectorAll("ul");
        const episodesUl = uls[uls.length - 1];
        const links = [...episodesUl.querySelectorAll("a")];
        const activeIdx = links.findIndex((a) =>
          a.classList.contains("active"),
        );
        if (activeIdx < 0 || activeIdx >= links.length - 1) {
          devLog("letzte Episode erreicht");
          return;
        }

        const nextHref = links[activeIdx + 1].href;
        const iframe = document.querySelector("div.inSiteWebStream iframe");
        if (!iframe) {
          devLog("kein Player-iframe → harter Fallback");
          location.href = nextHref;
          return;
        }

        devLog("lade nächste Folge (smooth): " + nextHref);
        // Nächste Aniworld-Seite holen und die Player-iframe-URL rausziehen
        const html = await (
          await fetch(nextHref, { credentials: "include" })
        ).text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const nextSrc = doc
          .querySelector("div.inSiteWebStream iframe")
          ?.getAttribute("src");
        if (!nextSrc) {
          devLog("keine iframe-src gefunden → harter Fallback");
          location.href = nextHref;
          return;
        }

        // Nur den iframe umladen → Fullscreen bleibt erhalten
        iframe.src = nextSrc.startsWith("http")
          ? nextSrc
          : new URL(nextSrc, location.origin).href;

        // URL + aktive Episode im DOM nachziehen (ohne Reload)
        history.pushState({}, "", nextHref);
        links.forEach((a) => a.classList.remove("active"));
        links[activeIdx + 1].classList.add("active");
      } catch (e) {
        devLog(
          "Smooth-Navigation fehlgeschlagen, harter Fallback: " +
            (e && e.message),
        );
        // Wenn irgendwas schiefgeht: lieber hart neu laden als hängen bleiben
        const navContainer = document.querySelector(
          "div#stream.hosterSiteDirectNav",
        );
        const links = navContainer
          ? [...navContainer.querySelectorAll("ul:last-child a")]
          : [];
        const activeIdx = links.findIndex((a) =>
          a.classList.contains("active"),
        );
        if (activeIdx >= 0 && activeIdx < links.length - 1)
          location.href = links[activeIdx + 1].href;
      }
    }
    return;
  }

  // Fremde Top-Level-Seite (nicht Aniworld, nicht im iframe): das Script
  // hat hier nichts zu tun → sofort still beenden. Wichtig wegen @match
  // Wildcard-@match – ohne dieses return würde das Panel-/UI-Zeug überall laufen.
  if (!inIframe) return;

  // ═══════════════════════════════════════════════
  // IFRAME: VOE-Player steuern
  // ═══════════════════════════════════════════════
  devLog("iframe aktiv auf " + host);

  let autoplayDone = false;
  let introSkipped = false;
  let nextTriggered = false;

  // Entmutet beim ersten User-Input. KRITISCH: capture:true + passive:true!
  // Entmutet beim ersten User-Input. Nur über pointerdown (Klick), NICHT
  // über keydown – sonst kollidiert das Entmuten mit dem ersten Leertasten-
  // Druck (Pause) und JWPlayer verschluckt die Taste. Die Leertaste selbst
  // handhaben wir explizit in setupSkipHotkeys (Pause-Toggle).
  // passive:true → wir lesen nur mit, verschlucken den Klick nicht.
  function setupUnmute(video) {
    const unmute = () => {
      video.muted = false;
      window.removeEventListener("pointerdown", unmute, true);
    };
    window.addEventListener("pointerdown", unmute, {
      capture: true,
      passive: true,
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // PLAY-LOGIK – UNVERÄNDERT aus 0.1.5. NICHT ANFASSEN OHNE NOT!
  // Diese Version wurde ausgiebig getestet und funktioniert. Frühere
  // "sauberere" Umbauten (rein event-basiert, ohne Polling) sind alle
  // gescheitert, weil sie den Big-Play-Fallback-Klick brauchten, der
  // erst weiter unten in onVideo() passiert. Zusammenspiel beachten!
  // ─────────────────────────────────────────────────────────────────
  function tryPlay(video) {
    if (autoplayDone || !CONFIG.autoPlay) return;
    // Erst STUMM (Brave erlaubt nur stummes Autoplay), Ton kommt beim
    // ersten Klick via setupUnmute() zurück.
    video.muted = true;

    let finished = false;
    const finish = (via) => {
      if (finished) return;
      finished = true;
      autoplayDone = true;
      clearTimeout(timer);
      video.removeEventListener("playing", onPlaying);
      devLog("✓ Läuft (" + via + ")");
      setupUnmute(video);
    };
    // "playing"-Event = zuverlässigster Beweis, dass wirklich Bild läuft.
    // (play() kann resolven, bevor tatsächlich etwas zu sehen ist.)
    const onPlaying = () => finish("playing-event");
    video.addEventListener("playing", onPlaying);

    // Polling mit exponentiellem Backoff (300ms → 450 → 675 … max 3s).
    // Kein festes Intervall, um den Player nicht zu stressen.
    let delay = 300;
    let attempt = 0;
    const MAX_WAIT_MS = 20000;
    const startedAt = Date.now();
    let timer;

    const attemptPlay = () => {
      if (finished) return;
      attempt++;
      // net>0 ODER rs>0 = Player hat mit dem Laden begonnen. Solange beides
      // 0 ist, gibt es nichts abzuspielen → nur warten (der Big-Play-Klick
      // in onVideo stößt das Laden an, siehe Erkenntnis #3 im Header).
      const hasSource = video.networkState > 0 || video.readyState > 0;
      const elapsed = Date.now() - startedAt;
      if (elapsed > MAX_WAIT_MS) {
        devLog(
          "⚠ Aufgegeben nach " +
            Math.round(elapsed / 1000) +
            "s (net=" +
            video.networkState +
            " rs=" +
            video.readyState +
            ")",
        );
        return;
      }
      if (!hasSource) {
        devLog("warte auf Quelle (net=0) …");
        schedule();
        return;
      }
      video
        .play()
        .then(() => {
          /* playing-Event ist die Wahrheit */
        })
        .catch(() => {
          // play() abgelehnt → echten Play-Button klicken (NICHT rewind!).
          // Nur 2x, um keinen Dauerklick-Krieg mit dem Player zu starten.
          const btn = document.querySelector(
            ".jw-icon-playback, button[aria-label='Play']",
          );
          if (btn && attempt <= 2) {
            devLog("→ Play-Button geklickt");
            btn.click();
          }
        });
      schedule();
    };
    function schedule() {
      if (finished) return;
      timer = setTimeout(attemptPlay, delay);
      delay = Math.min(Math.round(delay * 1.5), 3000);
    }
    attemptPlay();
  }

  function checkIntroSkip(video) {
    if (!CONFIG.introSkip || introSkipped) return;
    if (video.currentTime > 15) {
      introSkipped = true;
      return;
    }
    if (video.readyState < 2) return;
    const target = isFinite(video.duration)
      ? Math.min(CONFIG.introSkipSeconds, video.duration - 10)
      : CONFIG.introSkipSeconds;
    if (target > 0) {
      introSkipped = true;
      video.currentTime = target;
      devLog("Intro übersprungen → " + Math.round(target) + "s");
    }
  }

  function checkOutro(video) {
    if (!CONFIG.autoNextEpisode || nextTriggered) return;
    if (!isFinite(video.duration) || video.duration <= 0) return;
    if (video.duration < CONFIG.outroThresholdSec * 2) return;
    const remaining = video.duration - video.currentTime;
    if (remaining > 0 && remaining <= CONFIG.outroThresholdSec) {
      nextTriggered = true;
      devLog(
        "Outro erreicht (" + Math.round(remaining) + "s Rest) → Countdown",
      );
      startNextCountdown();
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // TASTEN-HOTKEYS:
  //   X/C/V/B vorwärts, Alt+Taste rückwärts (Sekunden aus CONFIG)
  //   F = Vollbild an/aus (HARDCODED, bewusst nicht in den Settings)
  // Ein einziger keydown-Listener (kein keyboardJS nötig).
  // ─────────────────────────────────────────────────────────────────
  function setupSkipHotkeys(video) {
    const KEYMAP = { x: "skipX", c: "skipC", v: "skipV", b: "skipB" };
    window.addEventListener(
      "keydown",
      (e) => {
        // Nicht auslösen, wenn gerade in einem Eingabefeld getippt wird
        const tag = (e.target && e.target.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || e.isComposing) return;
        const key = e.key.toLowerCase();

        // Erster Tastendruck entmutet (falls Autoplay stumm gestartet ist)
        if (video.muted) video.muted = false;

        // Leertaste → Pause/Play-Toggle (explizit, damit es zuverlässig geht)
        if (key === " " || e.code === "Space") {
          e.preventDefault();
          if (video.paused) video.play().catch(() => {});
          else video.pause();
          return;
        }

        // F → Vollbild toggeln (fest verdrahtet)
        if (key === "f" && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          toggleFullscreen(video);
          return;
        }

        // X/C/V/B → springen
        const cfgKey = KEYMAP[key];
        if (!cfgKey) return;
        e.preventDefault();
        const sec = CONFIG[cfgKey];
        if (e.altKey) {
          video.currentTime = Math.max(0, video.currentTime - sec);
          showSkipToast("−" + sec + "s");
        } else {
          video.currentTime = Math.min(
            video.duration || 1e9,
            video.currentTime + sec,
          );
          showSkipToast("+" + sec + "s");
        }
      },
      true,
    ); // capture:true, damit wir vor dem Player dran sind
  }

  // Vollbild. Für "smooth Bingen" muss der Fullscreen den Episoden-Wechsel
  // (iframe-src-Tausch) überleben. Das geht nur, wenn der Fullscreen auf dem
  // iframe-ELEMENT im Top-Frame liegt – NICHT auf JWPlayers internem Container
  // (der wird beim src-Wechsel zerstört). Wir sind aber im iframe und können
  // das iframe-Element nicht selbst fullscreenen → wir bitten den Top-Frame
  // per postMessage darum. Er hat die passende Referenz.
  function toggleFullscreen(_video) {
    try {
      window.top.postMessage(
        { [MARK]: true, action: "TOGGLE_FULLSCREEN" },
        "*",
      );
    } catch {}
  }

  let skipToastEl = null;
  let skipToastTimer = null;
  function showSkipToast(text) {
    if (!skipToastEl) {
      skipToastEl = document.createElement("div");
      skipToastEl.style.cssText =
        "position:fixed;bottom:16px;left:16px;z-index:2147483647;padding:8px 14px;background:rgba(20,20,35,.9);color:#fff;font:700 15px monospace;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.4);pointer-events:none;transition:opacity .2s";
    }
    // an den aktuellen Anzeige-Kontext hängen (Vollbild oder body), damit
    // der Toast auch im Fullscreen sichtbar ist
    const mount = document.fullscreenElement || document.body;
    if (skipToastEl.parentNode !== mount) mount.appendChild(skipToastEl);
    skipToastEl.textContent = text;
    skipToastEl.style.opacity = "1";
    clearTimeout(skipToastTimer);
    skipToastTimer = setTimeout(() => {
      if (skipToastEl) skipToastEl.style.opacity = "0";
    }, 800);
  }

  // ─────────────────────────────────────────────────────────────────
  // WATCH-PROGRESS: alle 5s den Fortschritt (0..1) an den Top-Frame
  // schicken. Der iframe weiß NICHT, welche Episode das ist – nur der
  // Top-Frame kennt die Episode-ID. Also: wir senden nur die Zahl,
  // Zuordnung + Speichern passiert oben.
  // ─────────────────────────────────────────────────────────────────
  function setupProgressReport(video) {
    let lastSent = 0;
    video.addEventListener("timeupdate", () => {
      const now = Date.now();
      if (now - lastSent < 5000) return;
      if (!isFinite(video.duration) || video.duration <= 0) return;
      const progress = video.currentTime / video.duration;
      if (progress <= 0) return;
      lastSent = now;
      try {
        window.top.postMessage(
          { [MARK]: true, action: "PROGRESS", progress: Math.min(progress, 1) },
          "*",
        );
      } catch {}
    });
  }

  function startNextCountdown() {
    let sec = CONFIG.nextCountdownSec;
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;bottom:16px;right:16px;z-index:2147483647;padding:10px 16px;background:rgba(20,20,35,.92);color:#fff;font:600 14px sans-serif;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.4)";
    const render = () =>
      (el.textContent = "⏭ Nächste Folge in " + sec + "s (Esc = Abbruch)");
    render();
    document.body.appendChild(el);
    const cancel = (e) => {
      if (e.key === "Escape") {
        clearInterval(timer);
        el.remove();
        document.removeEventListener("keydown", cancel);
        devLog("Auto-Next abgebrochen");
      }
    };
    document.addEventListener("keydown", cancel);
    const timer = setInterval(() => {
      sec--;
      if (sec <= 0) {
        clearInterval(timer);
        el.remove();
        document.removeEventListener("keydown", cancel);
        devLog("→ sende NEXT_EPISODE an Top-Frame");
        try {
          window.top.postMessage({ [MARK]: true, action: "NEXT_EPISODE" }, "*");
        } catch {}
      } else render();
    }, 1000);
  }

  // ═══════════════════════════════════════════════
  // NEU: TOGGLE-SWITCH in der Controlbar + SETTINGS-PANEL
  // ═══════════════════════════════════════════════

  // ---- kleiner Toggle-Switch (grün = an) ----
  function makeSwitch(initialOn, onToggle) {
    const sw = document.createElement("div");
    sw.title = "Autoplay an/aus  •  Rechtsklick: Einstellungen";
    sw.style.cssText =
      "display:inline-flex;align-items:center;cursor:pointer;width:34px;height:18px;margin:0 6px;vertical-align:middle;flex:0 0 auto";
    const track = document.createElement("div");
    track.style.cssText =
      "position:relative;width:34px;height:18px;border-radius:9px;transition:background .2s";
    const knob = document.createElement("div");
    knob.style.cssText =
      "position:absolute;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s";
    track.appendChild(knob);
    sw.appendChild(track);

    function paint(on) {
      track.style.background = on ? "#3eb489" : "rgba(255,255,255,.35)";
      knob.style.left = on ? "18px" : "2px";
    }
    paint(initialOn);

    sw.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !CONFIG.autoPlay;
      onToggle(next);
      paint(next);
    });
    sw.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSettings();
    });
    return sw;
  }

  // ---- Settings-Panel (im iframe, überm Player) ----
  let settingsEl = null;
  function toggleSettings() {
    if (settingsEl) {
      settingsEl.remove();
      settingsEl = null;
      return;
    }
    settingsEl = buildSettings();
    // WICHTIG für Vollbild: Im Fullscreen zeigt der Browser NUR das
    // Vollbild-Element + dessen Kinder. Ein an document.body gehängtes Panel
    // wäre unsichtbar. Deshalb ans fullscreenElement hängen, wenn eins aktiv
    // ist – sonst an body.
    const mount = document.fullscreenElement || document.body;
    mount.appendChild(settingsEl);
  }

  // Wechselt man Vollbild bei offenem Panel, muss das Panel in den neuen
  // Anzeige-Kontext umziehen, sonst verschwindet es.
  document.addEventListener("fullscreenchange", () => {
    if (settingsEl) {
      const mount = document.fullscreenElement || document.body;
      mount.appendChild(settingsEl);
    }
  });

  function buildSettings() {
    const box = document.createElement("div");
    box.style.cssText =
      "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;width:270px;background:rgba(16,16,26,.97);color:#e8e8f0;font:500 13px/1.5 -apple-system,'Segoe UI',sans-serif;border-radius:12px;border:1px solid rgba(255,255,255,.15);box-shadow:0 10px 40px rgba(0,0,0,.6);padding:14px 16px";

    const h = document.createElement("div");
    h.textContent = "AniScript Lite";
    h.style.cssText =
      "font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:rgba(200,200,255,.6);margin-bottom:10px";
    box.appendChild(h);

    // ── kleine Helfer ──
    function row(labelText, control) {
      const r = document.createElement("div");
      r.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid rgba(255,255,255,.06)";
      const l = document.createElement("span");
      l.textContent = labelText;
      l.style.cssText = "flex:1;font-size:12.5px";
      r.appendChild(l);
      r.appendChild(control);
      return r;
    }
    function checkbox(key) {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!CONFIG[key];
      cb.style.cssText =
        "width:16px;height:16px;accent-color:#3eb489;cursor:pointer";
      cb.addEventListener("change", () => saveConfig(key, cb.checked));
      return cb;
    }
    function number(key, min, max) {
      const inp = document.createElement("input");
      inp.type = "number";
      inp.value = CONFIG[key];
      inp.min = min;
      inp.max = max;
      inp.style.cssText =
        "width:56px;padding:3px 6px;text-align:right;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:6px;color:#fff;font:12px monospace";
      ["keydown", "keyup", "keypress"].forEach((ev) =>
        inp.addEventListener(ev, (e) => e.stopPropagation()),
      );
      inp.addEventListener("change", () => {
        let v = parseInt(inp.value, 10);
        if (isNaN(v)) v = DEFAULTS[key];
        v = Math.max(min, Math.min(max, v));
        inp.value = v;
        saveConfig(key, v);
      });
      return inp;
    }

    // ── Tab-Leiste ──
    const tabBar = document.createElement("div");
    tabBar.style.cssText = "display:flex;gap:4px;margin-bottom:8px";
    const pageWrap = document.createElement("div"); // hier werden Seiten getauscht

    const PAGES = [
      { label: "Wiedergabe", build: buildPlaybackPage },
      { label: "Tasten & Daten", build: buildKeysPage },
    ];
    let activePage = 0;
    const tabButtons = [];

    function selectPage(idx) {
      activePage = idx;
      pageWrap.innerHTML = "";
      pageWrap.appendChild(PAGES[idx].build());
      tabButtons.forEach((b, i) => {
        const on = i === idx;
        b.style.background = on
          ? "rgba(108,92,231,.35)"
          : "rgba(255,255,255,.06)";
        b.style.color = on ? "#fff" : "rgba(255,255,255,.55)";
      });
    }

    PAGES.forEach((p, i) => {
      const t = document.createElement("button");
      t.textContent = p.label;
      t.style.cssText =
        "flex:1;padding:5px;border:none;border-radius:7px;cursor:pointer;font:600 11px inherit;transition:background .15s";
      t.addEventListener("click", () => selectPage(i));
      tabButtons.push(t);
      tabBar.appendChild(t);
    });
    box.appendChild(tabBar);
    box.appendChild(pageWrap);

    // ── Seite 1: Wiedergabe ──
    function buildPlaybackPage() {
      const p = document.createElement("div");
      p.appendChild(row("Autoplay", checkbox("autoPlay")));
      p.appendChild(row("Intro-Skip", checkbox("introSkip")));
      p.appendChild(
        row("Intro-Ziel (Sek.)", number("introSkipSeconds", 0, 600)),
      );
      p.appendChild(row("Auto nächste Folge", checkbox("autoNextEpisode")));
      p.appendChild(
        row("Outro-Schwelle (Sek.)", number("outroThresholdSec", 5, 600)),
      );
      p.appendChild(row("Countdown (Sek.)", number("nextCountdownSec", 1, 30)));
      return p;
    }

    // ── Seite 2: Tasten & Daten ──
    function buildKeysPage() {
      const p = document.createElement("div");
      const hint = document.createElement("div");
      hint.textContent =
        "Sekunden pro Taste · Alt = rückwärts · Leertaste = Pause · F = Vollbild";
      hint.style.cssText =
        "font-size:10px;color:rgba(200,200,255,.4);margin-bottom:4px;line-height:1.4";
      p.appendChild(hint);
      p.appendChild(row("Taste X", number("skipX", 1, 600)));
      p.appendChild(row("Taste C", number("skipC", 1, 600)));
      p.appendChild(row("Taste V", number("skipV", 1, 600)));
      p.appendChild(row("Taste B", number("skipB", 1, 600)));

      const reset = document.createElement("button");
      reset.textContent = "↺ Episoden-Fortschritt zurücksetzen";
      reset.style.cssText =
        "margin-top:12px;width:100%;padding:7px;background:rgba(200,60,60,.15);border:1px solid rgba(200,60,60,.4);border-radius:7px;color:#ff9a9a;cursor:pointer;font:600 11px inherit";
      reset.addEventListener("click", () => {
        try {
          window.top.postMessage(
            { [MARK]: true, action: "RESET_PROGRESS" },
            "*",
          );
        } catch {}
        reset.textContent = "✓ Zurückgesetzt";
        setTimeout(
          () => (reset.textContent = "↺ Episoden-Fortschritt zurücksetzen"),
          1500,
        );
      });
      p.appendChild(reset);
      return p;
    }

    selectPage(0); // Startseite

    // ── Schließen-Button (immer sichtbar, unter den Seiten) ──
    const close = document.createElement("button");
    close.textContent = "Schließen";
    close.style.cssText =
      "margin-top:12px;width:100%;padding:7px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:7px;color:#ccc;cursor:pointer;font:600 12px inherit";
    close.addEventListener("click", () => toggleSettings());
    box.appendChild(close);

    return box;
  }

  // Switch in die JWPlayer-Controlbar einfügen, neben Settings-Button.
  // Fügt den Toggle-Switch in die JWPlayer-Controlbar ein. Die Buttons rechts
  // (Settings, Vollbild etc.) liegen in .jw-button-container. Wir setzen den
  // Switch VOR den Settings-Button. Rückgabe false, wenn die Leiste noch nicht
  // im DOM ist → onVideo() rüstet dann per MutationObserver nach.
  let switchInserted = false;
  function insertSwitch() {
    if (switchInserted) return true;
    const container = document.querySelector(".jw-button-container");
    if (!container) return false;
    const sw = makeSwitch(CONFIG.autoPlay, (on) => {
      saveConfig("autoPlay", on);
      devLog("Autoplay per Switch " + (on ? "AN" : "AUS"));
    });
    const settingsBtn = container.querySelector(
      ".jw-icon-settings, .jw-settings-menu",
    );
    if (settingsBtn) settingsBtn.before(sw);
    else container.appendChild(sw);
    switchInserted = true;
    devLog("Switch in Controlbar eingefügt");
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════
  // HAUPTABLAUF, sobald das <video> im DOM ist.
  // Reihenfolge / Design-Entscheidung:
  //   Phase 1: Autoplay-Versuch starten (läuft async im Hintergrund)
  //   Phase 2: Intro-Skip & Outro-Überwachung anhängen
  //   Phase 3: Big-Play-Klick, der VOE zum Laden zwingt (nach 1.5s)
  //   Phase 4: Switch in die Controlbar – gekoppelt an die CONTROLBAR
  //            (Player bereit), NICHT ans Abspielen. Grund: sonst käme der
  //            Switch nie, wenn Autoplay aus ist → man könnte es nie wieder
  //            anschalten (Henne-Ei). insertSwitch() wartet ohnehin auf
  //            .jw-button-container, die erst existiert wenn der Player
  //            initialisiert hat.
  // ═══════════════════════════════════════════════════════════════════
  function onVideo(video) {
    devLog("Video gefunden, rs=" + video.readyState);

    // ── Phase 1: Autoplay ──
    tryPlay(video);

    // ── Phase 2: Intro-Skip, Outro, Skip-Hotkeys, Progress ──
    video.addEventListener("timeupdate", () => {
      checkIntroSkip(video);
      checkOutro(video);
    });
    setupSkipHotkeys(video);
    setupProgressReport(video);

    // ── Phase 3: Big-Play-Klick (Lade-Trigger) ──
    // ╔═══════════════════════════════════════════════════════════════╗
    // ║ ⚠️⚠️⚠️ NICHT ENTFERNEN – DER WICHTIGSTE KLICK IM GANZEN SCRIPT ║
    // ╠═══════════════════════════════════════════════════════════════╣
    // ║ Dieser Klick auf div.jw-icon-display stößt den JWPlayer an, die ║
    // ║ Video-Quelle ÜBERHAUPT ERST zu laden. Ohne ihn bleibt          ║
    // ║ networkState für immer bei 0 und das Video startet NIE.        ║
    // ║                                                                 ║
    // ║ Bewiesen beim Debuggen: Version OHNE diesen Klick hing 22s bei ║
    // ║ net=0 und gab auf. Version MIT Klick lief nach ~9s. Der Button ║
    // ║ SIEHT aus wie ein Rewind-Icon, ist aber der Lade-Trigger.      ║
    // ║ Die "sauberen" event-basierten Umbauten scheiterten alle genau ║
    // ║ hier. Finger weg!                                              ║
    // ║                                                                 ║
    // ║ Guards: nur 1x (setTimeout), nur wenn noch nichts läuft und das ║
    // ║ Video bei 0 steht → kämpft nicht gegen manuelles Pausieren.    ║
    // ╚═══════════════════════════════════════════════════════════════╝
    setTimeout(() => {
      if (!autoplayDone && video.paused && video.currentTime === 0) {
        devLog("Big-Play-Fallback klickt");
        document.querySelector("div.jw-icon-display")?.click();
      }
    }, 1500);

    // ── Phase 4: Switch einbauen (sobald Controlbar existiert) ──
    if (!insertSwitch()) {
      const barObs = new MutationObserver(() => {
        if (insertSwitch()) barObs.disconnect();
      });
      barObs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => barObs.disconnect(), 20000);
    }
  }

  const existing = document.querySelector("video");
  if (existing) onVideo(existing);
  else {
    const obs = new MutationObserver(() => {
      const v = document.querySelector("video");
      if (v) {
        obs.disconnect();
        onVideo(v);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 15000);
  }
})();
