// ==UserScript==
// @name         RTLPlusScript
// @namespace    SaosOne
// @version      1.3.0
// @description  Comfort für RTL+: Theater-Vollbild, das Folgenwechsel übersteht, eigene „Meine Serien“-Liste (zuletzt geschaut, anpinnbar) mit schneller Suche (/ oder Strg+K). Ohne externe Libraries.
// @match        *://plus.rtl.de/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// @noframes
// ==/UserScript==

/* ═══════════════════════════════════════════════════════════════════════
 *  RTLPlusScript – Comfort-Features für plus.rtl.de
 *  Schwester-Script: JoynScript (identischer Kern, nur SITE-Block anders)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  WARUM DAS SCRIPT SO GEBAUT IST, WIE ES GEBAUT IST
 *
 *  1) KEINE SEITEN-SELEKTOREN
 *     - Joyn/RTL+ sind React-SPAs mit generierten Klassennamen, die sich
 *       bei jedem Deploy ändern. Deshalb wird der Player NUR über das
 *       <video>-Element gefunden: größtes <video> auf der Seite, dann so
 *       weit nach oben laufen, wie die Eltern ungefähr gleich groß sind
 *       (= Player-Wrapper inkl. Controls-Overlay).
 *     - Der Player ist hier NICHT in einem iframe (anders als bei VOE in
 *       AniScript) → @noframes, kein postMessage nötig.
 *
 *  2) VOLLBILD + FOLGENWECHSEL
 *     - Problem: Der Player macht requestFullscreen() auf seinen Container.
 *       Beim Folgenwechsel wird dieser Container (oder das <video>) von
 *       React ersetzt → der Browser beendet das Vollbild.
 *     - Lösung: requestFullscreen() des Players wird abgefangen und auf
 *       <html> umgeleitet. <html> wird beim Folgenwechsel nie ersetzt,
 *       das Vollbild bleibt. Der Player wird per CSS (Theater-Modus) über
 *       den ganzen Viewport gelegt, und dieser Theater-Modus wird nach
 *       jedem DOM-Umbau automatisch neu angewendet.
 *     - exitFullscreen() vom Player OHNE User-Geste (= automatischer
 *       Folgenwechsel) wird ignoriert. Mit User-Geste (Klick auf den
 *       Vollbild-Button) geht es normal raus. Esc geht immer.
 *     - Der Hook muss im Seiten-Kontext laufen (nicht in der Userscript-
 *       Sandbox), sonst sieht der Player die gepatchten Prototypen nicht.
 *       Deshalb: <script>-Injektion, Fallback unsafeWindow.
 *     - Macht der Folgenwechsel doch einen echten Seiten-Reload, ist das
 *       Vollbild technisch weg (Browser-Regel). Dann bleibt der Theater-
 *       Modus per sessionStorage erhalten und der NÄCHSTE Klick/Tastendruck
 *       holt das echte Vollbild zurück (braucht eine User-Geste).
 *     - Alternativ: T = Theater-Modus dauerhaft + F11 (Browser-Vollbild,
 *       hängt an keinem Element, überlebt alles).
 *
 *  3) „MEINE SERIEN“ STATT DER SEITEN-SUCHE
 *     - Was länger als minWatchSec läuft (Video > 5 Min, also keine
 *       Trailer/Werbung), wird lokal gemerkt: Serie, letzte Folge, Zeit.
 *     - / oder Strg+K öffnet die Liste mit Sofort-Filter. Enter = weiter-
 *       schauen. Kein Treffer → Seiten-Suche oder Google site:-Suche.
 *     - Anpinnen (📌) hält Titel oben, in eigener Reihenfolge (↑).
 *
 *  4) TRUSTED TYPES / CSP
 *     - Kein innerHTML (könnte an Trusted Types scheitern), UI komplett
 *       per createElement in einem Shadow-DOM (Seiten-CSS kommt nicht rein).
 * ═══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ═══════════════════════════════════════════════
  // SITE – der einzige Teil, der sich zwischen den Scripts unterscheidet
  // ═══════════════════════════════════════════════
  const SITE = {
    name: "RTL+",
    // Serien-/Film-Seiten → Schlüssel für die Liste.
    // Beispiele: /video-tv/serien/<slug>-<id>
    //            /video-tv/serien/<slug>-<id>/staffel-1-<id>/episode-3-<titel>-<id>
    //            /video-tv/filme/<slug>-<id>, /video-tv/shows/<slug>-<id>
    parse(url) {
      const m = url.pathname.match(/^\/video-tv\/([^/]+)\/([^/?#]+)/i);
      if (!m) return null;
      const type = m[1].toLowerCase();
      const slug = m[2];
      return {
        key: `${type}/${slug}`,
        seriesUrl: `${url.origin}/video-tv/${type}/${slug}`,
        title: humanize(slug.replace(/-\d+$/, "")), // ID am Ende weg
      };
    },
    // Abspiel-Seiten. Zusätzlich gilt überall: Video > 5 Min = Hauptinhalt.
    isWatchUrl: (url) =>
      /\/episode-|^\/video-tv\/filme\//i.test(url.pathname),
    isSearchUrl: (url) => /^\/(suche|search)/i.test(url.pathname),
    searchUrl: (q) =>
      `https://plus.rtl.de/suche?term=${encodeURIComponent(q)}`,
    // Folgen-URLs im rohen HTML: …/staffel-<n>-<id>/episode-<n>-<titel>-<id>
    episodes(text, info) {
      const base = escRe(new URL(info.seriesUrl).pathname);
      const eps = [];
      const seasons = [];
      const epRe = new RegExp(`${base}/staffel-(\\d+)-(\\d+)/episode-(\\d+)-([a-z0-9-]+?)-(\\d+)(?![a-z0-9-])`, "gi");
      for (const m of text.matchAll(epRe)) eps.push({ season: +m[1], ep: +m[3], slug: m[4], path: m[0] });
      for (const m of text.matchAll(new RegExp(`${base}/staffel-(\\d+)-(\\d+)`, "gi"))) {
        seasons.push({ season: +m[1], path: m[0] });
      }
      return { eps, seasons };
    },
    paidRe: /\bPremium\b|\bPREMIUM\b/, // Badge-Text auf Bezahl-Kacheln
    paidLabel: "Premium",
    googleSite: "plus.rtl.de",
    titleSuffix: /\s*[|–—-]\s*RTL\+.*$/i,
  };

  // ═══════════════════════════════════════════════
  // SETTINGS – Defaults + Persistenz (GM_setValue)
  // ═══════════════════════════════════════════════
  const DEFAULTS = {
    theaterMode: false, // T: Theater-Modus dauerhaft (überlebt Reloads)
    fsToTheater: true, // Vollbild-Button des Players → Vollbild auf <html>
    showFab: true, // ★-Button unten links
    minWatchSec: 20, // ab so vielen Sekunden Wiedergabe in die Liste
    treeAuto: true, // Übersichtsseiten automatisch als Baum zeigen (sonst L)
    hidePaid: false, // Bezahl-Titel im Baum ausblenden (Alt+P)
    hidePresets: [], // ausgeblendete Kategorien (sport, news, …), siehe HIDE_PRESETS
    hideWords: "", // eigene Ausblende-Stichwörter, kommagetrennt
    treeBg: "schwarz", // Hintergrund Baum/Sidebar: Preset-Name oder #hex
    sidePinned: false, // Sidebar fixiert (bleibt offen, Seite rückt zur Seite)
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

  const P = "us-" + SITE.name.toLowerCase().replace(/[^a-z]/g, ""); // CSS-Präfix
  const C_ON = P + "-theater-on"; // auf <html>
  const C_ROOT = P + "-theater-root"; // Player-Wrapper
  const C_ANC = P + "-theater-anc"; // alle Vorfahren des Wrappers
  const C_SIDE = P + "-side-pinned"; // auf <html>: fixierte Sidebar
  const FS_EVENT = P + "-fs"; // Seiten-Hook → Script
  const CARRY_KEY = P + "-carry"; // sessionStorage: Vollbild über Reload
  let root = document.documentElement; // bei document-start evtl. noch null → boot()

  function log(...a) {
    try {
      console.log(`[${SITE.name}Script]`, ...a);
    } catch {}
  }

  function escRe(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function humanize(slug) {
    return decodeURIComponent(slug)
      .replace(/[-_]+/g, " ")
      .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
      .trim();
  }

  // ═══════════════════════════════════════════════
  // VOLLBILD-HOOK (läuft im Seiten-Kontext!)
  // Kommuniziert nur über DOM: CustomEvent + data-Attribute auf <html>.
  // Das klappt über Welten-Grenzen (Sandbox ↔ Seite) hinweg.
  // ═══════════════════════════════════════════════
  function pageHook(W, EVT) {
    const D = W.document;
    const R = D.documentElement;
    if (R.dataset.usFsHook === "1") return;
    const EP = W.Element.prototype;
    const DP = W.Document.prototype;
    const origReq = EP.requestFullscreen;
    const origExit = DP.exitFullscreen;
    if (!origReq || !origExit) return;
    R.dataset.usFsHook = "1";

    // Wollte der User wirklich raus? Ein Klick allein reicht nicht: auch
    // „Nächste Folge“ ist ein Klick, und danach ruft der Player exitFullscreen
    // auf. Raus nur nach Klick auf ein Vollbild-Bedienelement, Doppelklick
    // oder Taste F (Esc beendet das Vollbild sowieso browserseitig).
    let lastDown = { t: 0, el: null };
    let lastKey = { t: 0, k: "" };
    let lastDbl = 0;
    let fsStarter = null;
    W.addEventListener("pointerdown", (e) => {
      lastDown = { t: Date.now(), el: e.composedPath ? e.composedPath()[0] : e.target };
    }, true);
    W.addEventListener("keydown", (e) => {
      lastKey = { t: Date.now(), k: String(e.key || "").toLowerCase() };
    }, true);
    W.addEventListener("dblclick", () => (lastDbl = Date.now()), true);
    const FS_RE = /full\s*-?screen|vollbild/i;
    const isFsControl = (el) => {
      for (let i = 0; el && i < 6; i++, el = el.parentElement) {
        if (el === fsStarter) return true;
        if (!el.getAttribute) continue;
        const txt = [
          el.getAttribute("aria-label"),
          el.getAttribute("title"),
          el.getAttribute("data-testid"),
          typeof el.className === "string" ? el.className : "",
        ].join(" ");
        if (FS_RE.test(txt)) return true;
      }
      return false;
    };
    const userWantsExit = () => {
      const now = Date.now();
      if (now - lastKey.t < 1000 && lastKey.k === "f") return true;
      if (now - lastDbl < 1000) return true;
      return now - lastDown.t < 1500 && isFsControl(lastDown.el);
    };
    const emit = (detail) => {
      R.dataset.usFsActive = detail === "on" ? "1" : "0";
      D.dispatchEvent(new W.CustomEvent(EVT, { detail }));
    };
    const hasVideo = (el) =>
      !!el && (el.tagName === "VIDEO" || !!(el.querySelector && el.querySelector("video")));

    EP.requestFullscreen = function (...args) {
      if (R.dataset.usFsRedirect !== "1" || this === R || !hasVideo(this)) {
        return origReq.apply(this, args);
      }
      if (D.fullscreenElement) {
        // Schon im (umgeleiteten) Vollbild: Vollbild-Button = Toggle raus,
        // automatischer Re-Request nach Folgenwechsel = ignorieren.
        if (userWantsExit()) {
          emit("off");
          return origExit.call(D);
        }
        return Promise.resolve();
      }
      fsStarter = Date.now() - lastDown.t < 1500 ? lastDown.el : null;
      emit("on");
      return origReq.apply(R, args);
    };
    if (EP.webkitRequestFullscreen) EP.webkitRequestFullscreen = EP.requestFullscreen;

    DP.exitFullscreen = function (...args) {
      if (R.dataset.usFsActive === "1") {
        // Player will beim Folgenwechsel raus → nein.
        if (!userWantsExit()) return Promise.resolve();
        emit("off");
      }
      return origExit.apply(this, args);
    };
    if (DP.webkitExitFullscreen) DP.webkitExitFullscreen = DP.exitFullscreen;
  }

  function installPageHook() {
    root.dataset.usFsRedirect = CONFIG.fsToTheater ? "1" : "0";
    try {
      const s = document.createElement("script");
      s.textContent = `(${pageHook})(window, ${JSON.stringify(FS_EVENT)});`;
      root.appendChild(s);
      s.remove();
    } catch {
      /* CSP / Trusted Types → Fallback unten */
    }
    if (root.dataset.usFsHook !== "1") {
      try {
        pageHook(typeof unsafeWindow !== "undefined" ? unsafeWindow : window, FS_EVENT);
      } catch (e) {
        log("Vollbild-Hook nicht installierbar:", e);
      }
    }
  }

  // ═══════════════════════════════════════════════
  // THEATER-MODUS (CSS)
  // ═══════════════════════════════════════════════
  // Zwei Quellen, beide führen zum selben CSS-Zustand:
  //  - CONFIG.theaterMode: dauerhaft, per T
  //  - sessionTheater: aktiv, solange das umgeleitete Vollbild läuft
  let sessionTheater = false;
  let theaterRoot = null;
  let refullscreenPending = false;

  const PAGE_CSS = `
    html.${C_ON}, html.${C_ON} body { overflow: hidden !important; }
    html.${C_SIDE}:not(.${C_ON}) body { margin-right: 520px !important; }
    .${C_ANC} {
      transform: none !important; filter: none !important;
      contain: none !important; will-change: auto !important;
      perspective: none !important; z-index: 2147483000 !important;
    }
    .${C_ROOT} {
      position: fixed !important; inset: 0 !important;
      width: 100vw !important; height: 100vh !important;
      max-width: none !important; max-height: none !important;
      min-width: 0 !important; min-height: 0 !important;
      margin: 0 !important; padding: 0 !important; border: 0 !important;
      border-radius: 0 !important; transform: none !important;
      z-index: 2147483000 !important; background: #000 !important;
    }
    .${C_ROOT} video {
      width: 100% !important; height: 100% !important;
      max-width: none !important; max-height: none !important;
      object-fit: contain !important;
    }
  `;

  function isMainVideo(v) {
    return Number.isFinite(v.duration) && v.duration > 300;
  }

  function findVideo() {
    let best = null;
    let bestArea = 0;
    for (const v of document.querySelectorAll("video")) {
      const r = v.getBoundingClientRect();
      const a = r.width * r.height;
      if (a > bestArea) {
        best = v;
        bestArea = a;
      }
    }
    return best;
  }

  // Player-Wrapper = höchster Vorfahre, der noch ungefähr so groß ist wie
  // das Video (Controls-Overlays liegen da drin).
  function findPlayerRoot(video) {
    const vr = video.getBoundingClientRect();
    if (vr.width < 80 || vr.height < 45) return null; // noch nicht gelayoutet
    let best = video;
    for (let el = video.parentElement; el && el !== document.body && el !== root; el = el.parentElement) {
      const r = el.getBoundingClientRect();
      if (r.width > vr.width * 1.15 + 4 || r.height > vr.height * 1.3 + 4) break;
      best = el;
    }
    return best;
  }

  function clearTheaterMarks() {
    for (const el of document.querySelectorAll(`.${C_ROOT}, .${C_ANC}`)) {
      el.classList.remove(C_ROOT, C_ANC);
    }
    root.classList.remove(C_ON);
    theaterRoot = null;
  }

  function markTheater(playerRoot) {
    playerRoot.classList.add(C_ROOT);
    for (let el = playerRoot.parentElement; el && el !== root; el = el.parentElement) {
      el.classList.add(C_ANC);
    }
    root.classList.add(C_ON);
    theaterRoot = playerRoot;
    updateFab();
  }

  function theaterWanted() {
    return CONFIG.theaterMode || sessionTheater;
  }

  // Läuft periodisch: React baut den Player beim Folgenwechsel neu und
  // wirft dabei unsere Klassen weg → einfach neu anwenden.
  function theaterTick() {
    if (!theaterWanted()) {
      if (theaterRoot || root.classList.contains(C_ON)) {
        clearTheaterMarks();
        updateFab();
      }
      return;
    }
    const v = findVideo();
    if (
      theaterRoot &&
      theaterRoot.isConnected &&
      theaterRoot.classList.contains(C_ROOT) &&
      root.classList.contains(C_ON) &&
      (!v || theaterRoot.contains(v))
    ) {
      return; // alles noch korrekt
    }
    if (!v) {
      if (theaterRoot && !theaterRoot.isConnected) clearTheaterMarks();
      return;
    }
    // Persistenter Modus nur auf Abspiel-Seiten / bei Hauptinhalt, sonst
    // würde jeder Autoplay-Trailer auf der Startseite bildschirmfüllend.
    if (!sessionTheater && !SITE.isWatchUrl(location) && !isMainVideo(v)) return;
    clearTheaterMarks(); // erst messen ohne unser CSS
    const pr = findPlayerRoot(v);
    if (pr) markTheater(pr);
  }

  function setSessionTheater(on) {
    sessionTheater = on;
    root.dataset.usFsActive = on ? "1" : "0";
    theaterTick();
    updateFab();
  }

  function toggleTheater() {
    const next = !(CONFIG.theaterMode || sessionTheater);
    saveConfig("theaterMode", next);
    if (!next && sessionTheater) {
      setSessionTheater(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
    theaterTick();
    toast(next ? "Theater-Modus AN (F11 = echtes Vollbild)" : "Theater-Modus AUS");
  }

  function setupFullscreenSync() {
    document.addEventListener(FS_EVENT, (e) => {
      setSessionTheater(e.detail === "on");
    });
    document.addEventListener("fullscreenchange", () => {
      // Esc oder Browser hat das Vollbild beendet
      if (!document.fullscreenElement && sessionTheater) setSessionTheater(false);
    });

    // Echter Seiten-Reload während Vollbild → Theater mitnehmen,
    // nächste User-Geste holt das echte Vollbild zurück.
    window.addEventListener("pagehide", () => {
      try {
        if (sessionTheater && document.fullscreenElement) {
          sessionStorage.setItem(CARRY_KEY, String(Date.now() + 90000));
        }
      } catch {}
    });
    let carry = 0;
    try {
      carry = Number(sessionStorage.getItem(CARRY_KEY)) || 0;
      sessionStorage.removeItem(CARRY_KEY);
    } catch {}
    if (carry > Date.now()) {
      sessionTheater = true;
      refullscreenPending = true;
      const regain = (e) => {
        if (!refullscreenPending) return;
        refullscreenPending = false;
        if (e.type === "keydown" && e.key === "Escape") {
          setSessionTheater(false);
          return;
        }
        if (sessionTheater && !document.fullscreenElement) {
          root.dataset.usFsActive = "1";
          root.requestFullscreen().catch(() => {});
        }
      };
      window.addEventListener("pointerdown", regain, { capture: true, passive: true });
      window.addEventListener("keydown", regain, { capture: true, passive: true });
      setTimeout(() => toast("Klick oder Taste → zurück ins Vollbild"), 1500);
    }
  }

  // ═══════════════════════════════════════════════
  // BIBLIOTHEK – „Meine Serien“ (lokal, GM-Storage)
  // ═══════════════════════════════════════════════
  const LIB_KEY = "library";

  function loadLib() {
    try {
      return JSON.parse(GM_getValue(LIB_KEY, "{}")) || {};
    } catch {
      return {};
    }
  }
  function saveLib(lib) {
    try {
      GM_setValue(LIB_KEY, JSON.stringify(lib));
    } catch {}
  }

  function cleanTitle(t) {
    return (t || "").replace(SITE.titleSuffix, "").trim();
  }

  // Auf der Serien-Übersicht selbst ist die h1 der beste Titel.
  function bestTitle(info) {
    const onSeriesPage =
      location.pathname.replace(/\/$/, "") === new URL(info.seriesUrl).pathname;
    const h1 = onSeriesPage && document.querySelector("h1")?.textContent?.trim();
    return h1 && h1.length < 120 ? h1 : info.title;
  }

  function upsertCurrent(extra = {}) {
    const info = SITE.parse(location);
    if (!info) return null;
    const lib = loadLib();
    const old = lib[info.key] || {};
    lib[info.key] = {
      key: info.key,
      title: old.title || bestTitle(info),
      seriesUrl: info.seriesUrl,
      lastUrl: old.lastUrl || info.seriesUrl,
      lastLabel: old.lastLabel || "",
      pct: old.pct || 0,
      pinned: !!old.pinned,
      pinOrder: old.pinOrder || 0,
      ts: Date.now(),
      ...extra,
    };
    saveLib(lib);
    return lib[info.key];
  }

  function updateEntry(key, patch) {
    const lib = loadLib();
    if (!lib[key]) return;
    Object.assign(lib[key], patch);
    saveLib(lib);
  }
  function removeEntry(key) {
    const lib = loadLib();
    delete lib[key];
    saveLib(lib);
  }

  function sortedEntries() {
    const all = Object.values(loadLib());
    const pinned = all.filter((e) => e.pinned).sort((a, b) => a.pinOrder - b.pinOrder);
    const rest = all.filter((e) => !e.pinned).sort((a, b) => b.ts - a.ts);
    return [...pinned, ...rest];
  }

  function togglePin(key) {
    const lib = loadLib();
    const e = lib[key];
    if (!e) return;
    e.pinned = !e.pinned;
    if (e.pinned) {
      const max = Math.max(0, ...Object.values(lib).filter((x) => x.pinned && x !== e).map((x) => x.pinOrder || 0));
      e.pinOrder = max + 1;
    }
    saveLib(lib);
  }

  function movePinnedUp(key) {
    const lib = loadLib();
    const pinned = Object.values(lib).filter((e) => e.pinned).sort((a, b) => a.pinOrder - b.pinOrder);
    const i = pinned.findIndex((e) => e.key === key);
    if (i <= 0) return;
    [pinned[i - 1], pinned[i]] = [pinned[i], pinned[i - 1]];
    pinned.forEach((e, idx) => (lib[e.key].pinOrder = idx + 1));
    saveLib(lib);
  }

  // Wiedergabe beobachten: erst nach minWatchSec echter Wiedergabe von
  // Hauptinhalt (> 5 Min) eintragen, dann alle 15s Stand aktualisieren.
  function setupWatchTracking() {
    let playedSec = 0;
    let lastHref = location.href;
    let sinceSave = 0;
    setInterval(() => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        playedSec = 0;
        sinceSave = 0;
      }
      const v = findVideo();
      if (!v || v.paused || v.ended || !isMainVideo(v)) return;
      if (!SITE.parse(location)) return;
      playedSec += 5;
      sinceSave += 5;
      if (playedSec < CONFIG.minWatchSec) return;
      if (playedSec - 5 >= CONFIG.minWatchSec && sinceSave < 15) return;
      sinceSave = 0;
      upsertCurrent({
        lastUrl: location.href,
        lastLabel: cleanTitle(document.title),
        pct: Math.round((v.currentTime / v.duration) * 100),
      });
    }, 5000);
  }

  // ═══════════════════════════════════════════════
  // UI – Shadow-DOM: ★-Button, Overlay „Meine Serien“, Toast
  // ═══════════════════════════════════════════════
  const UI_CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
    .fab {
      position: fixed; left: 14px; bottom: 14px; z-index: 2147483646;
      width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer;
      background: rgba(20,20,35,.85); color: #ffd54a; font-size: 20px;
      box-shadow: 0 4px 14px rgba(0,0,0,.45); opacity: .65; transition: opacity .15s;
    }
    .fab:hover { opacity: 1; }
    .fab[hidden] { display: none; }
    .backdrop {
      position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.55);
      display: flex; justify-content: center; align-items: flex-start; padding-top: 8vh;
    }
    .backdrop[hidden] { display: none; }
    .panel {
      width: min(680px, 94vw); max-height: 80vh; display: flex; flex-direction: column;
      background: #16161f; color: #eee; border-radius: 12px; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.6); border: 1px solid #2c2c3a;
    }
    .search {
      width: 100%; padding: 16px 18px; font-size: 17px; border: 0; outline: 0;
      background: #1e1e2a; color: #fff; border-bottom: 1px solid #2c2c3a;
    }
    .list { overflow-y: auto; flex: 1; }
    .row {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      cursor: pointer; border-bottom: 1px solid #22222d;
    }
    .row.sel, .row:hover { background: #262636; }
    .main { flex: 1; min-width: 0; }
    .title { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sub { font-size: 12px; color: #9a9ab0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .bar { height: 3px; background: #333; border-radius: 2px; margin-top: 5px; overflow: hidden; }
    .bar > i { display: block; height: 100%; background: #4caf50; }
    .btn {
      border: 0; background: #2a2a3a; color: #ddd; border-radius: 6px; cursor: pointer;
      padding: 5px 8px; font-size: 12px; white-space: nowrap;
    }
    .btn:hover { background: #3a3a50; color: #fff; }
    .btn.on { background: #4a3b10; color: #ffd54a; }
    .empty { padding: 18px; color: #9a9ab0; font-size: 14px; line-height: 1.5; }
    .foot {
      display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 14px;
      background: #1a1a24; border-top: 1px solid #2c2c3a;
    }
    .foot .grow { flex: 1; }
    .settings { padding: 10px 14px; background: #1a1a24; border-top: 1px solid #2c2c3a; font-size: 13px; }
    .settings[hidden] { display: none; }
    .settings label { display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer; }
    .hint { font-size: 11px; color: #777; padding: 6px 14px 10px; background: #1a1a24; }
    .tree {
      position: fixed; inset: 0; z-index: 2147483645; background: #000; color: #c9d1d9;
      display: flex; justify-content: center;
    }
    .tree[hidden] { display: none; }
    .tree * { font-family: ui-monospace, "JetBrains Mono", "Cascadia Code", Consolas, monospace; }
    .tpage { width: min(1100px, 100%); height: 100%; display: flex; flex-direction: column; padding: 18px 20px 10px; font-size: 14px; line-height: 1.55; }
    .thead { color: #fff; font-weight: 700; font-size: 15px; }
    .tprompt { display: flex; align-items: center; color: #3fb950; margin: 8px 0 10px; }
    .tfilter { flex: 1; background: transparent; border: 0; outline: 0; color: #fff; font-size: 14px; padding: 0; }
    .tfilter::placeholder { color: #484f58; }
    .tlist { flex: 1; overflow-y: auto; }
    .tline { cursor: pointer; padding: 0 6px; border-radius: 3px; white-space: pre; overflow: hidden; text-overflow: ellipsis; }
    .tline.sel { background: #161b22; }
    .tline.spacer { cursor: default; background: none; }
    .tl.group { color: #fff; font-weight: 700; }
    .tl.series, .tl.film { color: #e6edf3; }
    .tl.season { color: #c9d1d9; }
    .tl.episode { color: #adbac7; }
    .tl.info, .tl.more { color: #6e7681; font-style: italic; }
    .tmeta, .ttag { color: #6e7681; }
    .ttag { font-size: 12px; }
    .tpaid, .tstar { color: #e3b341; }
    .tlast { color: #3fb950; }
    .tbar { display: flex; gap: 8px; align-items: center; padding-top: 8px; border-top: 1px solid #21262d; color: #6e7681; font-size: 12px; }
    .tbar .grow { flex: 1; }
    .tbtn { background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; border-radius: 4px; padding: 3px 8px; cursor: pointer; font-size: 12px; white-space: nowrap; }
    .tbtn:hover { border-color: #8b949e; color: #fff; }
    .thelp { color: #484f58; font-size: 11px; padding-top: 6px; }
    .tree.side { left: auto; right: 0; border-left: 1px solid #30363d; box-shadow: -10px 0 30px rgba(0,0,0,.55); }
    .tree.side .tpage { padding: 14px 12px 8px; font-size: 13px; }
    .tree.side .thelp { display: none; }
    :host([data-theater]) .tree.side { display: none; }
    .tbtn.on { border-color: #3fb950; color: #3fb950; }
    .tset { border-top: 1px solid #21262d; padding: 8px 4px 4px; font-size: 13px; max-height: 45%; overflow-y: auto; }
    .tset[hidden] { display: none; }
    .tset label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; margin: 2px 12px 2px 0; }
    .tsh { color: #fff; font-weight: 700; margin: 6px 0 4px; }
    .tchips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin-bottom: 4px; }
    .trow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 4px 0; }
    .twords { flex: 1; min-width: 180px; background: #0d1117; color: #fff; border: 1px solid #30363d; border-radius: 4px; padding: 3px 6px; font-size: 13px; }
    .tset input[type=color] { width: 32px; height: 22px; padding: 0; border: 1px solid #30363d; background: none; cursor: pointer; }
    .tinfo { color: #6e7681; padding: 10px 6px; }
    .toast {
      position: fixed; left: 50%; bottom: 60px; transform: translateX(-50%);
      z-index: 2147483647; padding: 9px 16px; border-radius: 8px;
      background: rgba(20,20,35,.92); color: #fff; font: 600 14px system-ui, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,.4); pointer-events: none;
      opacity: 0; transition: opacity .2s;
    }
  `;

  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null) el.append(c);
    return el;
  }

  function addSheet(target, css) {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
    } catch {
      const st = document.createElement("style");
      st.textContent = css;
      (target === document ? document.head || root : target).appendChild(st);
    }
  }

  let shadow = null;
  let host = null;
  let fab = null;
  let toastEl = null;
  let toastTimer = null;
  let overlay = null; // { backdrop, input, list, settings, render }

  function ensureHost() {
    if (host && host.isConnected) return;
    if (!host) {
      host = document.createElement(P + "-ui");
      shadow = host.attachShadow({ mode: "open" });
      addSheet(shadow, UI_CSS);
      fab = h("button", { class: "fab", title: "Sidebar mit Baum & Meine Serien (Meine Serien-Suche: / oder Strg+K)", text: "★", onclick: () => toggleSidebar() });
      toastEl = h("div", { class: "toast" });
      shadow.append(fab, toastEl);
    }
    // an <html> statt <body>: React ersetzt body-Inhalte, und im
    // umgeleiteten Vollbild (<html>) bleibt die UI so sichtbar
    root.appendChild(host);
    updateFab();
  }

  function updateFab() {
    if (!fab) return;
    const theater = root.classList.contains(C_ON);
    fab.hidden = !CONFIG.showFab || theater || listViewMode() === "full";
    host.toggleAttribute("data-theater", theater); // blendet die Sidebar im Theater-Modus aus
  }

  function toast(text, ms = 1600) {
    ensureHost();
    toastEl.textContent = text;
    toastEl.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.style.opacity = "0"), ms);
  }

  function relTime(ts) {
    const s = (Date.now() - ts) / 1000;
    if (s < 90) return "gerade eben";
    if (s < 3600) return `vor ${Math.round(s / 60)} Min`;
    if (s < 86400) return `vor ${Math.round(s / 3600)} Std`;
    const d = Math.round(s / 86400);
    return d === 1 ? "gestern" : `vor ${d} Tagen`;
  }

  function norm(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ß/g, "ss");
  }

  function filterEntries(q) {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    const all = sortedEntries();
    if (!tokens.length) return all;
    const hits = all.filter((e) => {
      const hay = norm(`${e.title} ${e.lastLabel} ${e.key}`);
      return tokens.every((t) => hay.includes(t));
    });
    // Titel-Anfang-Treffer nach vorne, sonst Reihenfolge behalten
    const nq = norm(q).trim();
    return hits.sort((a, b) => Number(norm(b.title).startsWith(nq)) - Number(norm(a.title).startsWith(nq)));
  }

  function go(url) {
    closeOverlay();
    closeListView();
    location.href = url;
  }

  function buildOverlay() {
    let sel = 0;
    let items = [];

    const input = h("input", {
      class: "search",
      type: "text",
      placeholder: `Meine ${SITE.name}-Serien durchsuchen…  (Enter = weiterschauen)`,
      autocomplete: "off",
      spellcheck: "false",
    });
    const list = h("div", { class: "list" });

    const cb = (key, label, after) =>
      h(
        "label",
        {},
        h("input", {
          type: "checkbox",
          checked: CONFIG[key],
          onchange: (e) => {
            saveConfig(key, e.target.checked);
            if (after) after();
          },
        }),
        label,
      );
    const settings = h(
      "div",
      { class: "settings", hidden: true },
      cb("fsToTheater", "Vollbild-Button des Players → Vollbild, das Folgenwechsel übersteht", () => {
        root.dataset.usFsRedirect = CONFIG.fsToTheater ? "1" : "0";
      }),
      cb("theaterMode", "Theater-Modus dauerhaft (T)", theaterTick),
      cb("showFab", "★-Button unten links anzeigen", updateFab),
      cb("treeAuto", "Übersichtsseiten automatisch als Baum zeigen (sonst L)"),
      cb("hidePaid", "Bezahl-Titel im Baum ausblenden (Alt+P)", () => treeRefresh(true)),
      h(
        "div",
        { style: "margin-top:8px" },
        h("button", {
          class: "btn",
          text: "Liste komplett leeren",
          onclick: () => {
            if (confirm(`Alle Einträge aus „Meine ${SITE.name}-Serien“ löschen?`)) {
              saveLib({});
              render();
            }
          },
        }),
      ),
    );

    const searchSiteBtn = h("button", { class: "btn", onclick: () => go(SITE.searchUrl(input.value.trim())) });
    const googleBtn = h("button", {
      class: "btn",
      text: "Google",
      title: `Google-Suche nur auf ${SITE.googleSite} – findet oft mehr als die Seiten-Suche`,
      onclick: () =>
        go(`https://www.google.com/search?q=${encodeURIComponent(`site:${SITE.googleSite} ${input.value.trim()}`)}`),
    });
    const foot = h(
      "div",
      { class: "foot" },
      searchSiteBtn,
      googleBtn,
      h("span", { class: "grow" }),
      h("button", {
        class: "btn",
        text: "+ Diese Seite merken",
        title: "Aktuelle Serie/Film ohne Anschauen in die Liste aufnehmen",
        onclick: () => {
          const e = upsertCurrent();
          toast(e ? `„${e.title}“ gemerkt` : "Keine Serien-/Film-Seite erkannt");
          render();
        },
      }),
      h("button", { class: "btn", text: "⚙", title: "Einstellungen", onclick: () => (settings.hidden = !settings.hidden) }),
    );
    const hint = h("div", {
      class: "hint",
      text: "↑/↓ wählen · Enter weiterschauen · Strg+Enter Seiten-Suche · Esc schließen · Alt+L Baum · ★ Sidebar · T Theater-Modus",
    });

    function row(e, i) {
      const sub = [e.lastLabel, relTime(e.ts)].filter(Boolean).join(" · ");
      const stop = (fn) => (ev) => {
        ev.stopPropagation();
        fn();
        render();
      };
      return h(
        "div",
        {
          class: "row" + (i === sel ? " sel" : ""),
          title: e.lastUrl,
          onclick: () => go(e.lastUrl),
          onmouseenter: () => {
            sel = i;
            paintSel();
          },
        },
        h(
          "div",
          { class: "main" },
          h("div", { class: "title", text: (e.pinned ? "📌 " : "") + e.title }),
          h("div", { class: "sub", text: sub }),
          e.pct ? h("div", { class: "bar" }, h("i", { style: `width:${Math.min(100, e.pct)}%` })) : null,
        ),
        e.pinned ? h("button", { class: "btn", text: "↑", title: "Weiter nach oben", onclick: stop(() => movePinnedUp(e.key)) }) : null,
        h("button", {
          class: "btn" + (e.pinned ? " on" : ""),
          text: "📌",
          title: e.pinned ? "Lösen" : "Oben anpinnen",
          onclick: stop(() => togglePin(e.key)),
        }),
        h("button", {
          class: "btn",
          text: "Übersicht",
          title: e.seriesUrl,
          onclick: (ev) => {
            ev.stopPropagation();
            go(e.seriesUrl);
          },
        }),
        h("button", { class: "btn", text: "✕", title: "Aus Liste entfernen", onclick: stop(() => removeEntry(e.key)) }),
      );
    }

    function paintSel() {
      [...list.children].forEach((el, i) => el.classList.toggle("sel", i === sel));
      list.children[sel]?.scrollIntoView({ block: "nearest" });
    }

    function render() {
      const q = input.value.trim();
      items = filterEntries(q);
      sel = Math.min(sel, Math.max(0, items.length - 1));
      list.replaceChildren(
        ...(items.length
          ? items.map(row)
          : [
              h("div", {
                class: "empty",
                text: q
                  ? `Nichts in deiner Liste zu „${q}“. Enter = auf ${SITE.name} suchen.`
                  : `Noch leer. Alles, was du länger als ${CONFIG.minWatchSec}s schaust, landet automatisch hier. Oder „+ Diese Seite merken“.`,
              }),
            ]),
      );
      searchSiteBtn.textContent = q ? `🔎 „${q}“ auf ${SITE.name}` : `🔎 ${SITE.name}-Suche`;
    }

    input.addEventListener("input", () => {
      sel = 0;
      render();
    });
    input.addEventListener("keydown", (e) => {
      e.stopPropagation(); // Seite soll unsere Tipperei nicht als Hotkeys sehen
      if (e.key === "ArrowDown") {
        sel = Math.min(sel + 1, items.length - 1);
        paintSel();
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        sel = Math.max(sel - 1, 0);
        paintSel();
        e.preventDefault();
      } else if (e.key === "Enter") {
        const q = input.value.trim();
        if ((e.ctrlKey || e.metaKey || !items.length) && q) go(SITE.searchUrl(q));
        else if (items[sel]) go(items[sel].lastUrl);
      } else if (e.key === "Escape") {
        closeOverlay();
      }
    });
    for (const t of ["keyup", "keypress"]) input.addEventListener(t, (e) => e.stopPropagation());

    const panel = h("div", { class: "panel" }, input, list, foot, settings, hint);
    const backdrop = h(
      "div",
      { class: "backdrop", hidden: true, onmousedown: (e) => e.target === backdrop && closeOverlay() },
      panel,
    );
    shadow.append(backdrop);
    return { backdrop, input, render };
  }

  function openOverlay() {
    ensureHost();
    if (!overlay) overlay = buildOverlay();
    overlay.input.value = "";
    overlay.render();
    overlay.backdrop.hidden = false;
    setTimeout(() => overlay.input.focus(), 0);
  }
  function closeOverlay() {
    if (overlay) overlay.backdrop.hidden = true;
  }
  const overlayOpen = () => !!overlay && !overlay.backdrop.hidden;

  // ═══════════════════════════════════════════════
  // BAUM-ANSICHT – die ganze Seite als schwarzer Text-Baum (git-log-Stil)
  //
  //   ● Joyn — Startseite
  //   ├─┬ Weiterschauen            ← Reihe = Überschrift auf der Seite
  //   │ ├─┬ Die Simpsons           ← Serie, aufklappbar
  //   │ │ └─┬ Staffel 2
  //   │ │   └── E01 …              ← Folgen per fetch der Serienseite
  //   │ └── John Wick  FILM
  //
  // Selektor-frei:
  //  - Titel = alle Links, die SITE.parse() erkennt (DOM-Reihenfolge).
  //  - Reihe = nächste VORANGEHENDE Überschrift (h1–h4, role=heading), die
  //    selbst kein Titel ist. Eine Query über "h1,…,a[href]" liefert alles
  //    in Dokument-Reihenfolge → ein Durchlauf reicht.
  //  - Folgen: rohes HTML der Serienseite per Regex nach Folgen-URLs
  //    durchsuchen (SITE.episodes). Klappt auch, wenn die Links nur im
  //    eingebetteten JSON stehen (Next.js/Angular-State).
  //  - Paid: Badge-Text (SITE.paidRe) oder Klassennamen im Kachel-Umfeld.
  // ═══════════════════════════════════════════════
  const TYPE_LABEL = { serien: "Serie", filme: "Film", shows: "Show", compilation: "Reihe", sport: "Sport" };
  const BRANCH_COLORS = ["#f14e32", "#3fb950", "#58a6ff", "#bc8cff", "#e3b341", "#39c5cf"];
  const GROUP_PREVIEW = 12; // so viele Titel pro Reihe, Rest hinter „… N weitere“
  const PAID_CLASS_RE = /premium|paywall|locked|plus-?badge|subscri/i;

  function linkTitle(a, info) {
    const cands = [
      a.getAttribute("aria-label"),
      a.getAttribute("title"),
      a.querySelector("img[alt]")?.getAttribute("alt"),
      a.querySelector("h1,h2,h3,h4")?.textContent,
      a.innerText ?? a.textContent,
    ];
    for (const c of cands) {
      const t = (c || "").split("\n").map((x) => x.trim()).find(Boolean);
      if (t && t.length > 1 && t.length < 120) return t;
    }
    return info.title;
  }

  const paidCache = new WeakMap();
  function isPaid(a) {
    if (paidCache.has(a)) return paidCache.get(a);
    // Kachel = Eltern-Element, wenn darin nur dieser eine Titel-Link steckt
    // (Badges liegen oft neben dem Link statt darin).
    const p = a.parentElement;
    const tile = p && p.querySelectorAll("a[href]").length === 1 ? p : a;
    let paid = SITE.paidRe.test(tile.innerText || "");
    if (!paid) {
      for (const el of [tile, ...tile.querySelectorAll("*")]) {
        const attrs = ["aria-label", "title", "alt"].map((k) => el.getAttribute(k) || "").join(" ");
        const cls = typeof el.className === "string" ? el.className : el.getAttribute("class") || "";
        if (SITE.paidRe.test(attrs) || PAID_CLASS_RE.test(cls)) {
          paid = true;
          break;
        }
      }
    }
    paidCache.set(a, paid);
    return paid;
  }

  function parseHref(href) {
    let url;
    try {
      url = new URL(href, location.href);
    } catch {
      return null;
    }
    if (url.origin !== location.origin) return null;
    const info = SITE.parse(url);
    return info ? { info, url } : null;
  }

  // Liefert [{ name, items: [{key,title,href,seriesUrl,type,kind,paid}] }]
  function collectPage() {
    const links = new Map(); // <a> → {info, url, title}
    const titleSet = new Set();
    for (const a of document.querySelectorAll("a[href]")) {
      const r = parseHref(a.href);
      if (!r) continue;
      const title = linkTitle(a, r.info);
      links.set(a, { ...r, title });
      titleSet.add(norm(title));
    }
    const groups = [];
    const byName = new Map();
    let current = "Highlights";
    for (const el of document.querySelectorAll('h1,h2,h3,h4,[role="heading"],a[href]')) {
      if (el.tagName === "A") {
        const l = links.get(el);
        if (!l) continue;
        let g = byName.get(current);
        if (!g) {
          g = { name: current, items: new Map() };
          byName.set(current, g);
          groups.push(g);
        }
        const prev = g.items.get(l.info.key);
        const paid = isPaid(el);
        if (!prev) {
          const type = l.info.key.split("/")[0];
          g.items.set(l.info.key, {
            key: l.info.key,
            title: l.title,
            href: l.url.href,
            seriesUrl: l.info.seriesUrl,
            type: TYPE_LABEL[type] || humanize(type),
            kind: type === "filme" ? "film" : "series",
            paid,
          });
        } else {
          if (prev.title === l.info.title && l.title !== l.info.title) prev.title = l.title;
          prev.paid = prev.paid || paid;
        }
        continue;
      }
      const t = (el.textContent || "").trim().replace(/\s+/g, " ");
      if (t.length < 2 || t.length > 60) continue;
      const inLink = el.closest("a[href]");
      if (inLink && links.has(inLink)) continue; // Kachel-Titel, keine Reihe
      if (titleSet.has(norm(t))) continue;
      current = t;
    }
    return groups.map((g) => ({ name: g.name, items: [...g.items.values()] }));
  }

  // ── Folgen laden ──────────────────────────────────
  // key → { state: "loading"|"done", seasons: Map<n, {n, path, eps: Map<ep,{ep,title,href}>, state}> }
  const epCache = new Map();

  function rawText(html) {
    // In eingebettetem JSON sind Slashes oft escaped
    return html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
  }

  function mergeEpisodes(entry, html, info) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const titles = new Map();
    for (const a of doc.querySelectorAll("a[href]")) {
      const t = (a.getAttribute("aria-label") || a.textContent || "").trim().split("\n")[0].trim();
      if (t && t.length < 100) titles.set(a.getAttribute("href").replace(/^https?:\/\/[^/]+/, ""), t);
    }
    const res = SITE.episodes(rawText(html), info);
    for (const s of res.seasons) {
      if (!entry.seasons.has(s.season)) entry.seasons.set(s.season, { n: s.season, path: s.path, eps: new Map(), state: "" });
      else if (!entry.seasons.get(s.season).path) entry.seasons.get(s.season).path = s.path;
    }
    for (const e of res.eps) {
      if (!entry.seasons.has(e.season)) entry.seasons.set(e.season, { n: e.season, path: "", eps: new Map(), state: "" });
      const season = entry.seasons.get(e.season);
      const prev = season.eps.get(e.ep);
      // Abspiel-Link (/play/…) bevorzugen, wenn es beide gibt
      if (prev && !(e.preferred && !prev.preferred)) continue;
      season.eps.set(e.ep, {
        ep: e.ep,
        title: titles.get(e.path) || humanize(e.slug),
        href: location.origin + e.path,
        preferred: !!e.preferred,
      });
    }
  }

  async function fetchText(path) {
    const r = await fetch(path, { credentials: "include" });
    return r.ok ? r.text() : "";
  }

  async function loadSeries(item) {
    if (epCache.has(item.key)) return;
    const entry = { state: "loading", seasons: new Map() };
    epCache.set(item.key, entry);
    const info = { key: item.key, seriesUrl: item.seriesUrl };
    try {
      // Aktuelle Seite = diese Serie? Dann auch das live gerenderte DOM nehmen.
      if (location.pathname.replace(/\/$/, "") === new URL(item.seriesUrl).pathname) {
        mergeEpisodes(entry, root.outerHTML, info);
      }
      mergeEpisodes(entry, await fetchText(item.seriesUrl), info);
    } catch (e) {
      log("Folgen laden fehlgeschlagen:", e);
    }
    entry.state = "done";
    treeRefresh(true);
  }

  async function loadSeason(item, season) {
    if (season.state || !season.path) return;
    season.state = "loading";
    try {
      mergeEpisodes(epCache.get(item.key), await fetchText(season.path), { key: item.key, seriesUrl: item.seriesUrl });
    } catch (e) {
      log("Staffel laden fehlgeschlagen:", e);
    }
    season.state = "done";
    treeRefresh(true);
  }

  // ── Baum-Modell ───────────────────────────────────
  // Knoten: { id, kind, label, item?, season?, href?, color, children?: fn }
  let listView = null; // { backdrop, input, status, list, render, timer }
  const openState = new Map(); // id → bool (Default: Reihen offen, Rest zu)
  const showAll = new Set(); // Reihen-IDs, bei denen „… N weitere“ aufgeklappt ist

  function isOpen(n) {
    return openState.has(n.id) ? openState.get(n.id) : n.kind === "group";
  }

  function seriesChildren(n) {
    const entry = epCache.get(n.item.key);
    if (!entry) {
      loadSeries(n.item);
      return [{ id: n.id + "/load", kind: "info", label: "⋯ lade Folgen …" }];
    }
    if (entry.state === "loading") return [{ id: n.id + "/load", kind: "info", label: "⋯ lade Folgen …" }];
    const seasons = [...entry.seasons.values()].sort((a, b) => a.n - b.n);
    if (!seasons.length) {
      return [{ id: n.id + "/none", kind: "info", label: "keine Folgen gefunden – Enter öffnet die Übersicht", href: n.item.seriesUrl }];
    }
    const lastPath = (() => {
      const e = loadLib()[n.item.key];
      try {
        return e ? new URL(e.lastUrl).pathname : "";
      } catch {
        return "";
      }
    })();
    return seasons.map((s) => ({
      id: `${n.id}/s${s.n}`,
      kind: "season",
      label: `Staffel ${s.n}`,
      meta: s.eps.size ? `${s.eps.size} ${s.eps.size === 1 ? "Folge" : "Folgen"}` : "",
      item: n.item,
      season: s,
      children: () => {
        if (!s.eps.size) {
          loadSeason(n.item, s);
          return [{ id: `${n.id}/s${s.n}/load`, kind: "info", label: s.state === "done" ? "keine Folgen gefunden" : "⋯ lade Staffel …" }];
        }
        return [...s.eps.values()]
          .sort((a, b) => a.ep - b.ep)
          .map((e) => ({
            id: `${n.id}/s${s.n}/e${e.ep}`,
            kind: "episode",
            label: `E${String(e.ep).padStart(2, "0")}  ${e.title}`,
            href: e.href,
            item: n.item,
            last: new URL(e.href).pathname === lastPath,
          }));
      },
    }));
  }

  function itemNode(groupId, it, lib) {
    const inLib = !!lib[it.key];
    return {
      id: `${groupId}/${it.key}`,
      kind: it.kind,
      label: it.title,
      item: it,
      // Serie in „Meine Serien“ → Enter = weiterschauen, sonst Übersicht
      href: inLib && it.kind !== "film" ? lib[it.key].lastUrl : it.href,
      type: it.type,
      paid: it.paid,
      inLib,
      pinned: inLib && !!lib[it.key].pinned,
      children: it.kind === "film" ? null : (n) => seriesChildren(n),
    };
  }

  function buildTree(q) {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    const match = (it) => !tokens.length || tokens.every((t) => norm(`${it.title} ${it.type}`).includes(t));
    const lib = loadLib();
    const groups = [];

    const mine = sortedEntries().map((e) => ({
      key: e.key,
      title: e.title,
      href: e.lastUrl,
      seriesUrl: e.seriesUrl,
      type: TYPE_LABEL[e.key.split("/")[0]] || "",
      kind: e.key.startsWith("filme/") ? "film" : "series",
      paid: false,
    }));
    if (mine.length) groups.push({ name: "★ Meine Serien", items: mine });

    // Serien-Übersicht offen? Dann die Serie selbst ganz oben, aufgeklappt.
    const here = SITE.parse(location);
    if (here && !SITE.isWatchUrl(location) && location.pathname.replace(/\/$/, "") === new URL(here.seriesUrl).pathname) {
      const type = here.key.split("/")[0];
      const it = {
        key: here.key,
        title: bestTitle(here),
        href: here.seriesUrl,
        seriesUrl: here.seriesUrl,
        type: TYPE_LABEL[type] || humanize(type),
        kind: type === "filme" ? "film" : "series",
        paid: false,
      };
      groups.push({ name: "Diese Seite", items: [it], autoOpen: true });
    }

    groups.push(...collectPage());

    let total = 0;
    let hiddenPaid = 0;
    let hiddenCat = 0;
    const words = hideWords();
    const hit = (text) => {
      const t = norm(text);
      return words.some((w) => t.includes(w));
    };
    const nodes = [];
    for (const g of groups) {
      const gid = "g:" + g.name;
      let items = g.items.filter(match);
      // Eigene Liste nie filtern – da steht nur, was du selbst willst
      if (words.length && g.name !== "★ Meine Serien") {
        if (hit(g.name)) {
          hiddenCat += items.length;
          continue;
        }
        const before = items.length;
        items = items.filter((i) => {
          let path = "";
          try {
            path = new URL(i.href).pathname.replace(/[-/]/g, " ");
          } catch {}
          return !hit(`${i.title} ${i.type} ${path}`);
        });
        hiddenCat += before - items.length;
      }
      if (CONFIG.hidePaid) {
        hiddenPaid += items.filter((i) => i.paid).length;
        items = items.filter((i) => !i.paid);
      }
      if (!items.length) continue;
      total += items.length;
      const color = BRANCH_COLORS[nodes.length % BRANCH_COLORS.length];
      const kids = items.map((it) => itemNode(gid, it, lib));
      if (g.autoOpen && !openState.has(kids[0].id)) openState.set(kids[0].id, true);
      const limited = !tokens.length && !showAll.has(gid) && kids.length > GROUP_PREVIEW + 2;
      nodes.push({
        id: gid,
        kind: "group",
        label: g.name,
        meta: `${items.length}`,
        color,
        children: () =>
          limited
            ? [...kids.slice(0, GROUP_PREVIEW), { id: gid + "/more", kind: "more", label: `… ${kids.length - GROUP_PREVIEW} weitere`, group: gid }]
            : kids,
      });
    }
    return { nodes, total, hiddenPaid, hiddenCat };
  }

  // Baum → Zeilen mit fertigem Präfix (│ ├─ └─ ┬ ▸)
  function flatten(nodes) {
    const lines = [];
    function walk(list, segs, parent, color) {
      list.forEach((n, i) => {
        const last = i === list.length - 1;
        const c = n.color || color;
        const kids = n.children && isOpen(n) ? n.children(n) : null;
        const hasKids = !!(kids && kids.length);
        const mark = hasKids ? "┬" : n.children ? "▸" : "─";
        const idx = lines.length;
        lines.push({ node: n, segs, glyph: (last ? "└─" : "├─") + mark + " ", color: c, parent });
        if (hasKids) walk(kids, [...segs, { t: last ? "  " : "│ ", c }], idx, c);
        if (parent === -1 && !last) lines.push({ spacer: true, segs: [{ t: "│", c: BRANCH_COLORS[(i + 1) % BRANCH_COLORS.length] }] });
      });
    }
    walk(nodes, [], -1, "#888");
    return lines;
  }

  // ── Ausblenden (Settings) ─────────────────────────
  // Genre-/Kategorie-Filter. Gematcht wird gegen Reihen-Name, Typ, Titel
  // und URL-Pfad (z. B. /sport/…). Echte Genre-Daten liefert die Seite nicht
  // pro Kachel, deshalb Stichwörter.
  const HIDE_PRESETS = {
    sport: { label: "Sport", words: ["sport", "fussball", "bundesliga", "nfl", "boxen", "formel 1", "darts"] },
    news: { label: "News", words: ["news", "nachrichten", "newstime", "rtl aktuell", "punkt 12"] },
    kids: { label: "Kinder", words: ["kids", "kinder", "junior", "cartoon"] },
    reality: { label: "Reality", words: ["reality", "dating", "love island", "bachelor", "promi"] },
    doku: { label: "Doku", words: ["doku", "dokumentation", "reportage"] },
    talk: { label: "Talk", words: ["talk"] },
    shopping: { label: "Shopping", words: ["shopping"] },
  };

  function hideWords() {
    const words = [];
    for (const k of CONFIG.hidePresets || []) words.push(...(HIDE_PRESETS[k]?.words || []));
    for (const w of String(CONFIG.hideWords || "").split(",")) if (w.trim()) words.push(w.trim());
    return words.map(norm);
  }

  // ── Hintergrund ───────────────────────────────────
  const BG_PRESETS = {
    schwarz: { label: "Schwarz", css: "#000" },
    anthrazit: { label: "Anthrazit", css: "#0d1117" },
    nacht: { label: "Nachtblau", css: "#0b1020" },
    glas: { label: "Glas", css: "rgba(0,0,0,.72)", blur: true },
  };
  function bgStyle() {
    const p = BG_PRESETS[CONFIG.treeBg];
    if (p) return `background:${p.css};` + (p.blur ? "backdrop-filter:blur(10px);" : "");
    return /^#[0-9a-f]{3,8}$/i.test(CONFIG.treeBg) ? `background:${CONFIG.treeBg};` : "background:#000;";
  }

  // ── Meine Serien per + / − ────────────────────────
  // +  : nicht in der Liste → hinzufügen; schon drin → anpinnen
  // −  : angepinnt → lösen; in der Liste → entfernen
  function libPlus(n) {
    const it = n.item;
    if (!it) return;
    const lib = loadLib();
    const e = lib[it.key];
    if (!e) {
      lib[it.key] = {
        key: it.key,
        title: it.title,
        seriesUrl: it.seriesUrl,
        lastUrl: n.kind === "episode" ? n.href : it.href,
        lastLabel: n.kind === "episode" ? n.label.trim() : "",
        pct: 0,
        pinned: false,
        pinOrder: 0,
        ts: Date.now(),
      };
      saveLib(lib);
      toast(`„${it.title}“ → Meine Serien`);
    } else if (!e.pinned) {
      togglePin(it.key);
      toast(`„${it.title}“ angepinnt 📌`);
    } else {
      toast(`„${it.title}“ ist schon angepinnt`);
    }
  }
  function libMinus(n) {
    const it = n.item;
    if (!it) return;
    const e = loadLib()[it.key];
    if (!e) toast(`„${it.title}“ ist nicht in deiner Liste`);
    else if (e.pinned) {
      togglePin(it.key);
      toast(`„${it.title}“ gelöst`);
    } else {
      removeEntry(it.key);
      toast(`„${it.title}“ aus Meine Serien entfernt`);
    }
  }

  // ── Ansicht (Vollbild per Alt+L, Sidebar per ★) ───
  const SIDE_W = 520;

  function buildListView() {
    let lines = [];
    let selId = null;
    let signature = "";
    const view = { mode: "full" };

    const input = h("input", {
      class: "tfilter",
      type: "text",
      placeholder: "filtern …   (Strg+Enter = Seiten-Suche)",
      autocomplete: "off",
      spellcheck: "false",
    });
    const heading = h("div", { class: "thead" });
    const list = h("div", { class: "tlist" });
    const status = h("div", { class: "tstatus" });
    const paidBtn = h("button", {
      class: "tbtn",
      onclick: () => {
        saveConfig("hidePaid", !CONFIG.hidePaid);
        render(true);
        input.focus();
      },
    });

    // ── Einstellungen (Alt+S) ──
    const settings = h("div", { class: "tset", hidden: true });
    function buildSettings() {
      const chk = (checked, label, onchange) =>
        h("label", {}, h("input", { type: "checkbox", checked, onchange: (e) => onchange(e.target.checked) }), " " + label);
      const presets = h(
        "div",
        { class: "tchips" },
        ...Object.entries(HIDE_PRESETS).map(([k, p]) =>
          chk((CONFIG.hidePresets || []).includes(k), p.label, (on) => {
            const cur = new Set(CONFIG.hidePresets || []);
            on ? cur.add(k) : cur.delete(k);
            saveConfig("hidePresets", [...cur]);
            render(true);
          }),
        ),
      );
      const words = h("input", {
        type: "text",
        class: "twords",
        value: CONFIG.hideWords || "",
        placeholder: "z. B. krimi, anime, gzsz",
        onchange: (e) => {
          saveConfig("hideWords", e.target.value);
          render(true);
        },
      });
      const swatches = h(
        "div",
        { class: "tchips" },
        ...Object.entries(BG_PRESETS).map(([k, p]) =>
          h("button", {
            class: "tbtn" + (CONFIG.treeBg === k ? " on" : ""),
            text: p.label,
            onclick: () => {
              saveConfig("treeBg", k);
              applyLayout();
              buildSettings();
            },
          }),
        ),
        h("input", {
          type: "color",
          title: "Eigene Farbe",
          value: /^#[0-9a-f]{6}$/i.test(CONFIG.treeBg) ? CONFIG.treeBg : "#000000",
          oninput: (e) => {
            saveConfig("treeBg", e.target.value);
            applyLayout();
          },
        }),
      );
      settings.replaceChildren(
        h("div", { class: "tsh", text: "Ausblenden" }),
        presets,
        h("div", { class: "trow" }, h("span", { text: "Eigene Stichwörter (Komma): " }), words),
        chk(CONFIG.hidePaid, `${SITE.paidLabel}-/Bezahl-Titel ausblenden (Alt+P)`, (on) => {
          saveConfig("hidePaid", on);
          render(true);
        }),
        h("div", { class: "tsh", text: "Ansicht" }),
        h("div", { class: "trow" }, h("span", { text: "Hintergrund: " }), swatches),
        chk(CONFIG.sidePinned, "Sidebar fixieren (bleibt offen, auch nach Neuladen; Seite rückt nach links)", (on) => {
          saveConfig("sidePinned", on);
          applyLayout();
        }),
        chk(CONFIG.treeAuto, "Übersichtsseiten automatisch als Vollbild-Baum zeigen", (on) => saveConfig("treeAuto", on)),
      );
    }
    function toggleSettings(force) {
      settings.hidden = !(force ?? settings.hidden);
      if (!settings.hidden) buildSettings();
      input.focus();
    }

    const bar = h(
      "div",
      { class: "tbar" },
      status,
      h("span", { class: "grow" }),
      paidBtn,
      h("button", { class: "tbtn", text: "⚙", title: "Einstellungen (Alt+S)", onclick: () => toggleSettings() }),
      h("button", {
        class: "tbtn",
        text: "mehr laden ↓",
        title: "Seite im Hintergrund nach unten scrollen, damit sie weitere Reihen nachlädt",
        onclick: () => {
          window.scrollTo(0, document.documentElement.scrollHeight);
          input.focus();
        },
      }),
      h("button", { class: "tbtn", text: "✕", title: "Schließen (Esc)", onclick: closeListView }),
    );
    const help = h("div", {
      class: "thelp",
      text: "↑↓ wählen · →/← auf/zu · Leertaste/Enter auf/zu bzw. abspielen · Shift+Enter Serie öffnen · + Liste/anpinnen · − lösen/entfernen · Alt+P Paid · Alt+S ⚙ · Esc zu",
    });

    const selIndex = () => Math.max(0, lines.findIndex((l) => !l.spacer && l.node.id === selId));

    // Leertaste/Enter: Aufklappbares auf/zu, sonst öffnen.
    // overview (Shift): Serie direkt öffnen (aus Meine Serien = weiterschauen).
    function activate(n, overview) {
      if (n.kind === "more") {
        showAll.add(n.group);
        render(true);
      } else if (overview && n.item && (n.kind === "series" || n.kind === "film")) {
        go(n.href || n.item.seriesUrl);
      } else if (n.children) {
        toggle(n);
      } else if (n.href) {
        go(n.href);
      }
    }
    function toggle(n, force) {
      if (!n.children) return;
      openState.set(n.id, force ?? !isOpen(n));
      render(true);
    }
    function move(delta) {
      let i = selIndex() + delta;
      while (lines[i] && lines[i].spacer) i += delta;
      if (lines[i]) {
        selId = lines[i].node.id;
        paintSel();
      }
    }

    function paintSel() {
      const i = selIndex();
      [...list.children].forEach((el, k) => el.classList.toggle("sel", k === i));
      list.children[i]?.scrollIntoView({ block: "nearest" });
    }

    function lineEl(l) {
      if (l.spacer) return h("div", { class: "tline spacer" }, ...l.segs.map((s) => h("span", { style: `color:${s.c}`, text: s.t })));
      const n = l.node;
      return h(
        "div",
        {
          class: "tline",
          title: n.href || "",
          onmouseenter: () => {
            selId = n.id;
            paintSel();
          },
          onclick: (e) => {
            selId = n.id;
            activate(n, e.shiftKey);
          },
          ondblclick: () => n.item && (n.kind === "series" || n.kind === "film") && go(n.href || n.item.seriesUrl),
        },
        ...l.segs.map((s) => h("span", { class: "tg", style: `color:${s.c}`, text: s.t })),
        h("span", { class: "tg", style: `color:${l.color}`, text: l.glyph }),
        n.last ? h("span", { class: "tlast", text: "▶ " }) : null,
        h("span", { class: "tl " + n.kind, text: n.label }),
        n.meta ? h("span", { class: "tmeta", text: " " + n.meta }) : null,
        n.type && n.kind === "film" ? h("span", { class: "ttag", text: " " + n.type.toUpperCase() }) : null,
        n.paid ? h("span", { class: "tpaid", text: ` [${SITE.paidLabel}]` }) : null,
        n.pinned ? h("span", { class: "tstar", text: " 📌" }) : n.inLib ? h("span", { class: "tstar", text: " ★" }) : null,
      );
    }

    function render(force) {
      const tree = buildTree(input.value);
      const next = flatten(tree.nodes);
      const sig = next.map((l) => (l.spacer ? "|" : l.node.id + l.node.label + (l.node.meta || "") + (l.node.inLib ? "★" : "") + (l.node.pinned ? "📌" : ""))).join("\n");
      heading.textContent = `● ${SITE.name} — ${cleanTitle(document.title) || location.pathname}`;
      paidBtn.textContent = CONFIG.hidePaid ? `${SITE.paidLabel}: aus` : `${SITE.paidLabel}: an`;
      status.textContent =
        `${tree.total} Titel · ${tree.nodes.length} Reihen` +
        (tree.hiddenPaid ? ` · ${tree.hiddenPaid} ${SITE.paidLabel} aus` : "") +
        (tree.hiddenCat ? ` · ${tree.hiddenCat} gefiltert` : "");
      if (!force && sig === signature) return;
      signature = sig;
      lines = next;
      if (!lines.some((l) => !l.spacer && l.node.id === selId)) selId = lines.find((l) => !l.spacer)?.node.id ?? null;
      list.replaceChildren(
        ...(lines.length
          ? lines.map(lineEl)
          : [
              h("div", {
                class: "tinfo",
                text: input.value.trim()
                  ? `Nichts gefunden. Strg+Enter sucht „${input.value.trim()}“ auf ${SITE.name}.`
                  : "Noch keine Titel auf der Seite – der Baum füllt sich, sobald die Seite lädt.",
              }),
            ]),
      );
      paintSel();
    }

    input.addEventListener("input", () => render(true));
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      const line = lines[selIndex()];
      const node = line && !line.spacer ? line.node : null;
      const q = input.value.trim();
      const empty = !input.value;
      if (e.key === "ArrowDown") move(1);
      else if (e.key === "ArrowUp") move(-1);
      else if (e.key === "ArrowRight" && node && empty) {
        if (node.children && !isOpen(node)) toggle(node, true);
        else move(1);
      } else if (e.key === "ArrowLeft" && node && empty) {
        if (node.children && isOpen(node)) toggle(node, false);
        else if (line.parent >= 0) {
          selId = lines[line.parent].node.id;
          paintSel();
        }
      } else if (e.key === " " && empty && node) {
        activate(node, false); // mit Filtertext tippt die Leertaste ganz normal
      } else if (e.key === "Enter") {
        if ((e.ctrlKey || e.metaKey) && q) go(SITE.searchUrl(q));
        else if (node) activate(node, e.shiftKey);
        else if (q) go(SITE.searchUrl(q));
      } else if ((e.key === "+" || e.code === "NumpadAdd") && node) {
        libPlus(node);
        render(true);
      } else if ((e.key === "-" || e.code === "NumpadSubtract") && node) {
        libMinus(node);
        render(true);
      } else if (e.altKey && e.code === "KeyP") {
        paidBtn.click();
      } else if (e.altKey && e.code === "KeyS") {
        toggleSettings();
      } else if (e.altKey && e.code === "KeyL") {
        view.mode === "full" ? closeListView() : openListView("full");
      } else if (e.key === "Escape") {
        if (!settings.hidden) toggleSettings(false);
        else if (input.value) {
          input.value = "";
          render(true);
        } else closeListView();
      } else return;
      e.preventDefault();
    });
    for (const t of ["keyup", "keypress"]) input.addEventListener(t, (e) => e.stopPropagation());

    const page = h(
      "div",
      { class: "tpage" },
      heading,
      h("div", { class: "tprompt" }, h("span", { text: "❯ " }), input),
      list,
      settings,
      bar,
      help,
    );
    const backdrop = h("div", { class: "tree", hidden: true }, page);
    shadow.append(backdrop);

    function applyLayout() {
      const side = view.mode === "side";
      backdrop.className = "tree" + (side ? " side" : "");
      backdrop.setAttribute("style", bgStyle() + (side ? `width:min(${SIDE_W}px,100vw);` : ""));
      root.classList.toggle(C_SIDE, side && !backdrop.hidden && !!CONFIG.sidePinned);
      updateFab();
    }

    return { backdrop, input, render, view, applyLayout, timer: 0 };
  }

  function treeRefresh(force) {
    if (listViewOpen()) listView.render(force);
  }

  // mode: "full" (Alt+L) oder "side" (★)
  function openListView(mode = "full", focus = true) {
    ensureHost();
    closeOverlay();
    if (!listView) listView = buildListView();
    listView.view.mode = mode;
    listView.input.value = "";
    listView.backdrop.hidden = false;
    listView.applyLayout();
    listView.render(true);
    clearInterval(listView.timer);
    // SPA lädt Reihen nach (Scrollen, Lazy-Loading) → laufend nachziehen
    listView.timer = setInterval(() => listView.render(false), 1500);
    if (focus) setTimeout(() => listView.input.focus(), 0);
  }
  function closeListView() {
    if (!listView) return;
    listView.backdrop.hidden = true;
    listView.applyLayout();
    clearInterval(listView.timer);
  }
  const listViewOpen = () => !!listView && !listView.backdrop.hidden;
  const listViewMode = () => (listViewOpen() ? listView.view.mode : "");

  function toggleSidebar() {
    listViewMode() === "side" ? closeListView() : openListView("side");
  }

  // Auf Übersichts-/Suchseiten automatisch den Vollbild-Baum öffnen, sobald
  // die Seite Titel hat. Nie auf Abspiel-Seiten, nicht bei fixierter Sidebar.
  // Wer mit Esc schließt, sieht die normale Seite, bis er weiter navigiert.
  function setupAutoListView() {
    let lastHref = "";
    let handled = false;
    setInterval(() => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        handled = false;
        if (SITE.isWatchUrl(location) && listViewMode() === "full") closeListView();
      }
      if (handled || !CONFIG.treeAuto || CONFIG.sidePinned || listViewOpen() || overlayOpen()) return;
      if (SITE.isWatchUrl(location) || document.querySelector(`.${C_ROOT}`)) {
        handled = true;
        return;
      }
      if (collectPage().length) {
        handled = true;
        openListView("full");
      }
    }, 700);

    // Nicht fixierte Sidebar: Klick daneben schließt sie
    window.addEventListener(
      "pointerdown",
      (e) => {
        if (listViewMode() !== "side" || CONFIG.sidePinned) return;
        if (!e.composedPath().includes(host)) closeListView();
      },
      true,
    );

    // Fixierte Sidebar nach dem Laden wiederherstellen (ohne Fokus-Klau,
    // sonst landen Player-Tasten wie Leertaste in unserem Filterfeld)
    if (CONFIG.sidePinned) openListView("side", false);
  }

  // ═══════════════════════════════════════════════
  // HOTKEYS (capture → wir sind vor dem Player dran)
  // ═══════════════════════════════════════════════
  function isTyping(e) {
    const t = e.composedPath ? e.composedPath()[0] : e.target;
    if (!t || !t.tagName) return false;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
  }

  function setupHotkeys() {
    window.addEventListener(
      "keydown",
      (e) => {
        if (isTyping(e)) return;
        const key = (e.key || "").toLowerCase();
        const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
        let handled = true;
        if ((e.key === "/" && plain) || ((e.ctrlKey || e.metaKey) && !e.altKey && key === "k")) {
          overlayOpen() ? closeOverlay() : openOverlay();
        } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyL") {
          listViewMode() === "full" ? closeListView() : openListView("full");
        } else if (plain && !e.shiftKey && key === "t") {
          toggleTheater();
        } else if (e.key === "Escape" && overlayOpen()) {
          closeOverlay();
        } else if (e.key === "Escape" && listViewOpen()) {
          closeListView();
        } else if (e.key === "Escape" && CONFIG.theaterMode && !document.fullscreenElement) {
          toggleTheater();
        } else {
          handled = false;
        }
        if (handled) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  }

  // ═══════════════════════════════════════════════
  // START
  // ═══════════════════════════════════════════════
  function boot() {
    root = document.documentElement;
    installPageHook(); // so früh wie möglich, vor dem Player-Code
    setupFullscreenSync();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  }

  function init() {
    addSheet(document, PAGE_CSS);
    ensureHost();
    setupHotkeys();
    setupWatchTracking();
    setupAutoListView();
    setInterval(theaterTick, 700);
    setInterval(ensureHost, 3000); // falls die Seite <html>-Kinder aufräumt
    theaterTick();
    log("geladen");
  }

  if (document.documentElement) {
    boot();
  } else {
    // ganz früher document-start: auf <html> warten
    new MutationObserver((_, obs) => {
      if (!document.documentElement) return;
      obs.disconnect();
      boot();
    }).observe(document, { childList: true });
  }
})();
