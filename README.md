# AniworldAddon

A Tampermonkey userscript for [aniworld.to](https://aniworld.to), [s.to](https://s.to), and [serienstream.to](https://serienstream.to) that enhances your watching experience with autoplay, skip controls, hotkeys, and more.

---

## Features

- **Autoplay** — automatically loads the next episode when the current one ends
- **Outro skip threshold** — autoplay triggers X seconds before the video ends (configurable)
- **Auto-skip at start** — skips the first N seconds of every episode automatically
- **Intro skip** — one-press hotkey to jump past the intro (configurable skip size)
- **Fast forward / rewind hotkeys** — keyboard shortcuts for seeking
- **Fullscreen hotkey** — toggle fullscreen via keyboard
- **Highlight visited episodes** — previously opened episodes are marked in yellow
- **Muted autoplay fallback** — if the browser blocks autoplay, the video starts muted and unmutes on first interaction
- **Seamless episode navigation** — next episode loads without a full page reload
- **Settings panel** — right-click the autoplay toggle button to open the settings UI
- **VOE & Vidoza player support**
- **EN / DE localization**

---

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) for your browser
2. Click **[Install Script](#)** *(replace with your Greasyfork or raw GitHub link)*
3. Visit [aniworld.to](https://aniworld.to) or [s.to](https://s.to) and open any episode

> Tested on **Brave** with **Violentmonkey**. Other browsers and userscript managers (Tampermonkey, Greasemonkey) may work but are not tested.


---

## Usage

| Action | How |
|--------|-----|
| Toggle autoplay on/off | Click the **toggle button** in the video player |
| Open settings | **Right-click** the toggle button |
| Fast forward / rewind | `→` / `←` (default, configurable) |
| Fullscreen | `F` (default, configurable) |
| Intro skip | Configurable hotkey in settings (empty by default) |
| Quick skips | `X` = +30s, `C` = +60s, `V` = +90s, `B` = +120s |

---

## Settings

Open the settings panel by **right-clicking** the autoplay toggle button in the player.

**Preferences tab**
- Enable/disable auto-skip at start + set how many seconds to skip
- Set intro skip size and outro skip threshold
- Toggle highlighted visited episodes
- Toggle muted autoplay fallback
- Choose UI theme

**Advanced tab**
- Customize hotkeys for fast forward, rewind, fullscreen, and intro skip
- Set fast forward step size
- Configure the CORS proxy (for VOE-to-VOE unmuted autoplay)
- Adjust CommLink polling interval

> Settings marked with `*` require a page reload to take effect.

---

## Supported Sites

| Site | Layout |
|------|--------|
| aniworld.to | ✅ |
| s.to | ✅ (old + new layout) |
| serienstream.to | ✅ |

---

## Requirements

- [Violentmonkey](https://violentmonkey.github.io/) (tested on Brave)
- No additional setup needed
---
## Contributing

This is a personal userscript tailored to my own needs — no active development roadmap.

That said, feel free to:

- 🐛 [Open an issue](https://github.com/Saos-EBB/AniScript/issues) if you find a bug
- 💡 [Start a discussion](https://github.com/Saos-EBB/AniScript/discussions) if you have a feature request or suggestion
- 🍴 Fork the repo and adapt it to your own needs (GPL-3.0)

I'll have a look when I find the time.

---

## License

[GPL-3.0-or-later](https://spdx.org/licenses/GPL-3.0-or-later.html)

## Credits

Based on [AniworldAddonV0.7](https://greasyfork.org/users/1400386) by **AniPlayer**, licensed under GPL-3.0.  
Modified and extended by [Saos-EBB](https://github.com/Saos-EBB).