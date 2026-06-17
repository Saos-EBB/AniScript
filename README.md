# AniScript

A ViolentMonkey userscript for [aniworld.to](https://aniworld.to), [s.to](https://s.to), and [serienstream.to](https://serienstream.to).

---

## Features

- **Autoplay** — automatically loads the next episode when the current one ends
- **Auto intro skip** — at video start (0–15s window), automatically jumps forward by the configured intro skip size
- **Outro skip threshold** — autoplay triggers X seconds before the video ends
- **Manual intro skip hotkey** — one-press jump past the intro (configurable)
- **Fast forward / rewind** — arrow keys by default, configurable
- **Quick skip keys** — `X` +15s, `C` +30s, `V` +60s, `B` +90s (hold `Alt` for backward)
- **Fullscreen hotkey** — `F` toggles fullscreen
- **Prev / next episode hotkeys** — configurable
- **Episode progress tracking** — visited episodes highlighted with a progress bar
- **Episode manager** — grid overview of watched episodes, mark/unmark per episode
- **Muted autoplay fallback** — if browser blocks autoplay, starts muted and unmutes on first interaction
- **Settings panel** — right-click the autoplay button, works in fullscreen
- **Mobile double-tap skip** — double-tap left/right zone in fullscreen to skip
- **VOE / JWPlayer support**
- **Classic and AniWorld UI themes**
- **EN / DE localization**

---

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/)
2. Install the script from [Greasyfork](#) or the raw GitHub link
3. Open any episode on aniworld.to, s.to, or serienstream.to

> Tested on **Brave** with **Violentmonkey**.

---

## Usage

| Action | How |
|--------|-----|
| Toggle autoplay | Click the **toggle button** in the player |
| Open settings | **Right-click** the toggle button |
| Fast forward / rewind | `→` / `←` |
| Fullscreen | `F` |
| Quick skip forward | `X` / `C` / `V` / `B` |
| Quick skip backward | `Alt+X` / `Alt+C` / `Alt+V` / `Alt+B` |
| Intro skip | Configurable hotkey (empty by default) |
| Prev / next episode | Configurable hotkey (empty by default) |
| Cancel autoplay countdown | `Backspace` |

---

## Settings

Right-click the autoplay toggle button to open settings.

**Preferences**
- Auto intro skip toggle
- Intro skip size, outro skip threshold, fast forward step size
- Muted autoplay fallback
- Episode highlight color
- Play on intro skip toggle
- Hotkeys (fast forward, rewind, intro skip, prev/next episode, cancel autoplay)
- Skip key durations (X / C / V / B)

**Advanced**
- UI theme (Classic / AniWorld)
- CORS proxy (for VOE-to-VOE unmuted autoplay)

> Settings marked with `*` require a page reload to take effect.

---

## Supported Sites

| Site | Status |
|------|--------|
| aniworld.to | ✅ |
| s.to | ✅ |
| serienstream.to | ✅ |

---

## License

[GPL-3.0-or-later](https://spdx.org/licenses/GPL-3.0-or-later.html)

---

## Credits

Based on [AniworldAddonV0.7](https://greasyfork.org/users/1400386) by **AniPlayer**, licensed under GPL-3.0.  
Modified and extended by [Saos-EBB](https://github.com/Saos-EBB).
