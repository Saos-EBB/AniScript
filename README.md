# AniScript Lite

A [ScriptCat](https://scriptcat.org/) userscript for [aniworld.to](https://aniworld.to) and [s.to](https://s.to). Comfort features for the VOE/JWPlayer video player: autoplay, intro skip, auto-next-episode, skip hotkeys, and watch-progress tracking.

> **Runs on ScriptCat only, not Tampermonkey/Violentmonkey.** Tampermonkey 5.5.0 on Brave (MV3) fails to inject into the cross-origin iframe the VOE player lives in, so none of this works there. ScriptCat injects into sub-frames correctly.
>
> Tested on **Brave** (current version, post-MV3 update) with **ScriptCat**.

---

## Features

- **Autoplay** — automatically loads the next episode when the current one ends
- **Auto intro skip** — jumps forward to a configured second once the video starts
- **Auto next episode** — countdown starts once remaining time drops below a threshold
- **Skip hotkeys** — `X` +15s, `C` +30s, `V` +60s, `B` +90s (hold `Alt` for backward), durations configurable
- **Fullscreen hotkey** — `F` (fixed, not configurable)
- **Episode progress tracking** — watched episodes are highlighted in the episode list
- **Toggle switch** in the JWPlayer controlbar to turn autoplay on/off at a glance
- **Settings panel** — right-click the toggle switch
- **Muted autoplay fallback** for Brave's autoplay-with-sound block

---

## Installation

1. Install [ScriptCat](https://scriptcat.org/)
2. In the extension's browser permissions, set site access to **"On all sites"** — VOE rotates through mirror domains, so a fixed match list won't keep up
3. Install the script
4. Open any episode on aniworld.to or s.to

---

## Usage

| Action | How |
|--------|-----|
| Toggle autoplay | Click the **toggle switch** in the player controlbar |
| Open settings | **Right-click** the toggle switch |
| Fullscreen | `F` |
| Quick skip forward | `X` / `C` / `V` / `B` |
| Quick skip backward | `Alt+X` / `Alt+C` / `Alt+V` / `Alt+B` |

---

## Settings

Right-click the toggle switch to open settings:

- Autoplay, intro-skip on/off
- Intro-skip target second
- Auto-next-episode on/off, outro threshold, countdown length
- Skip durations for X/C/V/B
- Reset episode watch-progress

---

## Supported Sites

| Site | Status |
|------|--------|
| aniworld.to | ✅ |
| s.to | ✅ |

---

## License

[GPL-3.0-or-later](https://spdx.org/licenses/GPL-3.0-or-later.html)

---

## Credits

Based on AniScript Lite 0.1.5 by [Saos-EBB](https://github.com/Saos-EBB).
