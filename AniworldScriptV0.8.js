// ==UserScript==
// @name             AniwordScriptV0.8
// @name:de          AniwordScriptV0.8
// @description      Based on AniworldAddonV0.7 by AniPlayer (https://greasyfork.org/users/1400386), modified and extended by Saos-EBB
// @description:de   Autoplay für Aniworld.to  mit konfigurierbaren Skip-Hotkeys, Sprachspeicherung und mehr
// @version          0.0.8
// @match            https://aniworld.to/*
// @match            https://s.to/*
// @match            https://serienstream.to/*
// @match            http://186.2.175.5/*
// @match            *://*/*
// @author           AniPlayer
// @namespace        SaosOne
// @license          GPL-3.0-or-later; https://spdx.org/licenses/GPL-3.0-or-later.html
// @icon             https://cdn.iconscout.com/icon/premium/png-512-thumb/monkey-icon-svg-download-png-2299128.png?f=webp&w=256
// @require          https://cdnjs.cloudflare.com/ajax/libs/keyboardjs/2.7.0/keyboard.min.js#sha512-UrxaOZAJw5p38NProL/UrffryqdMdXFcEdyLt6eU89pH0N7KnmAe8G3ghNbH1qW5cDYdnaoEw1TcbHn8wuqAvw==
// @require          https://cdn.jsdelivr.net/npm/notiflix@3.2.8/dist/notiflix-aio-3.2.8.min.js#sha512-XsGxeeCSQNP2+WGCUScwIO6sznCBBee4we6n8n6yoFgB+shnCXJZCY2snFqu+fgIbPd79ldRR1/5zQFMUQVSpg==
// @grant            GM_addStyle
// @grant            GM_addValueChangeListener
// @grant            GM_deleteValue
// @grant            GM_getValue
// @grant            GM_listValues
// @grant            GM_removeValueChangeListener
// @grant            GM_setValue
// @grant            GM.getValue
// @grant            unsafeWindow
// @run-at           document-body
// ==/UserScript==
/*
 * Based on AniworldAddonV0.7 by AniPlayer
 * Original: https://greasyfork.org/users/1400386
 * License: GPL-3.0-or-later
 *
 * Modified by Saos-EBB
 * Changes: removed Vidoza/Vidmoly support, streamlined UI,
 * added configurable skip durations, AniScriptLight branding
 * Repository: https://github.com/Saos-EBB/AniScript
 */

/* jshint esversion: 11 */
/* global Notiflix, keyboardJS */

(async function() {
    'use strict';

    // ============ SKIP CONFIGURATION ============
    const SKIP_CONFIG = {
        autoSkipSeconds: 0,  // seconds to auto-skip at video start
        get skipX() { return advancedSettings[ADVANCED_SETTINGS_MAP.skipX]; },
        get skipC() { return advancedSettings[ADVANCED_SETTINGS_MAP.skipC]; },
        get skipV() { return advancedSettings[ADVANCED_SETTINGS_MAP.skipV]; },
        get skipB() { return advancedSettings[ADVANCED_SETTINGS_MAP.skipB]; },
    };
    // ============================================

    // Localization setup
    const userLang = navigator.language.startsWith('de') ? 'de' : 'en';

    const localizations = {
        en: {
            firstRunInfoText: () => `Right-click the button for settings. In fullscreen, scroll to switch providers.`,
            loading: 'Loading',

            couldNotLoad: 'Could not load',
            hotkeysGuide: 'Hotkeys Guide',
            close: 'Close',
            errorSaving: 'There was an error when trying to save the',
            reportBug: '. The value would reset upon player reload. Please, report the bug, with a mention of a URL of the page you\'re currently on',
            autoplayError: 'The script got an error trying autoplay. Try again, and if the problem persists, report the bug, or you can try switching video player providers if possible',
            lastAutoplayError: 'Last autoplay end up with an error, but you should be at the next episode page now. Try again, and if the problem persists, report the bug, or you can try switching video player providers if possible',
            preferences: 'Preferences',
            advanced: 'Advanced',
            apply: 'Apply',
            miscellaneous: 'Miscellaneous',
            persistentMutedAutoplay: 'Persistent muted autoplay',
            persistentMutedAutoplayTooltip: 'Seamless autoplay is not always available due to browser restrictions. This setting makes autoplay muted which in turn makes autoplay to be always available (autoplay should be enabled for this to work), but instead it requires user input (click or keypress) to unmute. Keypress works only if a video player is in focus',
            autoSkipAtStart: 'Auto-skip at start',
            autoSkipAtStartTooltip: 'Automatically skips the beginning of a video when it starts. Enable this to activate the skip feature.',
            skipSecondsOnStart: 'Skip seconds on start',
            skipSecondsOnStartTooltip: 'Number of seconds to skip from the beginning when auto-skip is enabled.',
            introSkipSize: 'Intro skip size, sec',
            introSkipSizeTooltip: 'Intro skip size. This is linked to the title and should stay the same across episodes',
            outroSkipThreshold: 'Outro skip threshold, sec',
            outroSkipThresholdTooltip: 'Autoplay triggers when the video player has fewer than THIS number of seconds left to play. It is linked to the title and should stay the same across episodes',
            resetToDefaults: 'Reset to defaults',
            hotkeys: 'Hotkeys',
            fastBackward: 'Fast backward*',
            fastBackwardTooltip: 'Hotkey for a fast backward. Page reload is required for this setting to take effect!',
            fastForward: 'Fast forward*',
            fastForwardTooltip: 'Hotkey for a fast forward. Page reload is required for this setting to take effect!',
            fullscreen: 'Fullscreen*',
            fullscreenTooltip: 'Hotkey for a fullscreen mode toggle. Page reload is required for this setting to take effect!',
            largeSkip: 'Intro skip*',
            largeSkipTooltip: 'Hotkey for an intro skip. Page reload is required for this setting to take effect!',
            defaultIntroSkipSize: 'Default intro skip size, sec',
            defaultIntroSkipSizeTooltip: 'Default intro skip size',
            defaultOutroSkipThreshold: 'Default outro skip threshold, sec',
            defaultOutroSkipThresholdTooltip: 'Default outro skip threshold',
            fastForwardSize: 'Fast forward size, sec',
            fastForwardSizeTooltip: 'Number of seconds to skip or rewind using double-taps or pressing a corresponding hotkeys',
            highlightVisitedEpisodes: 'Highlight visited episodes',
            highlightVisitedEpisodesTooltip: 'Highlights previously visited episode links in yellow so you can easily see which episodes you have already opened',
            playOnIntroSkip: 'Play on intro skip',
            playOnIntroSkipTooltip: 'Intro skip also starts playback',
            corsProxy: 'CORS proxy',
            corsProxyTooltip: 'To keep possible VOE-to-VOE unmuted autoplay working, the script needs to route a very small number of web requests through its own proxy server. Leave the input empty to disable this or set your own proxy',
            commlinkPollingInterval: 'Commlink polling interval, ms*',
            commlinkPollingIntervalTooltip: 'Reflects messaging responsiveness between a player and a top scope. Might impact CPU usage if set too low. 40 should be enough. Page reload is required for this setting to take effect!',
            skipIntro: 'Skip Intro',
            autoplayEnabled: 'Autoplay is enabled',
            autoplayDisabled: 'Autoplay is disabled',
            prevEpisode: 'Previous episode*',
            prevEpisodeTooltip: 'Hotkey to go to the previous episode. Page reload is required for this setting to take effect!',
            nextEpisode: 'Next episode*',
            nextEpisodeTooltip: 'Hotkey to go to the next episode. Page reload is required for this setting to take effect!',
            cancelAutoplay: 'Cancel autoplay*',
            cancelAutoplayTooltip: 'Hotkey to cancel the autoplay countdown. Page reload required.',
            visitedEpisodeColor: 'Visited episode color',
            visitedEpisodeColorTooltip: 'Color used to highlight visited episode links',
        },
        de: {
            firstRunInfoText: () => `Rechtsklick auf den Button für Einstellungen. Im Vollbild scrollen, um Anbieter zu wechseln.`,
            loading: 'Wird geladen',

            couldNotLoad: 'Konnte nicht geladen werden',
            hotkeysGuide: 'Hotkeys-Anleitung',
            close: 'Schließen',
            errorSaving: 'Beim Speichern von ist ein Fehler aufgetreten',
            reportBug: '. Der Wert wird beim Neuladen des Players zurückgesetzt. Bitte melden Sie den Fehler unter Angabe der URL der aktuellen Seite',
            autoplayError: 'Das Skript hat beim Versuch des Autoplays einen Fehler erhalten. Versuchen Sie es erneut. Wenn das Problem weiterhin besteht, melden Sie den Fehler oder versuchen Sie, den Video-Player-Anbieter zu wechseln, falls möglich',
            lastAutoplayError: 'Das letzte Autoplay ist mit einem Fehler beendet, aber Sie sollten jetzt auf der Seite der nächsten Episode sein. Versuchen Sie es erneut. Wenn das Problem weiterhin besteht, melden Sie den Fehler oder versuchen Sie, den Video-Player-Anbieter zu wechseln, falls möglich',
            preferences: 'Einstellungen',
            advanced: 'Erweitert',
            apply: 'Anwenden',
            miscellaneous: 'Sonstiges',
            persistentMutedAutoplay: 'Dauerhaft stummgeschaltetes Autoplay',
            persistentMutedAutoplayTooltip: 'Nahtloses Autoplay ist aufgrund von Browsereinschränkungen nicht immer verfügbar. Diese Einstellung schaltet das Autoplay stumm, wodurch das Autoplay immer verfügbar ist (Autoplay muss dafür aktiviert sein), erfordert jedoch eine Benutzereingabe (Klick oder Tastendruck) zum Aufheben der Stummschaltung. Ein Tastendruck funktioniert nur, wenn ein Videoplayer im Fokus ist',
            autoSkipAtStart: 'Automatisches Überspringen am Anfang',
            autoSkipAtStartTooltip: 'Überspringt automatisch den Anfang eines Videos, wenn es startet. Aktivieren Sie dies, um die Überspringfunktion zu aktivieren.',
            skipSecondsOnStart: 'Sekunden am Anfang überspringen',
            skipSecondsOnStartTooltip: 'Anzahl der Sekunden, die vom Anfang an übersprungen werden sollen, wenn das automatische Überspringen aktiviert ist.',
            introSkipSize: 'Intro-Skipgröße, Sek',
            introSkipSizeTooltip: 'Intro-Skipgröße. Dies ist mit dem Titel verknüpft und sollte über alle Episoden hinweg gleich bleiben',
            outroSkipThreshold: 'Outro-Skipschwelle, Sek',
            outroSkipThresholdTooltip: 'Autoplay wird ausgelöst, wenn der Videoplayer weniger als DIESE Anzahl von Sekunden zum Abspielen übrig hat. Es ist mit dem Titel verknüpft und sollte über alle Episoden hinweg gleich bleiben',
            resetToDefaults: 'Auf Standard zurücksetzen',
            hotkeys: 'Hotkeys',
            fastBackward: 'Schneller Rücklauf*',
            fastBackwardTooltip: 'Hotkey für einen schnellen Rücklauf. Ein Neuladen der Seite ist für diese Einstellung erforderlich!',
            fastForward: 'Schneller Vorlauf*',
            fastForwardTooltip: 'Hotkey für einen schnellen Vorlauf. Ein Neuladen der Seite ist für diese Einstellung erforderlich!',
            fullscreen: 'Vollbild*',
            fullscreenTooltip: 'Hotkey zum Umschalten des Vollbildmodus. Ein Neuladen der Seite ist für diese Einstellung erforderlich!',
            largeSkip: 'Intro überspringen*',
            largeSkipTooltip: 'Hotkey für einen Intro-Skip. Ein Neuladen der Seite ist für diese Einstellung erforderlich!',
            defaultIntroSkipSize: 'Standard-Intro-Skipgröße, Sek',
            defaultIntroSkipSizeTooltip: 'Standard-Intro-Skipgröße',
            defaultOutroSkipThreshold: 'Standard-Outro-Skipschwelle, Sek',
            defaultOutroSkipThresholdTooltip: 'Standard-Outro-Skipschwelle',
            fastForwardSize: 'Schnellvorlaufgröße, Sek',
            fastForwardSizeTooltip: 'Anzahl der Sekunden, die mit Doppeltipps oder durch Drücken einer entsprechenden Hotkey übersprungen oder zurückgespult werden sollen',
            highlightVisitedEpisodes: 'Besuchte Episoden hervorheben',
            highlightVisitedEpisodesTooltip: 'Hebt zuvor besuchte Episodenlinks gelb hervor, damit Sie leicht erkennen können, welche Episoden Sie bereits geöffnet haben',
            playOnIntroSkip: 'Bei Intro-Skip abspielen',
            playOnIntroSkipTooltip: 'Intro-Skip startet auch die Wiedergabe',
            corsProxy: 'CORS-Proxy',
            corsProxyTooltip: 'Um ein mögliches VOE-zu-VOE ungestummtes Autoplay zu ermöglichen, muss das Skript eine sehr kleine Anzahl von Webanfragen über einen eigenen Proxyserver leiten. Lassen Sie das Eingabefeld leer, um dies zu deaktivieren oder Ihren eigenen Proxy festzulegen',
            commlinkPollingInterval: 'Commlink-Abfrageintervall, ms*',
            commlinkPollingIntervalTooltip: 'Spiegelt die Reaktionsfähigkeit der Nachrichtenübertragung zwischen einem Player und einem Top-Scope wider. Kann die CPU-Auslastung beeinträchtigen, wenn sie zu niedrig eingestellt ist. 40 sollten ausreichen. Ein Neuladen der Seite ist für diese Einstellung erforderlich!',
            skipIntro: 'Intro überspringen',
            autoplayEnabled: 'Autoplay ist aktiviert',
            autoplayDisabled: 'Autoplay ist deaktiviert',
            prevEpisode: 'Vorherige Episode*',
            prevEpisodeTooltip: 'Hotkey für die vorherige Episode. Ein Neuladen der Seite ist für diese Einstellung erforderlich!',
            nextEpisode: 'Nächste Episode*',
            nextEpisodeTooltip: 'Hotkey für die nächste Episode. Ein Neuladen der Seite ist für diese Einstellung erforderlich!',
            cancelAutoplay: 'Autoplay abbrechen*',
            cancelAutoplayTooltip: 'Hotkey zum Abbrechen des Autoplay-Countdowns. Seitenneuladen erforderlich.',
            visitedEpisodeColor: 'Farbe besuchter Episoden',
            visitedEpisodeColorTooltip: 'Farbe für bereits besuchte Episodenlinks',
        }
    };

    const i18n = localizations[userLang];

    // ============================================
    // SHARED THEME SYSTEM
    // ============================================
    // Default settings layout
    const DEFAULT_SETTINGS_LAYOUT = {
        prefs: ['autoSkip', 'skip', 'defaults', 'display'],
        adv: ['timing', 'behavior', 'playback', 'appearance', 'network', 'hotkeys']
    };

    const BUILT_IN_THEMES = {
        classic: {
            name: 'Classic',
            builtIn: true,
            vars: {
                bgPrimary: '#1a1a2e',
                bgSecondary: '#16213e',
                bgTertiary: '#0f3460',
                bgHover: 'rgba(124, 131, 253, 0.1)',
                accentPrimary: 'rgba(147,112,219,1)',
                accentSecondary: '#9a9fff',
                accentGlow: 'rgba(147,112,219,0.4)',
                accentGreen: 'rgba(34,197,94,1)',
                textPrimary: '#e0e0e0',
                textSecondary: '#a0a0b0',
                textMuted: '#a0a0b0',
                borderColor: '#2a2a4a',
                borderLight: '#2a2a4a',
                borderRadius: '16px',
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                // Header colors
                headerBg: '#16213e',
                headerText: '#e0e0e0',
                headerAccent1: 'rgba(147,112,219,1)',
                headerAccent2: '#9a9fff',
                headerTag: '#a0a0b0',
                // Submit button colors
                submitBtnBg1: 'rgba(147,112,219,1)',
                submitBtnBg2: '#9a9fff',
                submitBtnText: '#e0e0e0'
            }
        },
        aniworld: {
            name: 'AniWorld',
            builtIn: true,
            vars: {
                bgPrimary: 'rgba(18,28,34,1)',
                bgSecondary: 'rgba(26,42,51,1)',
                bgTertiary: 'rgba(36,55,67,1)',
                bgHover: 'rgba(45,68,79,1)',
                accentPrimary: 'rgba(99,124,249,1)',
                accentSecondary: 'rgba(99,124,249,1)',
                accentGlow: 'rgba(99,124,249,0.3)',
                accentGreen: 'rgba(99,208,43,1)',
                textPrimary: 'rgba(232,232,232,1)',
                textSecondary: 'rgba(192,212,222,1)',
                textMuted: 'rgba(168,192,204,1)',
                borderColor: 'rgba(45,68,79,1)',
                borderLight: 'rgba(58,85,101,1)',
                borderRadius: '12px',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
                // Header colors
                headerBg: 'rgba(26,42,51,1)',
                headerText: 'rgba(232,232,232,1)',
                headerAccent1: 'rgba(99,124,249,1)',
                headerAccent2: 'rgba(68,173,243,1)',
                headerTag: 'rgba(168,192,204,1)',
                // Submit button colors
                submitBtnBg1: 'rgba(99,124,249,1)',
                submitBtnBg2: 'rgba(139,92,246,1)',
                submitBtnText: 'rgba(255,255,255,1)'
            }
        },
    };

    // Get custom themes from storage
    const getCustomThemes = () => {
        try {
            return JSON.parse(GM_getValue('customThemes') || '{}');
        } catch {
            return {};
        }
    };

    // Save custom themes to storage
    const saveCustomThemes = (themes) => {
        GM_setValue('customThemes', JSON.stringify(themes));
    };

    // Get all themes (built-in + custom)
    const getAllThemes = () => {
        return { ...BUILT_IN_THEMES, ...getCustomThemes() };
    };

    // Get current theme variables (with fallback to classic)
    const getCurrentThemeVars = () => {
        const savedTheme = GM_getValue('uiTheme') || 'classic';
        const allThemes = getAllThemes();
        const theme = allThemes[savedTheme];
        // Fallback to classic if theme not found
        return theme?.vars || BUILT_IN_THEMES.classic.vars;
    };

    // Domains list the script should work for
    const TOP_SCOPE_DOMAINS = [
        'aniworld.to',
        's.to',
        'serienstream.to',
        '186.2.175.5',
    ];

    // S.to related domains (all use the new layout)
    const STO_DOMAINS = [
        's.to',
        'serienstream.to',
        '186.2.175.5',
    ];

    // Helper to detect if we're on the new S.to layout
    const isNewStoLayout = () => {
        return STO_DOMAINS.includes(location.hostname) && !!document.querySelector('#player-iframe');
    };

    const TOP_SCOPE_DOMAINS_IDS = {
        'aniworld.to': 'aniworld',
        's.to': 'sto',
        'serienstream.to': 'sto',
        '186.2.175.5': 'sto',
    };

    // Names should be the exact same as in the providers list of the website
    const VIDEO_PROVIDERS_MAP = {
        VOE: 'VOE',
    };
    const CORE_SETTINGS_MAP = {
        currentLargeSkipSizeS: 'currentLargeSkipSizeS',
        currentOutroSkipThresholdS: 'currentOutroSkipThresholdS',
        isAutoplayEnabled: 'isAutoplayEnabled',
        shouldAutoSkipOnStart: 'shouldAutoSkipOnStart',
        autoSkipSecondsOnStart: 'autoSkipSecondsOnStart',
    };
    // Note that defaults are applied only on a very first run of the script
    const CORE_SETTINGS_DEFAULTS = {
        // Default value doesn't matter because it fallbacks to
        // ADVANCED_SETTINGS_DEFAULTS.defaultLargeSkipSizeS anyway
        [CORE_SETTINGS_MAP.currentLargeSkipSizeS]: 87,
        [CORE_SETTINGS_MAP.currentOutroSkipThresholdS]: 90, // same logic
        [CORE_SETTINGS_MAP.shouldAutoSkipOnStart]: true,
        [CORE_SETTINGS_MAP.autoSkipSecondsOnStart]: 0,
        [CORE_SETTINGS_MAP.isAutoplayEnabled]: false,
    };
    const HOTKEYS_SETTINGS_MAP = {
        fastBackward: 'fastBackward',
        fastForward: 'fastForward',
        largeSkip: 'largeSkip',
        prevEpisode: 'prevEpisode',
        nextEpisode: 'nextEpisode',
        cancelAutoplay: 'cancelAutoplay',
    };
    // Note that defaults are applied only on a very first run of the script
    const HOTKEYS_SETTINGS_DEFAULTS = {
        [HOTKEYS_SETTINGS_MAP.fastBackward]: 'left',
        [HOTKEYS_SETTINGS_MAP.fastForward]: 'right',
        [HOTKEYS_SETTINGS_MAP.largeSkip]: '',
        [HOTKEYS_SETTINGS_MAP.prevEpisode]: '',
        [HOTKEYS_SETTINGS_MAP.nextEpisode]: '',
        [HOTKEYS_SETTINGS_MAP.cancelAutoplay]: 'backspace',
    };
    const MAIN_SETTINGS_MAP = {
        highlightVisitedEpisodes: 'highlightVisitedEpisodes',
        shouldAutoplayMuted: 'shouldAutoplayMuted',
        visitedEpisodeColor: 'visitedEpisodeColor',
    };
    // Note that defaults are applied only on a very first run of the script
    const MAIN_SETTINGS_DEFAULTS = {
        [MAIN_SETTINGS_MAP.highlightVisitedEpisodes]: true,
        [MAIN_SETTINGS_MAP.shouldAutoplayMuted]: true,
        [MAIN_SETTINGS_MAP.visitedEpisodeColor]: '#ffdd00',
    };
    const ADVANCED_SETTINGS_MAP = {
        commlinkPollingIntervalMs: 'commlinkPollingIntervalMs',
        corsProxy: 'corsProxy',
        defaultLargeSkipSizeS: 'defaultLargeSkipSizeS',
        defaultOutroSkipThresholdS: 'defaultOutroSkipThresholdS',
        fastForwardSizeS: 'fastForwardSizeS',
        largeSkipCooldownMs: 'largeSkipCooldownMs',
        playOnLargeSkip: 'playOnLargeSkip',
        skipX: 'skipX',
        skipC: 'skipC',
        skipV: 'skipV',
        skipB: 'skipB',
    };
    // Note that defaults are applied only on a very first run of the script
    const ADVANCED_SETTINGS_DEFAULTS = {
        [ADVANCED_SETTINGS_MAP.commlinkPollingIntervalMs]: 40,
        [ADVANCED_SETTINGS_MAP.corsProxy]: 'https://aniworld-to-cors-proxy.fly.dev/',
        [ADVANCED_SETTINGS_MAP.defaultLargeSkipSizeS]: 87,
        [ADVANCED_SETTINGS_MAP.defaultOutroSkipThresholdS]: 90,
        [ADVANCED_SETTINGS_MAP.fastForwardSizeS]: 10,
        [ADVANCED_SETTINGS_MAP.largeSkipCooldownMs]: 300,
        [ADVANCED_SETTINGS_MAP.playOnLargeSkip]: true,
        [ADVANCED_SETTINGS_MAP.skipX]: 15,
        [ADVANCED_SETTINGS_MAP.skipC]: 30,
        [ADVANCED_SETTINGS_MAP.skipV]: 60,
        [ADVANCED_SETTINGS_MAP.skipB]: 90,
    };

    // Can not handle nested objects
    class DataStore {
        constructor(uuid, defaultStorage = {}) {
            if (typeof uuid !== 'string' && typeof uuid !== 'number') {
                throw new Error('Expected uuid when creating DataStore');
            }

            this.__uuid = uuid;
            this.__storage = defaultStorage;
            try {
                this.__storage = JSON.parse(GM_getValue(uuid));
            } catch {
                GM_setValue(uuid, JSON.stringify(defaultStorage));
            }

            return new Proxy(this, {
                get: (obj, prop) => {
                    if (prop === 'destroy') return () => obj.__destroy();
                    if (prop === 'update') return updates => obj.__update(updates);

                    return obj.__storage[prop];
                },

                set: (obj, prop, value) => {
                    obj.__storage[prop] = value;
                    GM_setValue(obj.__uuid, JSON.stringify(obj.__storage));

                    return true;
                }
            });
        }

        __update(updates) {
            if (updates) {
                Object.assign(this.__storage, updates);
                GM_setValue(this.__uuid, JSON.stringify(this.__storage));
            } else {
                try {
                    this.__storage = JSON.parse(GM_getValue(this.__uuid)) || {};
                } catch {
                    this.__storage = {};
                }
            }
        }

        __destroy() {
            GM_deleteValue(this.__uuid);
            this.__storage = {};
        }
    }

    const advancedSettings = new DataStore('advancedSettings', ADVANCED_SETTINGS_DEFAULTS);
    const coreSettings = new DataStore('coreSettings', CORE_SETTINGS_DEFAULTS);
    const hotkeysSettings = new DataStore('hotkeysSettings', HOTKEYS_SETTINGS_DEFAULTS);
    const mainSettings = new DataStore('mainSettings', MAIN_SETTINGS_DEFAULTS);
    [
        [advancedSettings, ADVANCED_SETTINGS_DEFAULTS],
        [coreSettings, CORE_SETTINGS_DEFAULTS],
        [hotkeysSettings, HOTKEYS_SETTINGS_DEFAULTS],
        [mainSettings, MAIN_SETTINGS_DEFAULTS]
    ].forEach(([settings, defaults]) => {
        Object.entries(defaults).forEach(([key, value]) => (settings[key] ??= value));
    });

    const WATCH_PROGRESS_THRESHOLD = 0.8;

    const getWatchProgress = () => {
        try { return JSON.parse(GM_getValue('watchProgress') || '{}'); } catch { return {}; }
    };

    const saveWatchProgress = (data) => {
        GM_setValue('watchProgress', JSON.stringify(data));
    };

    const applyEpisodeProgress = (episodeId, progress) => {
        const link = document.querySelector(`a[data-episode-id="${episodeId}"]`);
        if (!link) return;
        const color = mainSettings[MAIN_SETTINGS_MAP.visitedEpisodeColor];
        if (!mainSettings[MAIN_SETTINGS_MAP.highlightVisitedEpisodes]) {
            link.style.background = '';
            return;
        }
        const pct = Math.round(progress * 100);
        if (pct <= 0) {
            link.style.background = '';
        } else {
            link.style.background = `linear-gradient(to right, ${color} ${pct}%, transparent ${pct}%)`;
        }
    };

    const applyAllEpisodeProgress = () => {
        if (!mainSettings[MAIN_SETTINGS_MAP.highlightVisitedEpisodes]) return;
        const data = getWatchProgress();
        Object.entries(data).forEach(([episodeId, progress]) => {
            applyEpisodeProgress(episodeId, progress);
        });
        applyAllSeasonProgress();
    };

    const applySeasonProgress = (seasonLink, seasonId) => {
        if (!mainSettings[MAIN_SETTINGS_MAP.highlightVisitedEpisodes]) {
            seasonLink.style.background = '';
            return;
        }
        const episodeLinks = [...document.querySelectorAll(`a[data-season-id="${seasonId}"]`)];
        if (!episodeLinks.length) return;
        const data = getWatchProgress();
        const watched = episodeLinks.filter(el => {
            const p = data[el.dataset.episodeId] || 0;
            return p >= WATCH_PROGRESS_THRESHOLD;
        }).length;
        const pct = Math.round((watched / episodeLinks.length) * 100);
        const color = mainSettings[MAIN_SETTINGS_MAP.visitedEpisodeColor];
        seasonLink.style.background = pct <= 0
            ? ''
            : `linear-gradient(to right, ${color} ${pct}%, transparent ${pct}%)`;
    };

    const applyAllSeasonProgress = () => {
        if (!mainSettings[MAIN_SETTINGS_MAP.highlightVisitedEpisodes]) return;
        const currentSeasonLink = document.querySelector('div#stream > ul:first-child a.active');
        if (!currentSeasonLink) return;
        const seasonId = document.querySelector('a[data-season-id]')?.dataset.seasonId;
        if (!seasonId) return;
        applySeasonProgress(currentSeasonLink, seasonId);
    };

    // -------------------------------------- /utils ---------------------------------------------

    const Notiflixx = (() => {
        GM_addStyle(`
      [id^=NotiflixBlockWrap], [id^=NotiflixConfirmWrap],
      [id^=NotiflixLoadingWrap], [id^=NotiflixNotifyWrap],
      [id^=NotiflixReportWrap] {
        -webkit-tap-highlight-color: #24242412;
      }

      div.notiflix-report-icon {
        width: 60px !important;
        height: 60px !important;
      }

      div.notiflix-report-content {
        max-width: 1010px !important;
        width: unset !important;
      }


      .notiflix-hotkeys-guide-modal {
        max-height: 70vh;
        overflow-y: auto;
        padding: 0 15px;
      }

      .notiflix-hotkeys-guide-modal h5 {
        font-size: 19px;
        margin: 25px 0 10px 0;
      }

      .notiflix-hotkeys-guide-modal h5:first-child {
        margin: 0 0 10px 0;
      }

      .notiflix-hotkeys-guide-modal div {
        color: black;
        margin-bottom: 5px;
      }

      .notiflix-hotkeys-guide-modal pre {
        background: #243743;
        border: none;
        display: inline-block;
        margin: 1px 0 1px 0;
        padding: 4px 8px;
        vertical-align: middle;
      }
      `);
        const notifyDefaultOptions = {
            closeButton: false,
            messageMaxLength: 500,
            plainText: false,
            get position() { return getNotifyPosition(); },
            zindex: 3222222,
        };
        const reportDefaultOptions = {
            titleMaxLength: 100,
            zindex: 3222223,
        };
        const disableBodyScroll = () => {
            // Order is important here
            document.body.style.paddingRight = (
                `${window.innerWidth - document.documentElement.clientWidth}px`
            );
            document.body.style.overflow = 'hidden';
        };

        const restoreBodyScroll = () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };

        const createNotifyHandler = (notifyType) => {
            return (message, customOptions = {}) => {
                Notiflix.Notify[notifyType](message, {
                    ...notifyDefaultOptions,
                    ...customOptions,
                });
            };
        };

        const createReportHandler = (reportType) => {
            return (titleText, messageText, btnText, customOptions = {}) => {
                disableBodyScroll();
                Notiflix.Report[reportType](titleText, messageText, btnText, () => {
                    restoreBodyScroll();
                }, {
                    ...reportDefaultOptions,
                    ...customOptions,
                });
                if (customOptions.backOverlayClickToClose) {
                    const backOverlay = document.querySelector(
                        '[id^=NotiflixReportWrap] > div[class*="-overlay"]'
                    );
                    backOverlay?.addEventListener('click', () => restoreBodyScroll());
                }

                if (customOptions.delayedButton) {
                    const closeBtn = document.querySelector('a#NXReportButton');
                    closeBtn.style.background = '#b2b2b2';
                    closeBtn.style.pointerEvents = 'none';

                    setTimeout(() => {
                        closeBtn.style.background = '#26c0d3';
                        closeBtn.style.pointerEvents = '';
                    }, 2000);
                }
            };
        };
        return {
            notify: {
                failure: createNotifyHandler('failure'),
                info: createNotifyHandler('info'),
                warning: createNotifyHandler('warning'),
            },

            report: {
                info: createReportHandler('info'),
                warning: createReportHandler('warning'),
            },
        };
    })();
    function applyNotiflixTheme() {
        const vars = getCurrentThemeVars();
        Notiflix.Notify.init({
            background: vars.bgSecondary,
            textColor: vars.textPrimary,
            successColor: vars.accentGreen,
            warningColor: '#f59e0b',
            failureColor: '#ef4444',
            infoColor: '#6b6b8a',
            fontFamily: vars.fontFamily,
        });
    }
    applyNotiflixTheme();

    function getNotifyPosition() {
        const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
        return (isMobile && !!document.fullscreenElement) ? 'right-top' : 'right-bottom';
    }

    function detectHold(element, callback, {
        holdTimeMs = 700,
        validPointerTypes = ['mouse', 'pen', 'touch'],
    } = {
        holdTimeMs: 700,
        validPointerTypes: ['mouse', 'pen', 'touch'],
    }) {
        let timer;
        const clearHold = () => clearTimeout(timer);
        const startHold = (ev) => {
            if (validPointerTypes.includes(ev.pointerType)) {
                timer = setTimeout(() => callback(), holdTimeMs);
            }
        };

        element.addEventListener('pointerdown', startHold);
        element.addEventListener('pointerup', clearHold);
        element.addEventListener('pointercancel', clearHold);
        element.addEventListener('pointerout', clearHold);
        element.addEventListener('pointerleave', clearHold);
    }

    function isEmbedded() {
        try {
            return window.top !== window.self;
        } catch {
            return true;
        }
    }

    function makeId(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';

        for (let i = 0; i < length; i++) {
            text += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return text;
    }

    async function sleep(ms = 0) {
        return new Promise(r => setTimeout(r, ms));
    }


    function waitForElement(query, {
        callbackOnTimeout = false,
        existing = false,
        onceOnly = false,
        rootElement = document.documentElement,
        timeout,

        // "attributes" prop is not supported
        observerOptions = {
            childList: true,
            subtree: true,
        },
    }, callback) {
        if (!query) throw new Error('Query is needed');
        if (!callback) throw new Error('Callback is needed');

        const handledElements = new WeakSet();
        const existingElements = rootElement.querySelectorAll(query);
        let timeoutId = null;
        if (existingElements.length) {
            // Mark all as handled for a proper work when `existing` is false
            // to ignore them later on
            for (const node of existingElements) {
                handledElements.add(node);
            }

            if (existing) {
                if (onceOnly) {
                    try {
                        callback(existingElements[0]);
                    } catch (e) {
                        console.error(e);
                    }

                    return;
                } else {
                    for (const node of existingElements) {
                        try {
                            callback(node);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
            }
        }

        const observer = new MutationObserver((mutations, observer) => {
            for (const node of rootElement.querySelectorAll(query)) {
                if (handledElements.has(node)) continue;

                handledElements.add(node);

                try {
                    callback(node);
                } catch (e) {
                    console.error(e);
                }

                if (onceOnly) {
                    observer.disconnect();

                    if (timeoutId) clearTimeout(timeoutId);

                    return;
                }
            }
        });
        observer.observe(rootElement, {
            attributes: false,
            childList: observerOptions.childList || false,
            subtree: observerOptions.subtree || false,
        });
        if (timeout !== undefined) {
            timeoutId = setTimeout(() => {
                observer.disconnect();

                if (callbackOnTimeout) {
                    try {
                        callback(null);
                    } catch (e) {
                        console.error(e);
                    }
                }
            }, timeout);
        }

        return observer;
    }

    async function waitForUserInteraction() {
        return new Promise((resolve) => {
            const handler = () => {
                document.removeEventListener('pointerup', handler);
                document.removeEventListener('keydown', handler);

                resolve();
            };

            document.addEventListener('pointerup', handler, {
                once: true
            });
            document.addEventListener('keydown', handler, {
                once: true
            });
        });
    }

    // -------------------------------------- utils\ ---------------------------------------------

    /* CommLink.js
    - Version: 1.0.1
    - Author: Haka
    - Description: A userscript library for cross-window communication via the userscript storage
    - GitHub: https://github.com/AugmentedWeb/CommLink
    */
    class CommLinkHandler {
        constructor(commlinkID, configObj) {
            this.commlinkID = commlinkID;
            this.singlePacketResponseWaitTime = configObj?.singlePacketResponseWaitTime || 1500;
            this.maxSendAttempts = configObj?.maxSendAttempts || 3;
            this.statusCheckInterval = configObj?.statusCheckInterval || 1;
            this.silentMode = configObj?.silentMode || false;
            this.commlinkValueIndicator = 'commlink-packet-';
            this.commands = {};
            this.listeners = [];

            const missingGrants = [
                'GM_getValue',
                'GM_setValue',
                'GM_deleteValue',
                'GM_listValues',
            ].filter(grant => !GM_info.script.grant.includes(grant));
            if (missingGrants.length > 0 && !this.silentMode) {
                alert(
                    `[CommLink] The following userscript grants are missing: ${missingGrants.join(', ')}. CommLink will not work.`
                );
            }

            this.getStoredPackets()
                .filter(packet => Date.now() - packet.date > 2e4)
                .forEach(packet => this.removePacketByID(packet.id));
        }

        setIntervalAsync(callback, interval = this.statusCheckInterval) {
            let running = true;
            async function loop() {
                while (running) {
                    try {
                        await callback();
                        await new Promise((resolve) => setTimeout(resolve, interval));
                    } catch {
                        continue;
                    }
                }
            };
            loop();

            return {
                stop: () => {
                    running = false;
                    return false;
                }
            };
        }

        getUniqueID() {
            return ([1e7] + -1e3 + 4e3 + -8e3 + -1e11)
                .replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        }

        getCommKey(packetID) {
            return this.commlinkValueIndicator + packetID;
        }

        getStoredPackets() {
            return GM_listValues()
                .filter(key => key.includes(this.commlinkValueIndicator))
                .map(key => GM_getValue(key));
        }

        addPacket(packet) {
            GM_setValue(this.getCommKey(packet.id), packet);
        }

        removePacketByID(packetID) {
            GM_deleteValue(this.getCommKey(packetID));
        }

        findPacketByID(packetID) {
            return GM_getValue(this.getCommKey(packetID));
        }

        editPacket(newPacket) {
            GM_setValue(this.getCommKey(newPacket.id), newPacket);
        }

        send(platform, cmd, d) {
            return new Promise(async resolve => {
                const packetWaitTimeMs = this.singlePacketResponseWaitTime;
                const maxAttempts = this.maxSendAttempts;

                let attempts = 0;

                for (;;) {
                    attempts++;

                    const packetID = this.getUniqueID();
                    const attemptStartDate = Date.now();

                    const packet = {
                        command: cmd,
                        data: d,
                        date: attemptStartDate,
                        id: packetID,
                        sender: platform,
                    };

                    if (!this.silentMode) {
                        console.log(`[CommLink Sender] Sending packet! (#${attempts} attempt):`, packet);
                    }

                    this.addPacket(packet);

                    for (;;) {
                        const poolPacket = this.findPacketByID(packetID);
                        const packetResult = poolPacket?.result;

                        if (poolPacket && packetResult) {
                            if (!this.silentMode) {
                                console.log(`[CommLink Sender] Got result for a packet (${packetID}):`, packetResult);
                            }

                            resolve(poolPacket.result);
                            attempts = maxAttempts; // stop main loop

                            break;
                        }

                        if (!poolPacket || Date.now() - attemptStartDate > packetWaitTimeMs) {
                            break;
                        }

                        await new Promise(res => setTimeout(res, this.statusCheckInterval));
                    }

                    this.removePacketByID(packetID);
                    if (attempts === maxAttempts) break;
                }

                return resolve(null);
            });
        }

        registerSendCommand(name, obj) {
            this.commands[name] = async (data) => {
                return await this.send(obj?.commlinkID || this.commlinkID, name, obj?.data || data);
            };
        }

        registerListener(sender, commandHandler) {
            const listener = {
                sender,
                commandHandler,
                intervalObj: this.setIntervalAsync(this.receivePackets.bind(this), this.statusCheckInterval),
            };
            this.listeners.push(listener);
        }

        receivePackets() {
            this.getStoredPackets().forEach(packet => {
                this.listeners.forEach(listener => {
                    if (packet.sender === listener.sender && !packet.hasOwnProperty('result')) {
                        const result = listener.commandHandler(packet);

                        packet.result = result;

                        this.editPacket(packet);

                        if (!this.silentMode) {
                            if (packet.result === null) {
                                console.log('[CommLink Receiver] Possibly failed to handle packet:', packet);
                            } else {
                                console.log('[CommLink Receiver] Successfully handled a packet:', packet);
                            }
                        }
                    }
                });
            });
        }

        kill() {
            this.listeners.forEach(listener => listener.intervalObj.stop());
        }
    }


    class IframeMessenger {
        constructor() {
            this.commLink = null;
            this.topScopeId = null;
        }

        static get messages() {
            return {
                AUTOPLAY_NEXT: 'AUTOPLAY_NEXT',
                AUTOPLAY_PREV: 'AUTOPLAY_PREV',
                REQUEST_CURRENT_FRANCHISE_DATA: 'REQUEST_CURRENT_FRANCHISE_DATA',
                OPEN_HOTKEYS_GUIDE: 'OPEN_HOTKEYS_GUIDE',
                TOP_NOTIFLIX_REPORT_INFO: 'TOP_NOTIFLIX_REPORT_INFO',
                UPDATE_CORE_SETTINGS: 'UPDATE_CORE_SETTINGS',
                UPDATE_EPISODE_PROGRESS: 'UPDATE_EPISODE_PROGRESS',
            };
        }

        async initCrossFrameConnection() {
            const iframeId = makeId();
            const topScopeIdPromise = new Promise((resolve) => {
                // Top scope using GM_setValue will write its own id using iframeId as a key
                const valueChangeListenerId = GM_addValueChangeListener(iframeId, (
                    _key,
                    _oldValue,
                    newValue,
                ) => {
                    GM_removeValueChangeListener(valueChangeListenerId);
                    GM_deleteValue(iframeId);

                    resolve(newValue);
                });
            });
            // This should be almost immediately picked up by a top scope
            GM_setValue('unboundIframeId', iframeId);
            const topScopeId = await topScopeIdPromise;

            if (!iframeId || !topScopeId) throw new Error('Something went wrong');

            this.topScopeId = topScopeId;
            this.commLink = new CommLinkHandler(iframeId, {
                silentMode: true,
                statusCheckInterval: advancedSettings[ADVANCED_SETTINGS_MAP.commlinkPollingIntervalMs],
            });
            this.commLink.registerSendCommand(IframeMessenger.messages.AUTOPLAY_NEXT);
            this.commLink.registerSendCommand(IframeMessenger.messages.AUTOPLAY_PREV);
            this.commLink.registerSendCommand(IframeMessenger.messages.REQUEST_CURRENT_FRANCHISE_DATA);
            this.commLink.registerSendCommand(IframeMessenger.messages.OPEN_HOTKEYS_GUIDE);
            this.commLink.registerSendCommand(IframeMessenger.messages.TOP_NOTIFLIX_REPORT_INFO);
            this.commLink.registerSendCommand(IframeMessenger.messages.UPDATE_CORE_SETTINGS);
            this.commLink.registerSendCommand(IframeMessenger.messages.UPDATE_EPISODE_PROGRESS);
        }

        registerConnectionListener(callback) {
            return this.commLink.registerListener(this.topScopeId, callback);
        }

        sendMessage(message, msgData) {
            this.commLink.commands[message](msgData);
            return;
        }
    }

    let activeAutoplayCancelFn = null;

    class IframeInterface {
        constructor(messenger) {
            this.commLink = null;
            this.currentFranchiseId = null;
            this.currentVideoId = null;
            this.ignoreMissingFranchiseOnce = true;
            this.messenger = messenger;
            this.topScopeDomainId = '';
            coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS] = (
                advancedSettings[ADVANCED_SETTINGS_MAP.defaultLargeSkipSizeS]
            );
            coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS] = (
                advancedSettings[ADVANCED_SETTINGS_MAP.defaultOutroSkipThresholdS]
            );
        }

        // It is better not to be async
        handleTopScopeMessages(packet) {
            (async function() {
                try {
                    switch (packet.command) {
                        case TopScopeInterface.messages.CURRENT_FRANCHISE_DATA: {
                            // At least one value is going to be present
                            this.currentVideoId = packet.data.currentVideoId || null;
                            this.topScopeDomainId = packet.data.topScopeDomainId || '';

                            if (packet.data.currentFranchiseId) {
                                this.currentFranchiseId = packet.data.currentFranchiseId;

                                coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS] = (
                                    advancedSettings[ADVANCED_SETTINGS_MAP.defaultLargeSkipSizeS]
                                );
                                coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS] = (
                                    advancedSettings[ADVANCED_SETTINGS_MAP.defaultOutroSkipThresholdS]
                                );

                                this.settingsPane?.refresh();
                                this.ignoreMissingFranchiseOnce = false;
                            }

                            break;
                        }

                        default:
                            break;
                    }
                } catch (e) {
                    console.error(e);
                }
            }.bind(this)());
            return {
                status: `${this.constructor.name} received a message`,
            };
        }

        async init(player) {
            this.messenger.registerConnectionListener(this.handleTopScopeMessages.bind(this));
            this.messenger.sendMessage(IframeMessenger.messages.REQUEST_CURRENT_FRANCHISE_DATA);

            await this.preparePlayer(player);
        }


        createAutoplayButton() {
            const button = document.createElement('button');
            const toggleContainer = document.createElement('div');
            const toggleDot = document.createElement('div');
            const isAutoplayEnabled = coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled];
            let lastClickTime = 0;
            button.addEventListener('click', () => {
                const now = Date.now();

                // Prevent double-clicks unwanted behavior
                if (now - lastClickTime < 300) return;

                lastClickTime = now;

                if (!GM_getValue('firstRunTextWasShown')) {
                    GM_setValue('firstRunTextWasShown', true);

                    this.messenger.sendMessage(IframeMessenger.messages.TOP_NOTIFLIX_REPORT_INFO, {
                        args: [
                            i18n.firstRunInfoText(),
                            { timeout: 7000 },
                        ],
                    });
                }

                const wasEnabled = coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled];
                coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled] = !wasEnabled;

                button.setAttribute('aria-checked', (!wasEnabled).toString());
                button.title = (
                    wasEnabled ? i18n.autoplayDisabled : i18n.autoplayEnabled
                );
                button.style.background = '';
                toggleContainer.style.backgroundColor = wasEnabled ? 'rgba(221, 221, 221, 0.5)' : '#3eb489';
                toggleDot.style.backgroundColor = '#fff';
                toggleDot.style.transform = wasEnabled ? 'translateX(0px)' : 'translateX(12px)';
            });

            button.type = 'button';
            button.title = (
                !isAutoplayEnabled ? i18n.autoplayDisabled : i18n.autoplayEnabled
            );
            button.style.background = '';
            button.appendChild(toggleContainer);
            button.setAttribute('aria-checked', (isAutoplayEnabled).toString());
            button.className = 'Autoplay-button';

            toggleContainer.className = 'Autoplay-button--toggle';
            toggleContainer.style.backgroundColor = isAutoplayEnabled ? '#3eb489' : 'rgba(221, 221, 221, 0.5)';
            toggleContainer.appendChild(toggleDot);

            toggleDot.className = 'Autoplay-button--toggle-dot';
            toggleDot.style.backgroundColor = '#fff';
            toggleDot.style.transform = (
                !isAutoplayEnabled ? 'translateX(0px)' : 'translateX(12px)'
            );
            GM_addStyle([`
        .Autoplay-button {
          width: 36px;
          height: 36px;
          padding: 0;
          border-radius: 50%;
          border: none;
          background: none;
          cursor: pointer;
          top: 0;
          left: 0;
          transition: all 0.2s ease;
          user-select: none;
          -webkit-user-select: none;
        }

        .Autoplay-button:hover {
          background: none !important;
        }

        .Autoplay-button[aria-checked="true"] .Autoplay-button--toggle-dot {
          transform: translateX(12px);
        }

        .Autoplay-button[aria-checked="true"] .Autoplay-button--toggle {
          background-color: #3eb489;
        }

        .Autoplay-button--toggle {
          width: 24px;
          height: 12px;
          margin-bottom: 3px;
          background-color: rgba(221, 221, 221, 0.5);
          border-radius: 6px;
          position: relative;
          display: inline-block;
          transition: background-color 0.2s ease;
        }

        .Autoplay-button--toggle-dot {
          width: 12px;
          height: 12px;
          background-color: #fff;
          border-radius: 50%;
          position: absolute;
          top: 0;
          left: 0;
          transition: all 0.2s ease;
        }
      `][0]);
            return button;
        }

        createSettingsPane() {
            // ============================================
            // CUSTOM SETTINGS PANEL (Popup-style UI)
            // ============================================

            // Inject Google Fonts
            if (!document.querySelector('link[href*="Space+Grotesk"]')) {
                const fontLink = document.createElement('link');
                fontLink.rel = 'stylesheet';
                fontLink.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
                document.head.appendChild(fontLink);
            }

            // Inject Font Awesome
            if (!document.querySelector('link[href*="font-awesome"]')) {
                const faLink = document.createElement('link');
                faLink.rel = 'stylesheet';
                faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
                document.head.appendChild(faLink);
            }

            // Get saved theme or default to 'classic'
            const savedTheme = GM_getValue('uiTheme') || 'classic';

            // ============================================
            // THEME CSS GENERATION (uses shared theme system)
            // ============================================

            // Generate CSS for a custom theme
            const generateThemeCSS = (themeId, vars) => {
                // Header color defaults (fallback to appropriate base colors)
                const headerBg = vars.headerBg || vars.bgSecondary;
                const headerText = vars.headerText || vars.textPrimary;
                const headerAccent1 = vars.headerAccent1 || vars.accentPrimary;
                const headerAccent2 = vars.headerAccent2 || '#44adf3';
                const headerTag = vars.headerTag || vars.textMuted;

                const css = `
                        .aw-settings-panel[data-theme="${themeId}"] {
                            --bg-primary: ${vars.bgPrimary};
                            --bg-secondary: ${vars.bgSecondary};
                            --bg-tertiary: ${vars.bgTertiary};
                            --bg-hover: ${vars.bgHover};
                            --accent-primary: ${vars.accentPrimary};
                            --accent-secondary: ${vars.accentSecondary};
                            --accent-glow: ${vars.accentGlow};
                            --accent-green: ${vars.accentGreen};
                            --text-primary: ${vars.textPrimary};
                            --text-secondary: ${vars.textSecondary};
                            --text-muted: ${vars.textMuted};
                            --border-color: ${vars.borderColor};
                            --border-light: ${vars.borderLight};
                            --header-bg: ${headerBg};
                            --header-text: ${headerText};
                            --header-accent-1: ${headerAccent1};
                            --header-accent-2: ${headerAccent2};
                            --header-tag: ${headerTag};
                            font-family: ${vars.fontFamily};
                            border-radius: ${vars.borderRadius};
                        }
                        .aw-settings-panel[data-theme="${themeId}"] .aw-settings-header {
                            background: ${headerBg};
                        }
                        .aw-settings-panel[data-theme="${themeId}"] .aw-header-text h1 {
                            color: ${headerText};
                        }
                        .aw-settings-panel[data-theme="${themeId}"] .aw-header-text .aw-tagline {
                            color: ${headerTag};
                        }
                    `;

                return css;
            };

            // Apply all custom theme CSS
            const applyCustomThemeCSS = () => {
                const customThemes = getCustomThemes();
                let css = '';
                for (const [id, theme] of Object.entries(customThemes)) {
                    css += generateThemeCSS(id, theme.vars);
                }
                // Also generate CSS for new built-in themes
                for (const [id, theme] of Object.entries(BUILT_IN_THEMES)) {
                    if (id !== 'classic' && id !== 'aniworld') {
                        css += generateThemeCSS(id, theme.vars);
                    }
                }
                let styleEl = document.getElementById('aw-custom-themes-css');
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = 'aw-custom-themes-css';
                    document.head.appendChild(styleEl);
                }
                styleEl.textContent = css;
            };

            // Apply custom theme CSS immediately
            applyCustomThemeCSS();

            // Inject CSS styles
            GM_addStyle(`
                    /* ============================================
                       SETTINGS PANEL BASE STYLES
                       ============================================ */
                    .aw-settings-overlay {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.6);
                        z-index: 999998;
                        backdrop-filter: blur(4px);
                    }

                    .aw-settings-overlay.active {
                        display: block;
                    }

                    .aw-settings-panel {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 420px;
                        max-width: 95vw;
                        max-height: 90vh;
                        z-index: 999999;
                        display: none;
                        flex-direction: column;
                        box-sizing: border-box;
                        font-size: 13px;
                        line-height: 1.3;
                    }

                    .aw-settings-panel.active {
                        display: flex;
                    }

                    .aw-settings-panel * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }

                    /* ============================================
                       CLASSIC THEME (default)
                       ============================================ */
                    .aw-settings-panel, .aw-settings-panel[data-theme="classic"] {
                        --bg-primary: #0a0a0f;
                        --bg-secondary: #12121a;
                        --bg-tertiary: #1a1a25;
                        --bg-hover: rgba(255, 255, 255, 0.02);
                        --accent-primary: rgba(147,112,219,1);
                        --accent-secondary: #7c3aed;
                        --accent-glow: rgba(147,112,219,0.4);
                        --accent-green: #22c55e;
                        --text-primary: #f0f0f5;
                        --text-secondary: #a0a0b8;
                        --text-muted: #9090a8;
                        --border-color: rgba(255, 255, 255, 0.06);
                        --border-light: rgba(255, 255, 255, 0.1);
                        --header-bg: #12121a;
                        --header-text: #f0f0f5;
                        --header-accent-1: rgba(147,112,219,1);
                        --header-accent-2: #44adf3;
                        --header-tag: #9090a8;

                        font-family: 'Space Grotesk', -apple-system, sans-serif;
                        background: var(--bg-primary);
                        color: var(--text-primary);
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                    }

                    .aw-settings-panel[data-theme="classic"]::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        right: -50%;
                        width: 100%;
                        height: 100%;
                        background: radial-gradient(circle, rgba(147,112,219,0.08) 0%, transparent 60%);
                        pointer-events: none;
                        z-index: 0;
                    }

                    .aw-settings-panel[data-theme="classic"]::after {
                        content: '';
                        position: absolute;
                        bottom: -30%;
                        left: -30%;
                        width: 80%;
                        height: 80%;
                        background: radial-gradient(circle, rgba(124, 58, 237, 0.06) 0%, transparent 50%);
                        pointer-events: none;
                        z-index: 0;
                    }

                    /* ============================================
                       ANIWORLD THEME
                       ============================================ */
                    .aw-settings-panel[data-theme="aniworld"] {
                        --bg-primary: #121c22;
                        --bg-secondary: #1a2a33;
                        --bg-tertiary: #243743;
                        --bg-hover: #2d444f;
                        --accent-primary: #637cf9;
                        --accent-secondary: #637cf9;
                        --accent-glow: rgba(99, 124, 249, 0.3);
                        --accent-green: #63d02b;
                        --text-primary: #e8e8e8;
                        --text-secondary: #c0d4de;
                        --text-muted: #a8c0cc;
                        --border-color: #2d444f;
                        --border-light: #3a5565;
                        --header-bg: #1a2a33;
                        --header-text: #e8e8e8;
                        --header-accent-1: #637cf9;
                        --header-accent-2: #44adf3;
                        --header-tag: #a8c0cc;

                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                        background: var(--bg-primary);
                        color: var(--text-primary);
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    }

                    .aw-settings-panel[data-theme="aniworld"]::before,
                    .aw-settings-panel[data-theme="aniworld"]::after {
                        display: none;
                    }

                    /* ============================================
                       HEADER
                       ============================================ */
                    .aw-settings-header {
                        position: relative;
                        background: var(--header-bg, var(--bg-secondary));
                        padding: 10px 12px;
                        border-bottom: 1px solid var(--border-color);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        z-index: 1;
                    }

                    .aw-header-text h1 {
                        font-size: 14px;
                        font-weight: 600;
                        margin-bottom: 0px;
                        color: var(--header-text, var(--text-primary));
                    }

                    .aw-header-text .aw-tagline {
                        font-size: 10px;
                        color: var(--header-tag, var(--text-secondary));
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-header-text .aw-tagline {
                        font-size: 9px;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                        color: var(--header-tag, var(--text-muted));
                    }

                    .aw-close-btn {
                        margin-left: auto;
                        width: 26px;
                        height: 26px;
                        border: none;
                        background: var(--bg-tertiary);
                        border-radius: 6px;
                        color: var(--text-secondary);
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                        font-size: 14px;
                    }

                    .aw-close-btn:hover {
                        background: var(--bg-hover);
                        color: var(--text-primary);
                    }

                    /* ============================================
                       TABS
                       ============================================ */
                    .aw-tabs {
                        display: flex;
                        background: var(--bg-secondary);
                        border-bottom: 1px solid var(--border-color);
                        position: relative;
                        z-index: 1;
                    }

                    .aw-tab {
                        flex: 1;
                        padding: 8px 12px;
                        background: none;
                        border: none;
                        color: var(--text-secondary);
                        font-family: inherit;
                        font-size: 11px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        position: relative;
                    }

                    .aw-tab:hover {
                        color: var(--text-primary);
                        background: var(--bg-hover);
                    }

                    .aw-tab.active {
                        color: var(--accent-primary);
                    }

                    .aw-tab.active::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 20%;
                        right: 20%;
                        height: 2px;
                        background: var(--accent-primary);
                        border-radius: 2px 2px 0 0;
                    }

                    /* ============================================
                       CONTENT
                       ============================================ */
                    .aw-settings-content {
                        padding: 8px 10px;
                        max-height: 520px;
                        overflow-y: auto;
                        position: relative;
                        z-index: 1;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-settings-content {
                        padding: 10px 12px;
                    }

                    .aw-tab-content {
                        display: none;
                    }

                    .aw-tab-content.active {
                        display: block;
                    }

                    /* ============================================
                       SECTIONS
                       ============================================ */
                    .aw-section {
                        margin-bottom: 8px;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-section {
                        margin-bottom: 10px;
                    }

                    .aw-section:last-child {
                        margin-bottom: 0;
                    }

                    .aw-section-header {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        margin-bottom: 4px;
                        padding-left: 2px;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-section-header {
                        gap: 6px;
                        margin-bottom: 6px;
                    }

                    .aw-section-icon {
                        display: flex;
                        width: 20px;
                        height: 20px;
                        border-radius: 5px;
                        background: var(--bg-tertiary);
                        border: 1px solid var(--border-color);
                        align-items: center;
                        justify-content: center;
                    }

                    .aw-section-icon i {
                        font-size: 10px;
                        color: var(--accent-primary);
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-section-icon i {
                        font-size: 10px;
                        color: var(--accent-primary);
                    }

                    .aw-settings-panel[data-theme="aniworld"] .aw-section-icon {
                        display: flex;
                        width: 20px;
                        height: 20px;
                        border-radius: 5px;
                        background: var(--bg-tertiary);
                        border: 1px solid var(--border-color);
                        align-items: center;
                        justify-content: center;
                    }

                    .aw-settings-panel[data-theme="aniworld"] .aw-section-icon i {
                        font-size: 10px;
                        color: var(--accent-primary);
                    }

                    .aw-section-header > i {
                        color: var(--accent-primary);
                        font-size: 13px;
                        width: 16px;
                        text-align: center;
                        display: none;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-section-header > i,
                    .aw-settings-panel[data-theme="aniworld"] .aw-section-header > i {
                        display: none;
                    }

                    .aw-section-title {
                        font-size: 10px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: var(--text-secondary);
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-section-title {
                        font-size: 10px;
                        letter-spacing: 1px;
                    }

                    /* ============================================
                       SETTINGS CARD
                       ============================================ */
                    .aw-settings-card {
                        background: var(--bg-secondary);
                        border-radius: 8px;
                        border: 1px solid var(--border-color);
                        overflow: hidden;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-settings-card {
                        border-radius: 14px;
                        transition: border-color 0.2s ease;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-settings-card:hover {
                        border-color: var(--border-light);
                    }

                    .aw-setting-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 6px 10px;
                        border-bottom: 1px solid var(--border-color);
                        transition: background 0.15s ease;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-setting-row {
                        padding: 7px 12px;
                    }

                    .aw-setting-row:last-child {
                        border-bottom: none;
                    }

                    .aw-setting-row:hover {
                        background: var(--bg-hover);
                    }

                    .aw-setting-info {
                        flex: 1;
                        min-width: 0;
                        padding-right: 8px;
                    }

                    .aw-setting-label {
                        font-size: 11px;
                        font-weight: 500;
                        color: var(--text-primary);
                        margin-bottom: 0px;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-setting-label {
                        margin-bottom: 0px;
                    }

                    .aw-setting-description {
                        font-size: 9px;
                        color: var(--text-muted);
                        line-height: 1.2;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-setting-description {
                        line-height: 1.2;
                    }

                    /* ============================================
                       TOGGLE SWITCH
                       ============================================ */
                    .aw-toggle {
                        position: relative;
                        width: 32px;
                        height: 18px;
                        flex-shrink: 0;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-toggle {
                        width: 36px;
                        height: 20px;
                    }

                    .aw-toggle input {
                        opacity: 0;
                        width: 0;
                        height: 0;
                    }

                    .aw-toggle-track {
                        position: absolute;
                        cursor: pointer;
                        inset: 0;
                        background: var(--bg-tertiary);
                        border: 1px solid var(--border-light);
                        transition: all 0.25s ease;
                        border-radius: 24px;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-toggle-track {
                        border-radius: 26px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .aw-toggle-track::before {
                        position: absolute;
                        content: "";
                        height: 14px;
                        width: 14px;
                        left: 2px;
                        bottom: 1px;
                        background: var(--text-secondary);
                        transition: all 0.25s ease;
                        border-radius: 50%;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-toggle-track::before {
                        height: 16px;
                        width: 16px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .aw-toggle input:checked + .aw-toggle-track {
                        background: var(--accent-primary);
                        border-color: var(--accent-primary);
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-toggle input:checked + .aw-toggle-track {
                        background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                        border-color: transparent;
                        box-shadow: 0 2px 12px var(--accent-glow);
                    }

                    .aw-toggle input:checked + .aw-toggle-track::before {
                        transform: translateX(14px);
                        background: white;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-toggle input:checked + .aw-toggle-track::before {
                        transform: translateX(16px);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    }

                    /* ============================================
                       NUMBER INPUT
                       ============================================ */
                    .aw-number-input {
                        width: 55px;
                        padding: 4px 6px;
                        background: var(--bg-tertiary);
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        color: var(--text-primary);
                        font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
                        font-size: 11px;
                        text-align: center;
                        transition: all 0.2s ease;
                        -moz-appearance: textfield;
                    }

                    /* Hide spinners by default */
                    .aw-number-input::-webkit-outer-spin-button,
                    .aw-number-input::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                        opacity: 0;
                        transition: opacity 0.2s ease;
                    }

                    /* Show spinners on focus */
                    .aw-number-input:focus::-webkit-outer-spin-button,
                    .aw-number-input:focus::-webkit-inner-spin-button {
                        -webkit-appearance: inner-spin-button;
                        opacity: 1;
                    }

                    .aw-number-input:focus {
                        -moz-appearance: auto;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-number-input {
                        width: 58px;
                        padding: 5px 8px;
                        border-radius: 6px;
                        font-weight: 500;
                    }

                    .aw-number-input:hover {
                        border-color: var(--border-light);
                    }

                    .aw-number-input:focus {
                        outline: none;
                        border-color: var(--accent-primary);
                        box-shadow: 0 0 0 2px rgba(99, 124, 249, 0.2);
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-number-input:focus {
                        box-shadow: 0 0 0 3px rgba(147,112,219,0.15);
                    }

                    /* ============================================
                       TEXT INPUT
                       ============================================ */
                    .aw-text-input {
                        width: 70px;
                        padding: 4px 6px;
                        background: var(--bg-tertiary) !important;
                        background-color: var(--bg-tertiary) !important;
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        color: var(--text-primary) !important;
                        font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
                        font-size: 9px;
                        text-align: center;
                        transition: all 0.2s ease;
                        -webkit-appearance: none;
                        -moz-appearance: none;
                        appearance: none;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-text-input {
                        width: 72px;
                        padding: 5px 8px;
                        border-radius: 6px;
                        font-size: 9px;
                        font-weight: 500;
                    }

                    .aw-settings-panel[data-theme="aniworld"] .aw-text-input {
                        background: #243743 !important;
                        background-color: #243743 !important;
                        font-size: 9px;
                    }

                    /* Wide text input for URLs */
                    .aw-text-input.aw-text-input-wide {
                        width: 140px;
                        font-size: 9px;
                        text-align: left;
                        padding: 4px 6px;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-text-input.aw-text-input-wide {
                        width: 150px;
                        font-size: 9px;
                    }

                    .aw-text-input:hover {
                        border-color: var(--border-light);
                    }

                    .aw-text-input:focus {
                        outline: none;
                        border-color: var(--accent-primary);
                        box-shadow: 0 0 0 2px rgba(99, 124, 249, 0.2);
                    }

                    /* ============================================
                       SELECT INPUT
                       ============================================ */
                    .aw-select-input {
                        padding: 4px 8px;
                        background: var(--bg-tertiary);
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        color: var(--text-primary);
                        font-family: inherit;
                        font-size: 11px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-select-input {
                        padding: 5px 10px;
                        border-radius: 6px;
                    }

                    .aw-select-input:hover {
                        border-color: var(--border-light);
                    }

                    .aw-select-input:focus {
                        outline: none;
                        border-color: var(--accent-primary);
                        box-shadow: 0 0 0 2px rgba(99, 124, 249, 0.2);
                    }

                    .aw-select-input option {
                        background: var(--bg-secondary);
                        color: var(--text-primary);
                    }

                    /* ============================================
                       FOOTER
                       ============================================ */
                    .aw-settings-footer {
                        padding: 8px 12px;
                        background: var(--bg-secondary);
                        border-top: 1px solid var(--border-color);
                        display: flex;
                        justify-content: flex-end;
                        align-items: center;
                        position: relative;
                        z-index: 1;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-settings-footer {
                        padding: 10px 14px;
                    }

                    .aw-footer-link {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        color: var(--text-secondary);
                        text-decoration: none;
                        font-size: 12px;
                        transition: color 0.2s ease;
                    }

                    .aw-footer-link:hover {
                        color: var(--accent-primary);
                    }

                    .aw-footer-link i {
                        font-size: 14px;
                    }

                    .aw-footer-right {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .aw-save-indicator {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        font-size: 11px;
                        font-weight: 500;
                        color: var(--accent-green);
                        opacity: 0;
                        transform: translateY(4px);
                        transition: all 0.3s ease;
                    }

                    .aw-save-indicator.visible {
                        opacity: 1;
                        transform: translateY(0);
                    }

                    .aw-version {
                        font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
                        font-size: 9px;
                        color: var(--text-muted);
                        padding: 3px 6px;
                        background: var(--bg-tertiary);
                        border-radius: 3px;
                    }

                    .aw-settings-panel[data-theme="classic"] .aw-version {
                        font-size: 9px;
                        border-radius: 4px;
                    }

                    /* ============================================
                       SCROLLBAR
                       ============================================ */
                    .aw-settings-content::-webkit-scrollbar {
                        width: 6px;
                    }

                    .aw-settings-content::-webkit-scrollbar-track {
                        background: transparent;
                    }

                    .aw-settings-content::-webkit-scrollbar-thumb {
                        background: var(--border-color);
                        border-radius: 3px;
                    }

                    .aw-settings-content::-webkit-scrollbar-thumb:hover {
                        background: var(--border-light);
                    }

                    /* ============================================
                       RESET BUTTON
                       ============================================ */
                    .aw-reset-btn {
                        width: 100%;
                        padding: 8px 12px;
                        margin-top: 10px;
                        background: var(--bg-tertiary);
                        border: 1px solid var(--border-color);
                        border-radius: 6px;
                        color: var(--text-secondary);
                        font-family: inherit;
                        font-size: 11px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }

                    .aw-reset-btn:hover {
                        background: var(--bg-hover);
                        color: var(--text-primary);
                        border-color: var(--border-light);
                    }

                `);

            // Create the panel structure
            const overlay = document.createElement('div');
            overlay.className = 'aw-settings-overlay';

            const panel = document.createElement('div');
            panel.className = 'aw-settings-panel';
            panel.setAttribute('data-theme', savedTheme);

            // Helper function to show save indicator
            const showSaveIndicator = () => {
                const indicator = panel.querySelector('.aw-save-indicator');
                if (indicator) {
                    indicator.classList.add('visible');
                    setTimeout(() => indicator.classList.remove('visible'), 2000);
                }
            };

            // Helper to create toggle
            const createToggle = (id, checked, onChange) => {
                const label = document.createElement('label');
                label.className = 'aw-toggle';
                label.innerHTML = `
                        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                        <span class="aw-toggle-track"></span>
                    `;
                const input = label.querySelector('input');
                input.addEventListener('change', (e) => {
                    onChange(e.target.checked);
                    showSaveIndicator();
                    this.messenger.sendMessage(IframeMessenger.messages.UPDATE_CORE_SETTINGS);
                });
                return label;
            };

            // Helper to create number input
            const createNumberInput = (id, value, min, max, step, onChange) => {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'aw-number-input';
                input.id = id;
                input.value = value;
                input.min = min;
                input.max = max;
                input.step = step;
                input.addEventListener('change', (e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                        onChange(val, e.target);
                        showSaveIndicator();
                        this.messenger.sendMessage(IframeMessenger.messages.UPDATE_CORE_SETTINGS);
                    }
                });
                // Stop events from leaking to player
                input.addEventListener('keydown', e => e.stopPropagation());
                input.addEventListener('keyup', e => e.stopPropagation());
                input.addEventListener('keypress', e => e.stopPropagation());
                return input;
            };

            // Helper to create text input
            const createTextInput = (id, value, onChange, wide = false) => {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'aw-text-input' + (wide ? ' aw-text-input-wide' : '');
                input.id = id;
                input.value = value;
                input.addEventListener('change', (e) => {
                    onChange(e.target.value.trim());
                    showSaveIndicator();
                    this.messenger.sendMessage(IframeMessenger.messages.UPDATE_CORE_SETTINGS);
                });
                // Stop events from leaking to player
                input.addEventListener('keydown', e => e.stopPropagation());
                input.addEventListener('keyup', e => e.stopPropagation());
                input.addEventListener('keypress', e => e.stopPropagation());
                return input;
            };

            // Helper to create select input
            const createSelectInput = (id, value, options, onChange) => {
                const select = document.createElement('select');
                select.className = 'aw-select-input';
                select.id = id;
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    if (opt.value === value) option.selected = true;
                    select.appendChild(option);
                });
                select.addEventListener('change', (e) => {
                    onChange(e.target.value);
                    showSaveIndicator();
                    this.messenger.sendMessage(IframeMessenger.messages.UPDATE_CORE_SETTINGS);
                });
                return select;
            };

            // Helper to create setting row
            const createSettingRow = (label, description, control) => {
                const row = document.createElement('div');
                row.className = 'aw-setting-row';
                row.innerHTML = `
                        <div class="aw-setting-info">
                            <div class="aw-setting-label">${label}</div>
                            <div class="aw-setting-description">${description}</div>
                        </div>
                    `;
                row.appendChild(control);
                return row;
            };

            // Helper to create section
            const createSection = (icon, title, sectionId = null) => {
                const section = document.createElement('div');
                section.className = 'aw-section';
                if (sectionId) section.dataset.sectionId = sectionId;
                section.innerHTML = `
                        <div class="aw-section-header">
                            <i class="fas fa-${icon}"></i>
                            <div class="aw-section-icon"><i class="fas fa-${icon}"></i></div>
                            <div class="aw-section-title">${title}</div>
                        </div>
                    `;
                const card = document.createElement('div');
                card.className = 'aw-settings-card';
                section.appendChild(card);
                return { section, card };
            };

            // Build the panel HTML
            panel.innerHTML = `
                    <div class="aw-settings-header">
                        <div class="aw-header-text">
                            <h1>AniScriptLight</h1>
                            <div class="aw-tagline">${i18n.autoplayEnabled.replace('Autoplay', 'Skip intros & outros')}</div>
                        </div>
                        <button class="aw-close-btn" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="aw-tabs">
                        <button class="aw-tab active" data-tab="preferences">${i18n.preferences}</button>
                        <button class="aw-tab" data-tab="advanced">${i18n.advanced}</button>
                    </div>

                    <div class="aw-settings-content">
                        <div class="aw-tab-content active" id="aw-tab-preferences"></div>
                        <div class="aw-tab-content" id="aw-tab-advanced"></div>
                    </div>

                    <div class="aw-settings-footer">
                        <div class="aw-footer-right">
                            <span class="aw-save-indicator">
                                <i class="fas fa-check"></i>
                                Saved
                            </span>
                            <span class="aw-version">v${GM_info.script.version}</span>
                        </div>
                    </div>
                `;

            // Tab switching logic
            panel.querySelectorAll('.aw-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    panel.querySelectorAll('.aw-tab').forEach(t => t.classList.remove('active'));
                    panel.querySelectorAll('.aw-tab-content').forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    panel.querySelector(`#aw-tab-${tab.dataset.tab}`).classList.add('active');
                });
            });

            // Close button
            panel.querySelector('.aw-close-btn').addEventListener('click', () => {
                panel.classList.remove('active');
                overlay.classList.remove('active');
            });

            // Close on overlay click
            overlay.addEventListener('click', () => {
                panel.classList.remove('active');
                overlay.classList.remove('active');
            });

            // ============================================
            // PREFERENCES TAB
            // ============================================
            const preferencesTab = panel.querySelector('#aw-tab-preferences');
            const advancedTab = panel.querySelector('#aw-tab-advanced');

            // Skip Settings Section
            const { section: skipSettingsSection, card: skipSettingsCard } = createSection('clock', 'Skip Settings', 'skip');
            skipSettingsCard.appendChild(createSettingRow(
                i18n.introSkipSize,
                i18n.introSkipSizeTooltip,
                createNumberInput('currentLargeSkipSizeS', coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS], 0, 300, 1, (v) => {
                    coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS] = v;
                })
            ));
            skipSettingsCard.appendChild(createSettingRow(
                i18n.outroSkipThreshold,
                i18n.outroSkipThresholdTooltip,
                createNumberInput('currentOutroSkipThresholdS', coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS], 1, 300, 1, (v, inputEl) => {
                    // Enforce minimum of 1
                    if (v < 1) {
                        v = 1;
                        if (inputEl) inputEl.value = v;
                    }
                    coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS] = v;
                })
            ));
            advancedTab.appendChild(skipSettingsSection);

            // Auto Skip Section
            const { section: autoSkipSection, card: autoSkipCard } = createSection('forward', 'Auto Skip', 'autoSkip');
            autoSkipCard.appendChild(createSettingRow(
                i18n.autoSkipAtStart,
                i18n.autoSkipAtStartTooltip,
                createToggle('shouldAutoSkipOnStart', coreSettings[CORE_SETTINGS_MAP.shouldAutoSkipOnStart], (v) => {
                    coreSettings[CORE_SETTINGS_MAP.shouldAutoSkipOnStart] = v;
                })
            ));
            advancedTab.appendChild(autoSkipSection);

            // Playback Section
            const { section: playbackSection, card: playbackCard } = createSection('play', 'Playback', 'playback');
            playbackCard.appendChild(createSettingRow(
                i18n.persistentMutedAutoplay,
                i18n.persistentMutedAutoplayTooltip,
                createToggle('shouldAutoplayMuted', mainSettings[MAIN_SETTINGS_MAP.shouldAutoplayMuted], (v) => {
                    mainSettings[MAIN_SETTINGS_MAP.shouldAutoplayMuted] = v;
                })
            ));
            advancedTab.appendChild(playbackSection);

            // Appearance Section - Enhanced Theme System
            const { section: appearanceSection, card: appearanceCard } = createSection('paint-brush', 'Appearance', 'appearance');

            // Build theme options from all available themes
            const allThemesOptions = Object.entries(getAllThemes()).map(([id, theme]) => ({
                value: id,
                label: theme.name + (theme.builtIn ? '' : ' ⭐')
            }));

            // Theme dropdown row
            const themeRow = createSettingRow(
                'UI Theme',
                'Choose from built-in or custom themes',
                createSelectInput('uiTheme', savedTheme, allThemesOptions, (value) => {
                    GM_setValue('uiTheme', value);
                    panel.setAttribute('data-theme', value);
                    // Refresh custom theme CSS to ensure all styles are applied
                    applyCustomThemeCSS();
                    applyNotiflixTheme();
                })
            );
            appearanceCard.appendChild(themeRow);

            advancedTab.appendChild(appearanceSection);

            // Defaults Section (moved from Advanced)
            const { section: defaultsSection, card: defaultsCard } = createSection('sliders-h', 'Defaults', 'defaults');
            defaultsCard.appendChild(createSettingRow(
                i18n.defaultIntroSkipSize,
                i18n.defaultIntroSkipSizeTooltip,
                createNumberInput('defaultLargeSkipSizeS', advancedSettings[ADVANCED_SETTINGS_MAP.defaultLargeSkipSizeS], 0, 300, 1, (v) => {
                    advancedSettings[ADVANCED_SETTINGS_MAP.defaultLargeSkipSizeS] = v;
                })
            ));
            defaultsCard.appendChild(createSettingRow(
                i18n.defaultOutroSkipThreshold,
                i18n.defaultOutroSkipThresholdTooltip,
                createNumberInput('defaultOutroSkipThresholdS', advancedSettings[ADVANCED_SETTINGS_MAP.defaultOutroSkipThresholdS], 1, 300, 1, (v, inputEl) => {
                    // Enforce minimum of 1
                    if (v < 1) {
                        v = 1;
                        if (inputEl) inputEl.value = v;
                    }
                    advancedSettings[ADVANCED_SETTINGS_MAP.defaultOutroSkipThresholdS] = v;
                })
            ));
            defaultsCard.appendChild(createSettingRow(
                i18n.fastForwardSize,
                i18n.fastForwardSizeTooltip,
                createNumberInput('fastForwardSizeS', advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS], 0, 60, 1, (v) => {
                    advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS] = v;
                })
            ));
            advancedTab.appendChild(defaultsSection);

            // ============================================
            // ADVANCED TAB
            // ============================================

            // Hotkeys Section
            const { section: hotkeysSection, card: hotkeysCard } = createSection('keyboard', i18n.hotkeys, 'hotkeys');
            hotkeysCard.appendChild(createSettingRow(
                i18n.fastBackward,
                i18n.fastBackwardTooltip,
                createTextInput('fastBackward', hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastBackward], (v) => {
                    hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastBackward] = v.toLowerCase();
                })
            ));
            hotkeysCard.appendChild(createSettingRow(
                i18n.fastForward,
                i18n.fastForwardTooltip,
                createTextInput('fastForward', hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastForward], (v) => {
                    hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastForward] = v.toLowerCase();
                })
            ));
            hotkeysCard.appendChild(createSettingRow(
                i18n.largeSkip,
                i18n.largeSkipTooltip,
                createTextInput('largeSkip', hotkeysSettings[HOTKEYS_SETTINGS_MAP.largeSkip], (v) => {
                    hotkeysSettings[HOTKEYS_SETTINGS_MAP.largeSkip] = v.toLowerCase();
                })
            ));
            hotkeysCard.appendChild(createSettingRow(
                i18n.prevEpisode,
                i18n.prevEpisodeTooltip,
                createTextInput('prevEpisode', hotkeysSettings[HOTKEYS_SETTINGS_MAP.prevEpisode], (v) => {
                    hotkeysSettings[HOTKEYS_SETTINGS_MAP.prevEpisode] = v.toLowerCase();
                })
            ));
            hotkeysCard.appendChild(createSettingRow(
                i18n.nextEpisode,
                i18n.nextEpisodeTooltip,
                createTextInput('nextEpisode', hotkeysSettings[HOTKEYS_SETTINGS_MAP.nextEpisode], (v) => {
                    hotkeysSettings[HOTKEYS_SETTINGS_MAP.nextEpisode] = v.toLowerCase();
                })
            ));
            hotkeysCard.appendChild(createSettingRow(
                i18n.cancelAutoplay,
                i18n.cancelAutoplayTooltip,
                createTextInput('cancelAutoplay', hotkeysSettings[HOTKEYS_SETTINGS_MAP.cancelAutoplay], (v) => {
                    hotkeysSettings[HOTKEYS_SETTINGS_MAP.cancelAutoplay] = v.toLowerCase();
                })
            ));

            // Hotkeys Guide Button
            const hotkeysGuideBtn = document.createElement('button');
            hotkeysGuideBtn.className = 'aw-reset-btn';
            hotkeysGuideBtn.textContent = i18n.hotkeysGuide;
            hotkeysGuideBtn.addEventListener('click', () => {
                this.messenger.sendMessage(IframeMessenger.messages.OPEN_HOTKEYS_GUIDE);
            });
            hotkeysSection.appendChild(hotkeysGuideBtn);

            preferencesTab.appendChild(hotkeysSection);

            // Skip Durations Section
            const { section: skipDurationsSection, card: skipDurationsCard } = createSection('fast-forward', 'Skip Key Durations (X / C / V / B)', 'skipDurations');
            const skipDurationsNote = document.createElement('div');
            skipDurationsNote.className = 'aw-setting-description';
            skipDurationsNote.style.cssText = 'padding: 4px 10px 4px 10px; color: mediumpurple;';
            skipDurationsNote.textContent = 'Hold Alt to skip backwards.';
            skipDurationsCard.appendChild(skipDurationsNote);
            skipDurationsCard.appendChild(createSettingRow(
                'X key, sec',
                'Seconds skipped by the X key',
                createNumberInput('skipX', advancedSettings[ADVANCED_SETTINGS_MAP.skipX], 1, 600, 1, (v) => {
                    advancedSettings[ADVANCED_SETTINGS_MAP.skipX] = v;
                })
            ));
            skipDurationsCard.appendChild(createSettingRow(
                'C key, sec',
                'Seconds skipped by the C key',
                createNumberInput('skipC', advancedSettings[ADVANCED_SETTINGS_MAP.skipC], 1, 600, 1, (v) => {
                    advancedSettings[ADVANCED_SETTINGS_MAP.skipC] = v;
                })
            ));
            skipDurationsCard.appendChild(createSettingRow(
                'V key, sec',
                'Seconds skipped by the V key',
                createNumberInput('skipV', advancedSettings[ADVANCED_SETTINGS_MAP.skipV], 1, 600, 1, (v) => {
                    advancedSettings[ADVANCED_SETTINGS_MAP.skipV] = v;
                })
            ));
            skipDurationsCard.appendChild(createSettingRow(
                'B key, sec',
                'Seconds skipped by the B key',
                createNumberInput('skipB', advancedSettings[ADVANCED_SETTINGS_MAP.skipB], 1, 600, 1, (v) => {
                    advancedSettings[ADVANCED_SETTINGS_MAP.skipB] = v;
                })
            ));
            preferencesTab.appendChild(skipDurationsSection);

            // Timing Section
            const { section: timingSection, card: timingCard } = createSection('clock', 'Timing', 'timing');
            timingCard.appendChild(createSettingRow(
                i18n.introSkipCooldown,
                i18n.introSkipCooldownTooltip,
                createNumberInput('largeSkipCooldownMs', advancedSettings[ADVANCED_SETTINGS_MAP.largeSkipCooldownMs], 0, 2000, 10, (v) => {
                    advancedSettings[ADVANCED_SETTINGS_MAP.largeSkipCooldownMs] = v;
                })
            ));
            advancedTab.appendChild(timingSection);

            // Behavior Section
            const { section: behaviorSection, card: behaviorCard } = createSection('cog', 'Behavior', 'behavior');
            behaviorCard.appendChild(createSettingRow(
                i18n.highlightVisitedEpisodes,
                i18n.highlightVisitedEpisodesTooltip,
                createToggle('highlightVisitedEpisodes', mainSettings[MAIN_SETTINGS_MAP.highlightVisitedEpisodes], (v) => {
                    mainSettings[MAIN_SETTINGS_MAP.highlightVisitedEpisodes] = v;
                })
            ));
            (() => {
                const colorInput = document.createElement('input');
                colorInput.type = 'color';
                colorInput.value = mainSettings[MAIN_SETTINGS_MAP.visitedEpisodeColor];
                colorInput.style.cssText = 'width:36px;height:28px;border-radius:4px;border:1px solid var(--border-color);background:var(--bg-tertiary);cursor:pointer;padding:2px;';
                colorInput.addEventListener('change', (e) => {
                    mainSettings[MAIN_SETTINGS_MAP.visitedEpisodeColor] = e.target.value;
                    showSaveIndicator();
                    this.messenger.sendMessage(IframeMessenger.messages.UPDATE_CORE_SETTINGS);
                });
                behaviorCard.appendChild(createSettingRow(
                    i18n.visitedEpisodeColor,
                    i18n.visitedEpisodeColorTooltip,
                    colorInput
                ));
            })();
            behaviorCard.appendChild(createSettingRow(
                i18n.playOnIntroSkip,
                i18n.playOnIntroSkipTooltip,
                createToggle('playOnLargeSkip', advancedSettings[ADVANCED_SETTINGS_MAP.playOnLargeSkip], (v) => {
                    advancedSettings[ADVANCED_SETTINGS_MAP.playOnLargeSkip] = v;
                })
            ));
            advancedTab.appendChild(behaviorSection);

            // Network Section
            const { section: networkSection, card: networkCard } = createSection('network-wired', 'Network', 'network');
            networkCard.appendChild(createSettingRow(
                i18n.corsProxy,
                i18n.corsProxyTooltip,
                createTextInput('corsProxy', advancedSettings[ADVANCED_SETTINGS_MAP.corsProxy], (v) => {
                    advancedSettings[ADVANCED_SETTINGS_MAP.corsProxy] = v;
                }, true)  // wide = true for URL input
            ));
            networkCard.appendChild(createSettingRow(
                i18n.commlinkPollingInterval,
                i18n.commlinkPollingIntervalTooltip,
                createNumberInput('commlinkPollingIntervalMs', advancedSettings[ADVANCED_SETTINGS_MAP.commlinkPollingIntervalMs], 10, 500, 10, (v) => {
                    advancedSettings[ADVANCED_SETTINGS_MAP.commlinkPollingIntervalMs] = v;
                })
            ));
            advancedTab.appendChild(networkSection);

            // Reset Button
            const resetBtn = document.createElement('button');
            resetBtn.className = 'aw-reset-btn';
            resetBtn.innerHTML = '<i class="fas fa-undo"></i> ' + i18n.resetToDefaults;
            resetBtn.addEventListener('click', () => {
                advancedSettings.update(ADVANCED_SETTINGS_DEFAULTS);
                hotkeysSettings.update(HOTKEYS_SETTINGS_DEFAULTS);
                mainSettings.update(MAIN_SETTINGS_DEFAULTS);
                // Refresh panel values
                panel.querySelectorAll('input[type="checkbox"]').forEach(input => {
                    const key = input.id;
                    if (ADVANCED_SETTINGS_MAP[key]) input.checked = ADVANCED_SETTINGS_DEFAULTS[key];
                    if (MAIN_SETTINGS_MAP[key]) input.checked = MAIN_SETTINGS_DEFAULTS[key];
                    if (CORE_SETTINGS_MAP[key]) input.checked = CORE_SETTINGS_DEFAULTS[key];
                });
                panel.querySelectorAll('input[type="number"]').forEach(input => {
                    const key = input.id;
                    if (ADVANCED_SETTINGS_DEFAULTS[key] !== undefined) input.value = ADVANCED_SETTINGS_DEFAULTS[key];
                    if (CORE_SETTINGS_DEFAULTS[key] !== undefined) input.value = CORE_SETTINGS_DEFAULTS[key];
                });
                panel.querySelectorAll('input[type="text"]').forEach(input => {
                    const key = input.id;
                    if (HOTKEYS_SETTINGS_DEFAULTS[key]) input.value = HOTKEYS_SETTINGS_DEFAULTS[key];
                    if (ADVANCED_SETTINGS_DEFAULTS[key] !== undefined) input.value = ADVANCED_SETTINGS_DEFAULTS[key];
                });
                showSaveIndicator();
            });
            advancedTab.appendChild(resetBtn);

            // Append to DOM
            document.body.appendChild(overlay);
            document.body.appendChild(panel);

            // Create a pane-like interface for compatibility
            const paneInterface = {
                hidden: true,
                element: panel,
                refresh: () => {
                    // Refresh all input values from settings
                    panel.querySelectorAll('input[type="checkbox"]').forEach(input => {
                        const key = input.id;
                        if (coreSettings[key] !== undefined) input.checked = coreSettings[key];
                        if (mainSettings[key] !== undefined) input.checked = mainSettings[key];
                        if (advancedSettings[key] !== undefined) input.checked = advancedSettings[key];
                    });
                    panel.querySelectorAll('input[type="number"]').forEach(input => {
                        const key = input.id;
                        if (coreSettings[key] !== undefined) input.value = coreSettings[key];
                        if (advancedSettings[key] !== undefined) input.value = advancedSettings[key];
                    });
                    panel.querySelectorAll('input[type="text"]').forEach(input => {
                        const key = input.id;
                        if (hotkeysSettings[key] !== undefined) input.value = hotkeysSettings[key];
                        if (advancedSettings[key] !== undefined) input.value = advancedSettings[key];
                    });
                },
                dispose: () => {
                    panel.remove();
                    overlay.remove();
                }
            };

            // Define hidden property getter/setter
            Object.defineProperty(paneInterface, 'hidden', {
                get: () => !panel.classList.contains('active'),
                set: (value) => {
                    if (value) {
                        panel.classList.remove('active');
                        overlay.classList.remove('active');
                    } else {
                        panel.classList.add('active');
                        overlay.classList.add('active');
                    }
                }
            });

            return paneInterface;
        }

        async handleAutoplay(player) {
            if (!coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled]) return;
            const playTooSlowErr = 'play() was taking too long';
            let muteWasApplied = false;
            // If play fails it tries to fix it but throws the problem error anyway
            const playOrFix = async () => {
                try {
                    await Promise.race([
                        player.play(), // there is a chance this would hang forever
                        new Promise((_, reject) => {
                            setTimeout(() => reject(new Error(playTooSlowErr)), 50);
                        }),
                    ]);
                } catch (e) {
                    if (e.name === 'NotAllowedError') {
                        // Muted usually is allowed to play,
                        // and if it's not allowed, nothing could be done here
                        if (player.muted) {
                            console.error('Muted and not allowed');
                            throw e;
                        }

                        if (mainSettings[MAIN_SETTINGS_MAP.shouldAutoplayMuted] && !muteWasApplied) {
                            player.muted = true;
                            muteWasApplied = true;

                            // Restore setting altered by forced mute.
                            (async () => {
                                await waitForUserInteraction();

                                // If interaction was unmute button, try to not overtake it
                                // because it might result in mute -> unmute -> mute again.
                                // Different players require a different delay
                                await sleep(100);

                                if (player.muted) player.muted = false;
                            })();
                        }
                    }

                    throw e;
                }
            };

            const startTime = Date.now();
            let lastError = null;

            while ((Date.now() - startTime) < (10 * 1000)) {
                try {
                    await sleep(200);
                    await playOrFix();

                    return;
                } catch (e) {
                    lastError = e;
                }
            }

            throw lastError;
        }

        setupHotkeys(player) {
            keyboardJS.bind('space', () => player.paused ? player.play() : player.pause());
            if (hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastForward]) {
                keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastForward], () => {
                    if (advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS]) {
                        player.currentTime += advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS];
                    }
                });
            }

            if (hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastBackward]) {
                keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastBackward], () => {
                    if (advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS]) {
                        player.currentTime -= advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS];
                    }
                });
            }

            if (hotkeysSettings[HOTKEYS_SETTINGS_MAP.largeSkip]) {
                const cooldownTime = advancedSettings[ADVANCED_SETTINGS_MAP.largeSkipCooldownMs];
                let lastSkipTime = 0;

                keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_MAP.largeSkip], () => {
                    if (coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS]) {
                        const now = Date.now();
                        if (now - lastSkipTime < cooldownTime) return;
                        lastSkipTime = now;

                        player.currentTime += coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS];

                        const skipBtn = document.querySelector('.SkipIntroBtn');
                        if (skipBtn) {
                            skipBtn.classList.add('invisible');
                            window.__skipIntroButtonDisabled = true;
                        }

                        if (advancedSettings[ADVANCED_SETTINGS_MAP.playOnLargeSkip]) {
                            player.play();
                        }
                    }
                });
            }

            if (hotkeysSettings[HOTKEYS_SETTINGS_MAP.prevEpisode]) {
                keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_MAP.prevEpisode], (ev) => {
                    ev.preventRepeat();
                    this.messenger.sendMessage(IframeMessenger.messages.AUTOPLAY_PREV);
                });
            }

            if (hotkeysSettings[HOTKEYS_SETTINGS_MAP.nextEpisode]) {
                keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_MAP.nextEpisode], (ev) => {
                    ev.preventRepeat();
                    this.messenger.sendMessage(IframeMessenger.messages.AUTOPLAY_NEXT);
                });
            }

            const cancelAutoplayKey = hotkeysSettings[HOTKEYS_SETTINGS_MAP.cancelAutoplay] || 'backspace';
            keyboardJS.bind(cancelAutoplayKey, (ev) => {
                ev.preventRepeat();
                if (activeAutoplayCancelFn) {
                    activeAutoplayCancelFn();
                }
            });

            // ---- Fixed skip hotkeys (SKIP_CONFIG) ----
            const showSkipToast = (seconds, backward = false) => {
                Notiflix.Notify.info(backward ? `⏮ -${seconds}s` : `⏭ +${seconds}s`, {
                    timeout: 1000,
                    position: 'right-bottom',
                    closeButton: false,
                    zindex: 3222222,
                });
            };
            keyboardJS.bind('x', () => { player.currentTime += SKIP_CONFIG.skipX; showSkipToast(SKIP_CONFIG.skipX); });
            keyboardJS.bind('c', () => { player.currentTime += SKIP_CONFIG.skipC; showSkipToast(SKIP_CONFIG.skipC); });
            keyboardJS.bind('v', () => { player.currentTime += SKIP_CONFIG.skipV; showSkipToast(SKIP_CONFIG.skipV); });
            keyboardJS.bind('b', () => { player.currentTime += SKIP_CONFIG.skipB; showSkipToast(SKIP_CONFIG.skipB); });
            keyboardJS.bind('alt + x', () => { player.currentTime -= SKIP_CONFIG.skipX; showSkipToast(SKIP_CONFIG.skipX, true); });
            keyboardJS.bind('alt + c', () => { player.currentTime -= SKIP_CONFIG.skipC; showSkipToast(SKIP_CONFIG.skipC, true); });
            keyboardJS.bind('alt + v', () => { player.currentTime -= SKIP_CONFIG.skipV; showSkipToast(SKIP_CONFIG.skipV, true); });
            keyboardJS.bind('alt + b', () => { player.currentTime -= SKIP_CONFIG.skipB; showSkipToast(SKIP_CONFIG.skipB, true); });

            // ---- Mobile double-tap hotkeys (fullscreen only) ----
            // Left 30%  → Alt+X (backward skip by skipX seconds)
            // Middle 40% → no action (native player behavior)
            // Right 30% → X (forward skip by skipX seconds)
            let lastTapTime = 0;
            document.addEventListener('touchend', (e) => {
                if (!document.fullscreenElement) return;

                const now = Date.now();
                const timeDiff = now - lastTapTime;
                const touch = e.changedTouches[0];

                if (timeDiff > 50 && timeDiff < 300) {
                    // Double tap confirmed
                    const relativeX = touch.clientX / window.innerWidth;

                    if (relativeX < 0.3) {
                        // Left zone → backward skip (Alt+X equivalent)
                        player.currentTime -= SKIP_CONFIG.skipX;
                        showSkipToast(SKIP_CONFIG.skipX, true);
                        e.preventDefault();
                    } else if (relativeX > 0.7) {
                        // Right zone → forward skip (X equivalent)
                        player.currentTime += SKIP_CONFIG.skipX;
                        showSkipToast(SKIP_CONFIG.skipX, false);
                        e.preventDefault();
                    }
                    // Middle zone → no action

                    lastTapTime = 0; // reset so triple-tap doesn't re-trigger
                } else {
                    lastTapTime = now;
                }
            }, { passive: false });
        }

        setupOutroSkipHandling(player) {
            let outroHasBeenReached = false;
            setInterval(() => {
                if (outroHasBeenReached || !coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled]) return;

                const timeLeft = player.duration - player.currentTime;

                if (timeLeft <= coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS]) {
                    outroHasBeenReached = true;

                    let secondsLeft = 5;
                    let cancelled = false;

                    const countdownEl = document.createElement('div');
                    countdownEl.style.cssText = [
                        'position:fixed', 'bottom:12px', 'right:12px', 'z-index:9999999',
                        'padding:10px 16px', 'border-radius:8px',
                        'background:#1e293b', 'color:#fff', 'font-size:14px', 'font-family:inherit',
                        'box-shadow:0 4px 12px rgba(0,0,0,0.3)', 'pointer-events:none',
                    ].join(';');
                    countdownEl.textContent = `⏭ Next episode in ${secondsLeft}...`;
                    document.body.appendChild(countdownEl);

                    const cancelFn = () => {
                        cancelled = true;
                        activeAutoplayCancelFn = null;
                        clearInterval(ticker);
                        countdownEl.remove();
                        Notiflix.Notify.info('⏹ Autoplay cancelled', {
                            timeout: 1500,
                            position: getNotifyPosition(),
                            closeButton: false,
                        });
                    };
                    activeAutoplayCancelFn = cancelFn;

                    const ticker = setInterval(() => {
                        if (cancelled) { clearInterval(ticker); return; }
                        secondsLeft--;
                        if (secondsLeft <= 0) {
                            clearInterval(ticker);
                            activeAutoplayCancelFn = null;
                            countdownEl.remove();
                            if (!cancelled) {
                                this.messenger.sendMessage(IframeMessenger.messages.AUTOPLAY_NEXT);
                            }
                        } else {
                            countdownEl.textContent = `⏭ Next episode in ${secondsLeft}...`;
                        }
                    }, 1000);
                }
            }, 250);
        }
    }


    class VOEJWPIframeInterface extends IframeInterface {
        constructor(messenger) {
            super(messenger);
            waitForElement([
                'div.guestMode',
                'iframe[style*="z-index: 2147483647"]',
            ].join(', '), {
                existing: true,
            }, (ads) => ads.remove());
            (function() {
                const originalAddEventListener = EventTarget.prototype.addEventListener;

                EventTarget.prototype.addEventListener = function(type, listener, options) {
                    if (
                        // Get rid of ads
                        (['click', 'mousedown'].includes(type) && this === document) ||
                        // Intercept original hotkeys to avoid conflicts with the script hotkeys
                        (type === 'keydown' && this.matches && this.matches('div#vp'))
                    ) {
                        return;
                    }
                    return originalAddEventListener.call(this, type, listener, options);
                };
            }());
        }

        static get queries() {
            return {
                fullscreenBtn: 'div.jw-tooltip-fullscreen',
                player: 'video.jw-video',
            };
        }

        async handleAutoplay(player) {
            if (!coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled]) return;
            const playTooSlowErr = 'play() was taking too long';
            let muteWasApplied = false;
            let playBtnWasClicked = false;
            // If play fails it tries to fix it but throws the problem error anyway
            const playOrFix = async () => {
                try {
                    // VOE play() either errors immediately
                    // or never resolves until a play button click
                    await Promise.race([
                        player.play(),
                        new Promise((_, reject) => {
                            setTimeout(() => reject(new Error(playTooSlowErr)), 150);
                        }),
                    ]);
                } catch (e) {
                    if (e.message === playTooSlowErr) {
                        if (playBtnWasClicked) throw e;
                        document.querySelector('div.jw-icon-display').click();
                        playBtnWasClicked = true;
                    } else if (e.name === 'NotAllowedError') {
                        // Muted usually is allowed to play,
                        // and if it's not allowed, nothing could be done here
                        if (player.muted) {
                            console.error('Muted and not allowed');
                            throw e;
                        }

                        if (mainSettings[MAIN_SETTINGS_MAP.shouldAutoplayMuted] && !muteWasApplied) {
                            player.muted = true;
                            muteWasApplied = true;

                            // Restore setting altered by forced mute.
                            (async () => {
                                await waitForUserInteraction();

                                // If interaction was unmute button, try to not overtake it
                                // because it might result in mute -> unmute -> mute again.
                                // Different players require a different delay
                                await sleep(100);

                                if (player.muted) player.muted = false;
                            })();
                        }
                    }

                    throw e;
                }
            };

            const startTime = Date.now();
            let lastError = null;

            while ((Date.now() - startTime) < (10 * 1000)) {
                try {
                    await sleep(200);
                    await playOrFix();

                    return;
                } catch (e) {
                    lastError = e;
                }
            }

            throw lastError;
        }

        async preparePlayer(player) {
            this.handleAutoplay(player);
            this.setupHotkeys(player);
            this.setupOutroSkipHandling(player);

            let hasSkippedInitial = false;
            player.addEventListener('timeupdate', function autoStartSkip() {
                if (!hasSkippedInitial && coreSettings[CORE_SETTINGS_MAP.shouldAutoSkipOnStart]) {
                    const skipSeconds = SKIP_CONFIG.autoSkipSeconds;
                    if (player.currentTime < skipSeconds) {
                        player.currentTime = skipSeconds;
                    }
                    hasSkippedInitial = true;
                }
            });

            // Progress tracking — report to top scope every 5s while playing
            let lastProgressReport = 0;
            player.addEventListener('timeupdate', () => {
                const now = Date.now();
                if (now - lastProgressReport < 5000) return;
                if (!player.duration || isNaN(player.duration)) return;
                const progress = player.currentTime / player.duration;
                if (progress <= 0) return;
                lastProgressReport = now;
                this.messenger.sendMessage(IframeMessenger.messages.UPDATE_EPISODE_PROGRESS, {
                    progress: Math.min(progress, 1.0),
                });
            });

            // Attach autoplay button and change fullscreen button behavior...
            waitForElement(VOEJWPIframeInterface.queries.fullscreenBtn, {
                existing: true,
                onceOnly: true,
            }, (fsBtn) => {
                fsBtn = fsBtn.parentElement;

                const autoplayBtn = this.createAutoplayButton();
                const settingsPane = this.settingsPane = this.createSettingsPane();

                autoplayBtn.style.width = '44px';
                autoplayBtn.style.height = '44px';
                autoplayBtn.style.paddingTop = '3px';
                autoplayBtn.style.flex = '0 0 auto';
                autoplayBtn.style.outline = 'none';

                const prevEpBtn = document.createElement('button');
                prevEpBtn.type = 'button';
                prevEpBtn.title = 'Previous episode';
                prevEpBtn.style.cssText = 'width:44px;height:44px;padding:0;border-radius:50%;border:none;background:none !important;cursor:pointer;flex:0 0 auto;outline:none;';
                const prevEpIcon = document.createElement('span');
                prevEpIcon.textContent = '⏮';
                prevEpIcon.style.cssText = 'font-size:16px;color:#fff;transition:opacity 0.2s ease;display:inline-block;';
                prevEpBtn.appendChild(prevEpIcon);
                prevEpBtn.addEventListener('mouseenter', () => { prevEpIcon.style.opacity = '0.65'; });
                prevEpBtn.addEventListener('mouseleave', () => { prevEpIcon.style.opacity = '1'; });
                prevEpBtn.addEventListener('click', () => {
                    this.messenger.sendMessage(IframeMessenger.messages.AUTOPLAY_PREV);
                });

                const nextEpBtn = document.createElement('button');
                nextEpBtn.type = 'button';
                nextEpBtn.title = 'Next episode';
                nextEpBtn.style.cssText = 'width:44px;height:44px;padding:0;border-radius:50%;border:none;background:none !important;cursor:pointer;flex:0 0 auto;outline:none;';
                const nextEpIcon = document.createElement('span');
                nextEpIcon.textContent = '⏭';
                nextEpIcon.style.cssText = 'font-size:16px;color:#fff;transition:opacity 0.2s ease;display:inline-block;';
                nextEpBtn.appendChild(nextEpIcon);
                nextEpBtn.addEventListener('mouseenter', () => { nextEpIcon.style.opacity = '0.65'; });
                nextEpBtn.addEventListener('mouseleave', () => { nextEpIcon.style.opacity = '1'; });
                nextEpBtn.addEventListener('click', () => {
                    this.messenger.sendMessage(IframeMessenger.messages.AUTOPLAY_NEXT);
                });

                fsBtn.before(prevEpBtn);
                fsBtn.before(autoplayBtn);
                fsBtn.before(nextEpBtn);

                const toggleSettingsPane = (ev) => {
                    ev?.preventDefault();
                    ev?.stopImmediatePropagation();

                    settingsPane.hidden = !settingsPane.hidden;

                    return false;
                };
                autoplayBtn.oncontextmenu = toggleSettingsPane;
            });
        }

    }

    class TopScopeInterface {
        constructor() {
            this.commLink = null;
            this.currentIframeId = null;
            this.domainId = TOP_SCOPE_DOMAINS_IDS[location.hostname] || '';
            this.iframeSrcChangesListener = null;
            this.id = makeId();
            this.ignoreIframeSrcChangeOnce = false;
            this.isPendingConnection = false;
        }

        static get messages() {
            return {
                CURRENT_FRANCHISE_DATA: 'CURRENT_FRANCHISE_DATA',
            };
        }

        static get queries() {
            // New S.to layout detection - check all S.to domains
            const newSto = STO_DOMAINS.includes(location.hostname) && !!document.querySelector('#player-iframe');

            if (newSto) {
                // New S.to layout queries
                return {
                    animeTitle: 'h1.h2.fw-bold, .breadcrumb-item.show-name a',
                    episodeDedicatedLink: null, // Not used in new layout
                    episodeTitle: '#player-meta', // Contains data-episode-id
                    hostersPlayerContainer: '.player-wrap',
                    navLinksContainer: '#episode-nav',
                    playerIframe: '#player-iframe',
                    providerChangeBtn: '#episode-links .link-box',
                    providerName: '#episode-links .link-box', // Provider name is in data-provider-name
                    providersList: '#episode-links',
                    selectedLanguageBtn: '#episode-links .link-box.active',
                    // New S.to specific queries
                    nextEpisodeLink: 'a.btn-link[href*="episode"]',
                    seasonNav: '[data-season-pill]',
                    playerMeta: '#player-meta',
                };
            }

            // Old aniworld.to / legacy S.to layout queries
            return {
                animeTitle: 'div.hostSeriesTitle',
                episodeDedicatedLink: 'div.hosterSiteVideo a.watchEpisode',
                episodeTitle: 'div.hosterSiteTitle',
                hostersPlayerContainer: 'div.hosterSiteVideo',
                navLinksContainer: 'div#stream.hosterSiteDirectNav',
                playerIframe: 'div.inSiteWebStream iframe',
                providerChangeBtn: 'div.generateInlinePlayer',
                providerName: 'div.hosterSiteVideo > ul a > h4',
                providersList: 'div.hosterSiteVideo > ul',
                selectedLanguageBtn: 'img.selectedLanguage',
            };
        }

        // It is better not to be async
        handleIframeMessages(packet) {
            (async function() {
                try {
                    switch (packet.command) {
                        case IframeMessenger.messages.AUTOPLAY_NEXT: {
                            try {
                                await this.goToNextVideo();
                            } catch (e) {
                                console.error(e);

                                Notiflixx.notify.warning(
                                    `${GM_info.script.name}: ${i18n.autoplayError}`
                                );
                            }

                            break;
                        }

                        case IframeMessenger.messages.AUTOPLAY_PREV: {
                            try {
                                await this.goToPreviousVideo();
                            } catch (e) {
                                console.error(e);

                                Notiflixx.notify.warning(
                                    `${GM_info.script.name}: ${i18n.autoplayError}`
                                );
                            }

                            break;
                        }

                        case IframeMessenger.messages.REQUEST_CURRENT_FRANCHISE_DATA: {
                            let episodeId, releaseYear, title, slug, episodeNumber, seasonNumber;

                            // Check if we're on the new S.to layout
                            const newStoLayout = isNewStoLayout();

                            if (newStoLayout) {
                                // New S.to layout
                                const playerMeta = document.querySelector('#player-meta');
                                episodeId = playerMeta?.dataset.episodeId;
                                seasonNumber = playerMeta?.dataset.seasonNo;
                                episodeNumber = playerMeta?.dataset.episodeNo;

                                // Get title from breadcrumb or h1
                                const titleEl = document.querySelector('.breadcrumb-item.show-name a') ||
                                    document.querySelector('h1.h2.fw-bold');
                                title = titleEl?.textContent?.trim() || null;

                                // Get release year from sidebar if available
                                const yearEl = document.querySelector('.text-muted a[href*="/jahr/"]');
                                releaseYear = yearEl?.textContent?.trim() || '';

                                // Extract slug from URL (new format: /serie/slug-name/staffel-X/episode-Y)
                                slug = location.pathname.match(/^\/serie\/([^/]+)/)?.[1] || null;
                            } else {
                                // Old aniworld.to / legacy S.to layout
                                episodeId = document.querySelector(
                                    TopScopeInterface.queries.episodeTitle
                                )?.dataset?.episodeId;
                                releaseYear = document.querySelector(
                                    'div.series-title span[itemprop="startDate"]'
                                )?.innerText || '';
                                title = document.querySelector('div.series-title > h1')?.innerText || null;

                                // Extract slug, season, and episode number for AniSkip
                                slug = location.pathname.match(/^\/anime\/stream\/([^/]+)/)?.[1] || null;
                                episodeNumber = location.pathname.match(/\/episode-(\d+)\b/i)?.[1] || null;
                                seasonNumber = location.pathname.match(/\/staffel-(\d+)\b/i)?.[1] || null;
                            }

                            const currentFranchiseId = (
                                title ? `${title}${releaseYear ? `::${releaseYear}` : ''}` : null
                            );

                            this.currentVideoId = episodeId || null;

                            if (currentFranchiseId || episodeId) {
                                this.commLink.commands[
                                    TopScopeInterface.messages.CURRENT_FRANCHISE_DATA
                                    ]({
                                    currentFranchiseId,
                                    currentVideoId: episodeId || null,
                                    topScopeDomainId: this.domainId,
                                    // Add AniSkip-related data
                                    animeTitle: title || null,
                                    animeSlug: slug,
                                    episodeNumber: episodeNumber ? parseInt(episodeNumber, 10) : null,
                                    seasonNumber: seasonNumber ? parseInt(seasonNumber, 10) : null,
                                });
                            }

                            break;
                        }

                        case IframeMessenger.messages.OPEN_HOTKEYS_GUIDE: {
                            let content = [
                                '<h5>🔹 Basic hotkeys</h5>',
                                '<div><b>Single key: </b><pre>a</pre> → Triggers when <pre>a</pre> is pressed</div>',
                                '<div><b>Combo keys: </b><pre>ctrl + shift + a</pre> → Triggers when all keys are held together</div>',
                                '<h5>🔹 Sequences (pressing keys in order)</h5>',
                                '<div><b>Sequence: </b><pre>a > b</pre> → Press <pre>a</pre>, then <pre>b</pre></div>',
                                '<div><b>Chained sequence: </b><pre>ctrl + a > b</pre> → Hold <pre>ctrl</pre>, press <pre>a</pre>, release, then press <pre>b</pre></div>',
                                '<h5>🔹 Multiple options</h5>',
                                '<div><pre>a + b > c, x + y > z</pre> → Either <pre>a</pre> & <pre>b</pre> then <pre>c</pre> OR <pre>x</pre> & <pre>y</pre> then <pre>z</pre></div>',
                                '<h5>🔹 Special keys (most of them)</h5>',
                            ].join('');
                            content += [
                                'cancel', 'backspace', 'tab', 'clear', 'enter', 'shift', 'ctrl',
                                'alt', 'menu', 'pause', 'break', 'capslock', 'pageup', 'pagedown',
                                'space', 'spacebar', 'escape', 'esc', 'end', 'home', 'left', 'up',
                                'right', 'down', 'select', 'printscreen', 'execute', 'snapshot',
                                'insert', 'ins', 'delete', 'del', 'help', 'scrolllock', 'scroll',
                                'comma', ',', 'period', '.', 'openbracket', '[', 'backslash', '\\',
                                'slash', 'forwardslash', '/', 'closebracket', ']', 'apostrophe',
                                '\'', 'zero', '0', 'one', '1', 'two', '2', 'three', '3', 'four',
                                '4', 'five', '5', 'six', '6', 'seven', '7', 'eight', '8', 'nine',
                                '9', 'numzero', 'num0', 'numone', 'num1', 'numtwo', 'num2',
                                'numthree', 'num3', 'numfour', 'num4', 'numfive', 'num5', 'numsix',
                                'num6', 'numseven', 'num7', 'numeight', 'num8', 'numnine', 'num9',
                                'nummultiply', 'num*', 'numadd', 'num+', 'numenter', 'numsubtract',
                                'num-', 'numdecimal', 'num.', 'numdivide', 'num/', 'numlock', 'num',
                                'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11',
                                'f12', 'f13', 'f14', 'f15', 'f16', 'f17', 'f18', 'f19', 'f20', 'f21',
                                'f22', 'f23', 'f24', 'tilde', '~', 'exclamation', 'exclamationpoint',
                                '!', 'at', '@', 'number', '#', 'dollar', 'dollars', 'dollarsign',
                                '$', 'percent', '%', 'caret', '^', 'ampersand', 'and', '&', 'asterisk',
                                '*', 'openparen', '(', 'closeparen', ')', 'underscore', '_', 'plus',
                                '+', 'opencurlybrace', 'opencurlybracket', '{', 'closecurlybrace',
                                'closecurlybracket', '}', 'verticalbar', '|', 'colon', ':',
                                'quotationmark', '\'', 'openanglebracket', '<', 'closeanglebracket',
                                '>', 'questionmark', '?', 'semicolon', ';', 'dash', '-', 'equal',
                                'equalsign', '=',
                            ].map(s => `<pre>${s}</pre>`).join(' ');
                            const modal = document.createElement('div');

                            modal.className = 'notiflix-hotkeys-guide-modal';
                            modal.innerHTML = content;
                            Notiflixx.report.info(i18n.hotkeysGuide, modal.outerHTML, i18n.close, {
                                backOverlayClickToClose: true,
                                messageMaxLength: Infinity,
                                plainText: false,
                            });
                            break;
                        }

                        case IframeMessenger.messages.TOP_NOTIFLIX_REPORT_INFO: {
                            Notiflixx.notify.info(...packet.data.args);
                            break;
                        }

                        case IframeMessenger.messages.UPDATE_CORE_SETTINGS: {
                            coreSettings.update();
                            mainSettings.update();
                            break;
                        }

                        case IframeMessenger.messages.UPDATE_EPISODE_PROGRESS: {
                            if (!this.currentVideoId) break;
                            const { progress } = packet.data;
                            const data = getWatchProgress();
                            const episodeId = String(this.currentVideoId);
                            if (data[episodeId] >= 1.0) break;
                            data[episodeId] = progress >= WATCH_PROGRESS_THRESHOLD ? 1.0 : progress;
                            saveWatchProgress(data);
                            applyEpisodeProgress(episodeId, data[episodeId]);
                            applyAllSeasonProgress();
                            break;
                        }

                        default:
                            break;
                    }
                } catch (e) {
                    console.error(e);
                }
            }.bind(this)());
            return {
                status: `${this.constructor.name} received a message`,
            };
        }

        async init(iframe) {
            this.iframeSrcChangesListener = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.attributeName === 'src') {
                        if (this.ignoreIframeSrcChangeOnce) {
                            this.ignoreIframeSrcChangeOnce = false;

                            return;
                        }

                        this.unregisterCommlinkListener();
                        this.initCrossFrameConnection();
                    }
                }
            }).observe(iframe, {
                attributes: true
            });

            await this.initCrossFrameConnection();

            this.setupEpisodeContextMenu();
            await new Promise(resolve => setTimeout(resolve, 500));
            this.setupWatchedModal();
        }

        async initCrossFrameConnection() {
            if (this.isPendingConnection) throw new Error('Connecting already');
            this.isPendingConnection = true;

            let timeoutId;

            const iframeId = this.currentIframeId = await new Promise((resolve, reject) => {
                const valueChangeListenerId = GM_addValueChangeListener('unboundIframeId', (
                    _key,
                    _oldValue,
                    newValue,
                ) => {
                    const iframe = document.querySelector(TopScopeInterface.queries.playerIframe);

                    // Skip if top scope is a wrong one
                    if (!iframe) return;

                    GM_removeValueChangeListener(valueChangeListenerId);
                    clearTimeout(timeoutId);
                    resolve(newValue);
                });

                timeoutId = setTimeout(() => {
                    this.isPendingConnection = false;

                    GM_removeValueChangeListener(valueChangeListenerId);
                    reject(new Error('Iframe connection timeout'));
                }, 4 * 1000);
            });
            GM_setValue(iframeId, this.id);

            this.commLink = new CommLinkHandler(this.id, {
                silentMode: true,
                statusCheckInterval: advancedSettings[ADVANCED_SETTINGS_MAP.commlinkPollingIntervalMs],
            });
            this.commLink.registerSendCommand(TopScopeInterface.messages.CURRENT_FRANCHISE_DATA);

            this.commLink.registerListener(iframeId, this.handleIframeMessages.bind(this));

            this.isPendingConnection = false;
        }


        async goToNextVideo() {
            const Q = TopScopeInterface.queries;
            const newStoLayout = isNewStoLayout();

            let nextEpisodeHref = null;

            if (newStoLayout) {
                // New S.to layout - use the next episode link button
                const nextLinks = [...document.querySelectorAll('a.btn-link[href*="episode"]')];
                const nextLink = nextLinks.find(link => link.textContent.includes('→'));

                if (nextLink) {
                    nextEpisodeHref = nextLink.href;
                } else {
                    // Try to find next season's first episode
                    const seasonPills = [...document.querySelectorAll('[data-season-pill]')];
                    const currentSeasonPill = seasonPills.find(el => el.classList.contains('bg-primary'));
                    const currentIndex = seasonPills.indexOf(currentSeasonPill);

                    if (currentIndex >= 0 && currentIndex < seasonPills.length - 1) {
                        const nextSeasonHref = seasonPills[currentIndex + 1].href;
                        const nextSeasonHtml = await (await fetch(nextSeasonHref)).text();
                        const nextSeasonDom = (new DOMParser()).parseFromString(nextSeasonHtml, 'text/html');
                        const firstEpisodeLink = nextSeasonDom.querySelector('#episode-nav .nav-link');
                        if (firstEpisodeLink) {
                            nextEpisodeHref = firstEpisodeLink.href;
                        }
                    }
                }
            } else {
                // Old aniworld.to / legacy S.to layout
                const [seasonsNav, episodesNav] = document.querySelectorAll(`${Q.navLinksContainer} > ul`);
                const episodesNavLinks = [...episodesNav.querySelectorAll('a')];
                const seasonNavLinks = [...seasonsNav.querySelectorAll('a')];
                const currentEpisodeIndex = episodesNavLinks.findIndex(el => el.classList.contains('active'));
                const currentSeasonIndex = seasonNavLinks.findIndex(el => el.classList.contains('active'));

                if (currentEpisodeIndex < episodesNavLinks.length - 1) {
                    nextEpisodeHref = episodesNavLinks[currentEpisodeIndex + 1].href;
                } else if (currentSeasonIndex < seasonNavLinks.length - 1) {
                    // Do not proceed if this is a last movie
                    // so it wont hop in to a season from a movie
                    if (seasonNavLinks[currentSeasonIndex].href.endsWith('/filme')) return;
                    const nextSeasonHref = seasonNavLinks[currentSeasonIndex + 1].href;
                    const nextSeasonHtml = await (await fetch(nextSeasonHref)).text();
                    const nextSeasonDom = (new DOMParser()).parseFromString(nextSeasonHtml, 'text/html');
                    const firstEpisodeLink = nextSeasonDom.querySelector(
                        `${Q.navLinksContainer} > ul a[data-episode-id]`
                    );
                    nextEpisodeHref = firstEpisodeLink.href;
                }
            }

            // Seems like the last episode was reached
            if (!nextEpisodeHref) return;
            const nextEpisodeHtml = await (await fetch(nextEpisodeHref)).text();
            const nextEpisodeDom = (new DOMParser()).parseFromString(nextEpisodeHtml, 'text/html');

            if (newStoLayout) {
                // New S.to layout - update DOM elements
                const elementsToUpdate = [
                    '#player-meta',
                    '#episode-links',
                    '#episode-nav',
                    'h1.h2.fw-bold',
                    'h2.h4.mb-1', // Episode title
                    '.background-1.border-radius-top-1', // Top navigation bar with prev/next
                ];

                elementsToUpdate.forEach((query) => {
                    const currentElement = document.querySelector(query);
                    const newElement = nextEpisodeDom.querySelector(query);
                    if (currentElement && newElement) {
                        currentElement.outerHTML = newElement.outerHTML;
                    }
                });
            } else {
                // Old layout - Update current DOM from a next episode DOM
                ([
                    'div#wrapper > div.seriesContentBox > div.container.marginBottom > ul',
                    'div#wrapper > div.seriesContentBox > div.container.marginBottom > div.cf',
                    'div.changeLanguageBox',
                    `${Q.episodeTitle} > ul`,
                    Q.animeTitle,
                    Q.episodeTitle,
                    Q.navLinksContainer,
                    Q.providersList,
                ]).forEach((query) => {
                    const currentElement = document.querySelector(query);
                    const newElement = nextEpisodeDom.querySelector(query);

                    if (currentElement && newElement) {
                        currentElement.outerHTML = newElement.outerHTML;
                    }
                });
            }

            document.title = nextEpisodeDom.title;
            history.pushState({}, '', nextEpisodeHref);
            applyAllEpisodeProgress();
            if (this.setupWatchedModal) {
                const openBtn = document.getElementById('aw-open-watched-btn');
                if (!openBtn) this.setupWatchedModal();
            }

            try {
                if (newStoLayout) {
                    // New S.to layout - setup provider click handlers
                    this.setupNewStoProviderHandlers();

                    const allNewStoButtons = [...document.querySelectorAll('#episode-links .link-box')];
                    const nextVideoHref = allNewStoButtons[0]?.dataset.playUrl || null;

                    if (!nextVideoHref) throw new Error('Embedded providers are missing or not supported');

                    document.querySelector('#player-iframe').src = nextVideoHref;
                    console.log('[Autoplay] Successfully changed iframe src to:', nextVideoHref);
                } else {
                    // Old layout - find first available provider
                    (function repairWebsiteFeatures() {
                        document.querySelectorAll(Q.providerChangeBtn).forEach((btn) => {
                            btn.addEventListener('click', (ev) => {
                                ev.preventDefault();
                                const parent = btn.parentElement;
                                const linkTarget = parent.getAttribute('data-link-target');
                                const hosterTarget = parent.getAttribute('data-external-embed') === 'true';
                                const fakePlayer = document.querySelector('.fakePlayer');
                                const inSiteWebStream = document.querySelector('.inSiteWebStream');
                                const iframe = inSiteWebStream.querySelector('iframe');
                                if (hosterTarget) {
                                    fakePlayer.style.display = 'block';
                                    inSiteWebStream.style.display = 'inline-block';
                                    iframe.style.display = 'none';
                                } else {
                                    fakePlayer.style.display = 'none';
                                    inSiteWebStream.style.display = 'inline-block';
                                    iframe.src = linkTarget;
                                    iframe.style.display = 'inline-block';
                                }
                            });
                        });
                    }());

                    const allOldProviderButtons = [...document.querySelectorAll(TopScopeInterface.queries.providerChangeBtn)];
                    const nextVideoLink = allOldProviderButtons[0]?.firstElementChild;
                    let nextVideoHref = nextVideoLink?.href;

                    // VOE has an additional redirect page,
                    // so need to extract the video href from there first
                    // in order to keep VOE-to-VOE autoplay unmuted
                    if (nextVideoHref) {
                        const providerNameEl = nextVideoLink.querySelector(TopScopeInterface.queries.providerName);
                        if (providerNameEl?.innerText === VIDEO_PROVIDERS_MAP.VOE) {
                            const corsProxy = advancedSettings[ADVANCED_SETTINGS_MAP.corsProxy];
                            if (corsProxy) {
                                const redirectText = await (await fetch(corsProxy + nextVideoLink.href)).text();
                                const match = /location\.href = '(https:\/\/.+)';/.exec(redirectText);
                                if (match) nextVideoHref = match[1];
                            }
                        }
                    }

                    if (!nextVideoHref) throw new Error('Embedded providers are missing or not supported');

                    try {
                        document.querySelector(Q.playerIframe).src = nextVideoHref;
                        console.log('[Autoplay] Successfully changed iframe src to:', nextVideoHref);
                    } catch (iframeError) {
                        console.error('[Autoplay] Error setting iframe src:', iframeError);
                        throw iframeError;
                    }
                }
            } catch (error) {
                console.error('[Autoplay] Autoplay failed:', error);
                GM_setValue('lastAutoplayError', {
                    date: Date.now(),
                    error: error.message
                });
                // At that point, refresh should load the next episode if the website even has it.
                // The problem is it is not seamless
                console.log('[Autoplay] Reloading page due to autoplay error');

                // Exit fullscreen before reload to prevent fullscreen errors
                if (document.fullscreenElement) {
                    document.exitFullscreen().then(() => {
                        location.href = location.href;
                    }).catch(() => {
                        // If exit fullscreen fails, reload anyway
                        location.href = location.href;
                    });
                } else {
                    location.href = location.href;
                }
            }
        }

        async goToPreviousVideo() {
            const Q = TopScopeInterface.queries;
            const newStoLayout = isNewStoLayout();

            let prevEpisodeHref = null;

            if (newStoLayout) {
                const prevLinks = [...document.querySelectorAll('a.btn-link[href*="episode"]')];
                const prevLink = prevLinks.find(link => link.textContent.includes('←'));

                if (prevLink) {
                    prevEpisodeHref = prevLink.href;
                } else {
                    // Try to find previous season's last episode
                    const seasonPills = [...document.querySelectorAll('[data-season-pill]')];
                    const currentSeasonPill = seasonPills.find(el => el.classList.contains('bg-primary'));
                    const currentIndex = seasonPills.indexOf(currentSeasonPill);

                    if (currentIndex > 0) {
                        const prevSeasonHref = seasonPills[currentIndex - 1].href;
                        const prevSeasonHtml = await (await fetch(prevSeasonHref)).text();
                        const prevSeasonDom = (new DOMParser()).parseFromString(prevSeasonHtml, 'text/html');
                        const episodeLinks = [...prevSeasonDom.querySelectorAll('#episode-nav .nav-link')];
                        const lastEpisodeLink = episodeLinks[episodeLinks.length - 1];
                        if (lastEpisodeLink) {
                            prevEpisodeHref = lastEpisodeLink.href;
                        }
                    }
                }
            } else {
                // Old aniworld.to / legacy S.to layout
                const [seasonsNav, episodesNav] = document.querySelectorAll(`${Q.navLinksContainer} > ul`);
                const episodesNavLinks = [...episodesNav.querySelectorAll('a')];
                const seasonNavLinks = [...seasonsNav.querySelectorAll('a')];
                const currentEpisodeIndex = episodesNavLinks.findIndex(el => el.classList.contains('active'));
                const currentSeasonIndex = seasonNavLinks.findIndex(el => el.classList.contains('active'));

                if (currentEpisodeIndex > 0) {
                    prevEpisodeHref = episodesNavLinks[currentEpisodeIndex - 1].href;
                } else if (currentSeasonIndex > 0) {
                    const prevSeasonHref = seasonNavLinks[currentSeasonIndex - 1].href;
                    const prevSeasonHtml = await (await fetch(prevSeasonHref)).text();
                    const prevSeasonDom = (new DOMParser()).parseFromString(prevSeasonHtml, 'text/html');
                    const prevEpisodeLinks = [...prevSeasonDom.querySelectorAll(
                        `${Q.navLinksContainer} > ul a[data-episode-id]`
                    )];
                    const lastEpisodeLink = prevEpisodeLinks[prevEpisodeLinks.length - 1];
                    if (lastEpisodeLink) prevEpisodeHref = lastEpisodeLink.href;
                }
            }

            // Already at the first episode
            if (!prevEpisodeHref) return;
            const prevEpisodeHtml = await (await fetch(prevEpisodeHref)).text();
            const prevEpisodeDom = (new DOMParser()).parseFromString(prevEpisodeHtml, 'text/html');

            if (newStoLayout) {
                const elementsToUpdate = [
                    '#player-meta',
                    '#episode-links',
                    '#episode-nav',
                    'h1.h2.fw-bold',
                    'h2.h4.mb-1',
                    '.background-1.border-radius-top-1',
                ];

                elementsToUpdate.forEach((query) => {
                    const currentElement = document.querySelector(query);
                    const newElement = prevEpisodeDom.querySelector(query);
                    if (currentElement && newElement) {
                        currentElement.outerHTML = newElement.outerHTML;
                    }
                });
            } else {
                ([
                    'div#wrapper > div.seriesContentBox > div.container.marginBottom > ul',
                    'div#wrapper > div.seriesContentBox > div.container.marginBottom > div.cf',
                    'div.changeLanguageBox',
                    `${Q.episodeTitle} > ul`,
                    Q.animeTitle,
                    Q.episodeTitle,
                    Q.navLinksContainer,
                    Q.providersList,
                ]).forEach((query) => {
                    const currentElement = document.querySelector(query);
                    const newElement = prevEpisodeDom.querySelector(query);

                    if (currentElement && newElement) {
                        currentElement.outerHTML = newElement.outerHTML;
                    }
                });
            }

            document.title = prevEpisodeDom.title;
            history.pushState({}, '', prevEpisodeHref);
            applyAllEpisodeProgress();
            if (this.setupWatchedModal) {
                const openBtn = document.getElementById('aw-open-watched-btn');
                if (!openBtn) this.setupWatchedModal();
            }

            try {
                if (newStoLayout) {
                    this.setupNewStoProviderHandlers();

                    const allNewStoButtons = [...document.querySelectorAll('#episode-links .link-box')];
                    const prevVideoHref = allNewStoButtons[0]?.dataset.playUrl || null;

                    if (!prevVideoHref) throw new Error('Embedded providers are missing or not supported');

                    document.querySelector('#player-iframe').src = prevVideoHref;
                    console.log('[Autoplay] Successfully changed iframe src to:', prevVideoHref);
                } else {
                    (function repairWebsiteFeatures() {
                        document.querySelectorAll(Q.providerChangeBtn).forEach((btn) => {
                            btn.addEventListener('click', (ev) => {
                                ev.preventDefault();
                                const parent = btn.parentElement;
                                const linkTarget = parent.getAttribute('data-link-target');
                                const hosterTarget = parent.getAttribute('data-external-embed') === 'true';
                                const fakePlayer = document.querySelector('.fakePlayer');
                                const inSiteWebStream = document.querySelector('.inSiteWebStream');
                                const iframe = inSiteWebStream.querySelector('iframe');
                                if (hosterTarget) {
                                    fakePlayer.style.display = 'block';
                                    inSiteWebStream.style.display = 'inline-block';
                                    iframe.style.display = 'none';
                                } else {
                                    fakePlayer.style.display = 'none';
                                    inSiteWebStream.style.display = 'inline-block';
                                    iframe.src = linkTarget;
                                    iframe.style.display = 'inline-block';
                                }
                            });
                        });
                    }());

                    const allOldProviderButtons = [...document.querySelectorAll(TopScopeInterface.queries.providerChangeBtn)];
                    const prevVideoLink = allOldProviderButtons[0]?.firstElementChild;
                    let prevVideoHref = prevVideoLink?.href;

                    if (prevVideoHref) {
                        const providerNameEl = prevVideoLink.querySelector(TopScopeInterface.queries.providerName);
                        if (providerNameEl?.innerText === VIDEO_PROVIDERS_MAP.VOE) {
                            const corsProxy = advancedSettings[ADVANCED_SETTINGS_MAP.corsProxy];
                            if (corsProxy) {
                                const redirectText = await (await fetch(corsProxy + prevVideoLink.href)).text();
                                const match = /location\.href = '(https:\/\/.+)';/.exec(redirectText);
                                if (match) prevVideoHref = match[1];
                            }
                        }
                    }

                    if (!prevVideoHref) throw new Error('Embedded providers are missing or not supported');

                    try {
                        document.querySelector(Q.playerIframe).src = prevVideoHref;
                        console.log('[Autoplay] Successfully changed iframe src to:', prevVideoHref);
                    } catch (iframeError) {
                        console.error('[Autoplay] Error setting iframe src:', iframeError);
                        throw iframeError;
                    }
                }
            } catch (error) {
                console.error('[Autoplay] Previous video navigation failed:', error);
                GM_setValue('lastAutoplayError', {
                    date: Date.now(),
                    error: error.message
                });
                console.log('[Autoplay] Reloading page due to navigation error');

                if (document.fullscreenElement) {
                    document.exitFullscreen().then(() => {
                        location.href = location.href;
                    }).catch(() => {
                        location.href = location.href;
                    });
                } else {
                    location.href = location.href;
                }
            }
        }

        // Setup click handlers for new S.to provider buttons
        setupNewStoProviderHandlers() {
            document.querySelectorAll('#episode-links .link-box').forEach((btn) => {
                // Remove existing listeners by cloning
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);

                newBtn.addEventListener('click', (ev) => {
                    ev.preventDefault();

                    // Remove active class from all buttons
                    document.querySelectorAll('#episode-links .link-box').forEach(b => {
                        b.classList.remove('active');
                    });

                    // Add active class to clicked button
                    newBtn.classList.add('active');

                    // Update iframe src
                    const playUrl = newBtn.dataset.playUrl;
                    if (playUrl) {
                        const iframe = document.querySelector('#player-iframe');
                        if (iframe) {
                            iframe.src = playUrl;
                        }
                    }

                    // Update player meta suffix
                    const metaSuffix = document.querySelector('#player-meta-suffix');
                    if (metaSuffix) {
                        const lang = newBtn.dataset.languageLabel || '';
                        const provider = newBtn.dataset.providerName || '';
                        metaSuffix.textContent = `${lang} ${provider}`.trim();
                    }
                });
            });
        }

        setupEpisodeContextMenu() {
            const menu = document.createElement('div');
            menu.id = 'aw-episode-menu';
            menu.style.cssText = `
                display: none;
                position: fixed;
                z-index: 999999;
                background: #1a1a25;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 4px;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                min-width: 160px;
            `;
            document.body.appendChild(menu);

            let targetEpisodeId = null;

            const hideMenu = () => {
                menu.style.display = 'none';
                targetEpisodeId = null;
            };

            document.addEventListener('click', hideMenu);
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMenu(); });

            document.addEventListener('contextmenu', (e) => {
                const link = e.target.closest('a[data-episode-id]');
                if (!link) return;

                e.preventDefault();
                targetEpisodeId = link.dataset.episodeId;

                const data = getWatchProgress();
                const current = data[targetEpisodeId] || 0;
                const isWatched = current >= 1.0;

                menu.innerHTML = `
                    <div id="aw-menu-toggle" style="
                        padding: 6px 10px;
                        border-radius: 5px;
                        cursor: pointer;
                        color: #f0f0f5;
                        transition: background 0.15s ease;
                    ">${isWatched ? '✗ Als ungesehen markieren' : '✓ Als gesehen markieren'}</div>
                `;

                menu.querySelector('#aw-menu-toggle').addEventListener('mouseenter', function() {
                    this.style.background = 'rgba(255,255,255,0.06)';
                });
                menu.querySelector('#aw-menu-toggle').addEventListener('mouseleave', function() {
                    this.style.background = '';
                });
                menu.querySelector('#aw-menu-toggle').addEventListener('click', () => {
                    const data = getWatchProgress();
                    if (isWatched) {
                        delete data[targetEpisodeId];
                    } else {
                        data[targetEpisodeId] = 1.0;
                    }
                    saveWatchProgress(data);
                    applyEpisodeProgress(targetEpisodeId, data[targetEpisodeId] || 0);
                    hideMenu();
                });

                const x = Math.min(e.clientX, window.innerWidth - 180);
                const y = Math.min(e.clientY, window.innerHeight - 60);
                menu.style.left = x + 'px';
                menu.style.top = y + 'px';
                menu.style.display = 'block';
            });
        }

        setupWatchedModal() {
            // Inject styles
            const style = document.createElement('style');
            style.textContent = `
        #aw-watched-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 999998;
            backdrop-filter: blur(4px);
        }
        #aw-watched-overlay.active { display: block; }

        #aw-watched-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 420px;
            max-width: 95vw;
            max-height: 85vh;
            background: #0a0a0f;
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 16px;
            z-index: 999999;
            display: none;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            font-family: 'Space Grotesk', sans-serif;
        }
        #aw-watched-modal.active { display: flex; }

        #aw-watched-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            background: #12121a;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        #aw-watched-modal-header span {
            font-size: 13px;
            font-weight: 600;
            color: #f0f0f5;
        }
        #aw-watched-modal-close {
            width: 26px;
            height: 26px;
            border: none;
            background: #1a1a25;
            border-radius: 6px;
            color: #a0a0b8;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #aw-watched-modal-close:hover { color: #f0f0f5; }

        #aw-watched-tabs {
            display: flex;
            background: #12121a;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            overflow-x: auto;
            scrollbar-width: none;
        }
        #aw-watched-tabs::-webkit-scrollbar { display: none; }

        .aw-watched-tab {
            padding: 7px 14px;
            font-size: 11px;
            font-weight: 500;
            color: #a0a0b8;
            background: none;
            border: none;
            cursor: pointer;
            white-space: nowrap;
            position: relative;
            font-family: inherit;
            transition: color 0.15s;
        }
        .aw-watched-tab:hover { color: #f0f0f5; }
        .aw-watched-tab.active { color: rgba(147,112,219,1); }
        .aw-watched-tab.active::after {
            content: '';
            position: absolute;
            bottom: 0; left: 20%; right: 20%;
            height: 2px;
            background: rgba(147,112,219,1);
            border-radius: 2px 2px 0 0;
        }
        .aw-watched-tab.readonly {
            opacity: 0.4;
            cursor: default;
            pointer-events: none;
        }

        #aw-watched-modal-body {
            padding: 12px;
            overflow-y: auto;
            flex: 1;
        }
        #aw-watched-modal-body::-webkit-scrollbar { width: 6px; }
        #aw-watched-modal-body::-webkit-scrollbar-track { background: transparent; }
        #aw-watched-modal-body::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.06);
            border-radius: 3px;
        }

        #aw-watched-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
            gap: 6px;
        }

        .aw-watched-cell {
            aspect-ratio: 1;
            border-radius: 7px;
            border: 1px solid rgba(255,255,255,0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 600;
            color: #f0f0f5;
            cursor: pointer;
            transition: all 0.15s ease;
            position: relative;
            overflow: hidden;
            background: #12121a;
            user-select: none;
        }
        .aw-watched-cell:hover {
            border-color: rgba(255,255,255,0.2);
            transform: scale(1.05);
        }
        .aw-watched-cell .aw-cell-number {
            position: relative;
            z-index: 1;
        }
        .aw-watched-cell .aw-cell-fill {
            position: absolute;
            inset: 0;
            width: 0%;
            transition: width 0.3s ease;
        }

        #aw-watched-modal-footer {
            padding: 10px 14px;
            background: #12121a;
            border-top: 1px solid rgba(255,255,255,0.06);
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }

        #aw-reset-season-btn {
            padding: 6px 12px;
            font-size: 11px;
            font-family: inherit;
            font-weight: 500;
            background: rgba(239,68,68,0.1);
            border: 1px solid rgba(239,68,68,0.3);
            border-radius: 6px;
            color: #ef4444;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        #aw-reset-season-btn:hover {
            background: rgba(239,68,68,0.2);
            border-color: rgba(239,68,68,0.5);
        }

        #aw-open-watched-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #a0a0b8;
            font-size: 15px;
            padding: 0 4px;
            margin-left: 6px;
            vertical-align: middle;
            transition: color 0.15s;
            line-height: 1;
        }
        #aw-open-watched-btn:hover { color: #f0f0f5; }
    `;
            document.head.appendChild(style);

            // Build modal DOM
            const overlay = document.createElement('div');
            overlay.id = 'aw-watched-overlay';

            const modal = document.createElement('div');
            modal.id = 'aw-watched-modal';

            modal.innerHTML = `
        <div id="aw-watched-modal-header">
            <span>Episode Manager</span>
            <button id="aw-watched-modal-close">✕</button>
        </div>
        <div id="aw-watched-tabs"></div>
        <div id="aw-watched-modal-body">
            <div id="aw-watched-grid"></div>
        </div>
        <div id="aw-watched-modal-footer">
            <button id="aw-reset-season-btn">↺ Staffel zurücksetzen</button>
        </div>
    `;

            document.body.appendChild(overlay);
            document.body.appendChild(modal);

            const closeModal = () => {
                modal.classList.remove('active');
                overlay.classList.remove('active');
            };

            modal.querySelector('#aw-watched-modal-close').addEventListener('click', closeModal);
            overlay.addEventListener('click', closeModal);

            // Reset button with Notiflix confirm
            modal.querySelector('#aw-reset-season-btn').addEventListener('click', () => {
                Notiflix.Confirm.show(
                    'Staffel zurücksetzen',
                    'Möchtest du den Watched-Status aller Episoden dieser Staffel wirklich löschen?',
                    'Ja, zurücksetzen',
                    'Abbrechen',
                    () => {
                        const episodeLinks = [...document.querySelectorAll('a[data-episode-id]')];
                        const data = getWatchProgress();
                        episodeLinks.forEach(link => {
                            delete data[link.dataset.episodeId];
                            link.style.background = '';
                        });
                        saveWatchProgress(data);
                        applyAllSeasonProgress();
                        this.renderWatchedGrid();
                    },
                    () => {},
                    {
                        zindex: 9999999,
                        titleColor: '#ef4444',
                        okButtonBackground: '#ef4444',
                        borderRadius: '8px',
                    }
                );
            });

            // Build season tabs
            const tabsContainer = modal.querySelector('#aw-watched-tabs');
            const seasonLinks = [...document.querySelectorAll('div#stream > ul:first-child a[href*="/staffel-"], div#stream > ul:first-child a[href*="/filme"]')];
            const currentSeasonId = document.querySelector('a[data-season-id]')?.dataset.seasonId;

            seasonLinks.forEach((link) => {
                const tab = document.createElement('button');
                tab.className = 'aw-watched-tab';
                tab.textContent = link.textContent.trim();
                const isActive = link.classList.contains('active');
                if (!isActive) tab.classList.add('readonly');
                if (isActive) {
                    tab.classList.add('active');
                    tab.dataset.seasonId = currentSeasonId;
                }
                tabsContainer.appendChild(tab);
            });

            this.renderWatchedGrid = () => {
                const grid = modal.querySelector('#aw-watched-grid');
                grid.innerHTML = '';
                const data = getWatchProgress();
                const color = mainSettings[MAIN_SETTINGS_MAP.visitedEpisodeColor];
                const episodeLinks = [...document.querySelectorAll('a[data-episode-id]')];

                episodeLinks.forEach((epLink) => {
                    const episodeId = epLink.dataset.episodeId;
                    const epNum = epLink.textContent.trim();
                    const progress = data[episodeId] || 0;
                    const pct = Math.round(progress * 100);

                    const cell = document.createElement('div');
                    cell.className = 'aw-watched-cell';
                    cell.title = `Episode ${epNum} — ${pct}%`;
                    cell.innerHTML = `
                <div class="aw-cell-fill"></div>
                <span class="aw-cell-number">${epNum}</span>
            `;

                    const fill = cell.querySelector('.aw-cell-fill');
                    fill.style.background = color;
                    // Defer to allow transition
                    requestAnimationFrame(() => {
                        fill.style.width = pct + '%';
                    });

                    cell.addEventListener('click', () => {
                        const current = data[episodeId] || 0;
                        if (current >= 1.0) {
                            delete data[episodeId];
                            fill.style.width = '0%';
                            cell.title = `Episode ${epNum} — 0%`;
                            epLink.style.background = '';
                        } else {
                            data[episodeId] = 1.0;
                            fill.style.width = '100%';
                            cell.title = `Episode ${epNum} — 100%`;
                            applyEpisodeProgress(episodeId, 1.0);
                        }
                        saveWatchProgress(data);
                        applyAllSeasonProgress();
                    });

                    grid.appendChild(cell);
                });
            };

            // Open button next to "Episoden:" label
            const episodesLabel = [...document.querySelectorAll('div#stream ul li span')]
                .find(el => el.textContent.includes('Episoden'));
            if (episodesLabel) {
                const openBtn = document.createElement('button');
                openBtn.id = 'aw-open-watched-btn';
                openBtn.title = 'Episode Manager öffnen';
                openBtn.textContent = '⊞';
                openBtn.addEventListener('click', () => {
                    this.renderWatchedGrid();
                    modal.classList.add('active');
                    overlay.classList.add('active');
                });
                episodesLabel.appendChild(openBtn);
            }
        }

        unregisterCommlinkListener() {
            if (!this.currentIframeId) return;
            this.commLink.listeners = this.commLink.listeners.filter((listener) => {
                if (listener.sender === this.currentIframeId) {
                    listener.intervalObj.stop();
                    return false;
                }

                return true;
            });

            this.currentIframeId = null;
        }
    }


    // If context is top scope
    if (!isEmbedded()) {
        if (!TOP_SCOPE_DOMAINS.includes(location.hostname)) return;

        const newStoLayout = isNewStoLayout();

        // Wait for DOM
        await new Promise((resolve) => {
            if (['complete'].includes(document.readyState)) {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve, {
                    once: true
                });
            }
        });
        applyAllEpisodeProgress();
        try {
            const lastAutoplayError = GM_getValue('lastAutoplayError');
            if (lastAutoplayError && ((Date.now() - lastAutoplayError.date) <= (60 * 1000))) {
                GM_deleteValue('lastAutoplayError');
                Notiflixx.notify.warning(
                    `${GM_info.script.name}: ${i18n.lastAutoplayError}`
                );
            }
        } catch (e) {
            console.error(e);
        }

        const topScopeInterface = new TopScopeInterface();
        const iframe = document.querySelector(TopScopeInterface.queries.playerIframe);
        // Not a video page?
        if (!iframe) return;

        iframe.addEventListener('load', async () => {
            await topScopeInterface.init(iframe);
        }, {
            once: true
        });

        if (newStoLayout) {
            // New S.to layout - set up provider click handlers
            await new Promise((resolve) => {
                waitForElement('#episode-links .link-box', {
                    existing: true,
                    onceOnly: true,
                    callbackOnTimeout: true,
                    timeout: 10 * 1000,
                }, resolve);
            });
            await sleep();
            topScopeInterface.setupNewStoProviderHandlers();
        } else {
            // Old layout - Wait for the website main code to finish
            await new Promise((resolve) => {
                waitForElement(TopScopeInterface.queries.selectedLanguageBtn, {
                    existing: true,
                    onceOnly: true,
                    callbackOnTimeout: true,
                    timeout: 10 * 1000,
                }, resolve);
            });
            // Let the website handle the default provider selection
        }
    }

    // If context is iframe scope
    else {
        const isItVOEJWP = !!document.querySelector('meta[name="keywords"][content^="VOE"]');
        if (!isItVOEJWP) return;

        const iframeMessenger = new IframeMessenger();
        // Call early to get rid of ads and intercept listeners
        const iframeInterface = new VOEJWPIframeInterface(iframeMessenger);
        window.addEventListener('load', async () => {
            // Give a little bit of a time for the TopScopeInterface to prepare
            await sleep(4);
            await iframeMessenger.initCrossFrameConnection();

            waitForElement(VOEJWPIframeInterface.queries.player, {
                existing: true,
                onceOnly: true,
            }, async (player) => {
                await iframeInterface.init(player);
            });
        }, {
            once: true
        });
    }
}());

