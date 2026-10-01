# Userscripts

Comfort-[ScriptCat](https://scriptcat.org/)-Userscripts für Streaming-Seiten, deren eigene UI nervt.

| Script | Seite | Kurz |
|--------|-------|------|
| [`AniScriptV1.0.0.js`](AniScriptV1.0.0.js) | aniworld.to, s.to | Autoplay, Intro-Skip, Auto-nächste-Folge, Skip-Hotkeys, Fortschritt |
| [`JoynScriptV1.0.0.js`](JoynScriptV1.0.0.js) | joyn.de | Vollbild übersteht Folgenwechsel, „Meine Serien“-Liste + Schnellsuche |
| [`RTLPlusScriptV1.0.0.js`](RTLPlusScriptV1.0.0.js) | plus.rtl.de | wie JoynScript |

---

## JoynScript & RTLPlusScript

Zwei Scripts mit identischem Kern, nur der `SITE`-Block oben ist pro Seite anders. Kein `@require`, alles Vanilla-JS.

### Features

- **Vollbild, das den Folgenwechsel übersteht.** Den normalen Vollbild-Button des Players (oder dessen `F`) einfach benutzen. Das Script leitet das Vollbild auf `<html>` um und legt den Player per CSS über den ganzen Bildschirm. Wenn der Player beim Folgenwechsel neu gebaut wird, bleibt das Vollbild an, und der Theater-Modus wird automatisch neu angewendet.
- **Theater-Modus `T`.** Player füllt dauerhaft das Fenster, auch nach Reloads. Zusammen mit `F11` ergibt das echtes Vollbild, das wirklich alles übersteht.
- **„Meine Serien“ (`/` oder `Strg+K`).** Alles, was du länger als 20 s schaust (nur Videos > 5 Min, also keine Trailer oder Werbung), landet automatisch in einer lokalen Liste: zuletzt geschaut oben, letzte Folge, Fortschrittsbalken. Tippen filtert sofort, `Enter` öffnet die letzte Folge.
  - 📌 pinnt Titel dauerhaft nach oben, ↑ sortiert die angepinnten
  - „+ Diese Seite merken“ nimmt eine Serie auf, ohne sie zu schauen
  - Kein Treffer? `Enter` / `Strg+Enter` → Seiten-Suche, oder **Google** mit `site:`, das findet oft mehr als die Seiten-Suche
  - ⚙ im Overlay: Vollbild-Umleitung an/aus, Theater dauerhaft, ★-Button, Liste leeren
- **Baum-Ansicht statt Kachel-Wand (`Alt+L`).** Die ganze Seite als Text-Baum im `git log --graph`-Stil: jede Reihe der Seite (Weiterschauen, Neu, Beliebt …) ist ein Ast, Serien klappen auf bis zu Staffel und Folge. Ganz oben hängen „★ Meine Serien“, auf einer Serienseite die Serie selbst schon aufgeklappt. ▶ markiert die zuletzt gesehene Folge, ★ = in deiner Liste, 📌 = angepinnt.
  - Öffnet sich automatisch auf Übersichts- und Suchseiten (nicht beim Abspielen, abschaltbar). `Esc` zeigt die normale Seite.
  - Komplett per Tastatur: `↑↓` wählen, `→`/`←` auf-/zuklappen, **`Leertaste`/`Enter`** klappen auf/zu bzw. spielen Folgen und Filme ab, `Shift+Enter` öffnet eine Serie direkt (aus „Meine Serien“ = weiterschauen).
  - **`+`** nimmt den Titel in „Meine Serien“ auf, nochmal `+` pinnt ihn an. **`−`** löst den Pin, nochmal `−` entfernt ihn.
  - Tippen filtert (Leertaste tippt dann ganz normal), `Strg+Enter` sucht auf der Seite.
  - Folgen werden beim Aufklappen aus der Serienseite gelesen, auch wenn die Links nur im eingebetteten JSON stehen. Lange Reihen zeigen 12 Titel, Rest hinter „… N weitere“. „mehr laden ↓“ scrollt die Seite im Hintergrund, damit sie weitere Reihen nachlädt.
- **Sidebar (★ unten links).** Derselbe Baum als breite Sidebar rechts neben der normalen Seite. Klick daneben schließt sie, außer sie ist fixiert.
- **Einstellungen im Baum (`Alt+S` oder ⚙):**
  - **Ausblenden:** Sport, News, Kinder, Reality, Doku, Talk, Shopping per Häkchen, plus eigene Stichwörter (kommagetrennt). Gilt für Reihen-Namen, Titel, Typ und URL (z. B. `/sport/…`). Die Seiten liefern pro Kachel kein echtes Genre, deshalb Stichwörter. „Meine Serien“ wird nie gefiltert.
  - **Paid ein/aus** (`Alt+P`): Joyn PLUS+ / RTL+ Premium; eingeblendet stehen sie mit `[PLUS+]` / `[Premium]` da.
  - **Hintergrund:** Schwarz, Anthrazit, Nachtblau, Glas (durchscheinend) oder eigene Farbe.
  - **Sidebar fixieren:** bleibt offen, auch nach Neuladen, die Seite rückt nach links. Im Theater-Modus automatisch ausgeblendet.

### Tasten

| Taste | Aktion |
|-------|--------|
| `/`, `Strg+K` | „Meine Serien“ öffnen/schließen |
| `Alt+L` | Baum-Ansicht (Vollbild) an/aus |
| ★-Button | Sidebar an/aus |
| im Baum: `Leertaste`/`Enter` | auf-/zuklappen, Folge/Film abspielen |
| im Baum: `+` / `−` | in Meine Serien / anpinnen · lösen / entfernen |
| im Baum: `Alt+P` / `Alt+S` | Bezahl-Titel ein/aus · Einstellungen |
| `T` | Theater-Modus an/aus |
| `Esc` | Overlay schließen / Vollbild bzw. Theater beenden |
| Player-Vollbild-Button, `F`, Doppelklick | Vollbild an/aus (wird umgeleitet) |

### Wie das Vollbild funktioniert

Der Player ruft beim Vollbild `requestFullscreen()` auf seinem Container auf. Beim Folgenwechsel ersetzt React genau diesen Container, und der Browser beendet das Vollbild. Das Script hängt sich deshalb im Seiten-Kontext in `requestFullscreen` und `exitFullscreen` ein:

- `requestFullscreen()` auf einem Element mit `<video>` → stattdessen Vollbild auf `<html>` (wird nie ersetzt) und CSS-Theater auf den Player-Wrapper.
- `exitFullscreen()` vom Player wird **ignoriert**, außer der letzte Klick war auf einem Vollbild-Bedienelement (`aria-label`/`title` mit „Vollbild“/„Fullscreen“), ein Doppelklick, oder die Taste `F`. Ein Klick auf „Nächste Folge“ wirft dich also nicht raus. `Esc` geht immer.
- Der Player-Wrapper wird nicht über Klassennamen gesucht (die ändern sich bei jedem Deploy), sondern über das größte `<video>`: Vorfahren, die ungefähr gleich groß sind, gehören zum Player.
- Macht der Folgenwechsel doch einen echten Seiten-Reload, ist das Vollbild weg (Browser-Regel, braucht eine User-Geste). Der Theater-Modus bleibt aber erhalten, und **der nächste Klick oder Tastendruck holt das Vollbild zurück**.

### Installation

1. [ScriptCat](https://scriptcat.org/) installieren
2. Script installieren (`JoynScriptV1.0.0.js` bzw. `RTLPlusScriptV1.0.0.js`)
3. joyn.de / plus.rtl.de öffnen

---

## AniScript Lite

A [ScriptCat](https://scriptcat.org/) userscript for [aniworld.to](https://aniworld.to) and [s.to](https://s.to). Comfort features for the VOE/JWPlayer video player: autoplay, intro skip, auto-next-episode, skip hotkeys, and watch-progress tracking.

> **Runs on ScriptCat only, not Tampermonkey/Violentmonkey.** Tampermonkey 5.5.0 on Brave (MV3) fails to inject into the cross-origin iframe the VOE player lives in, so none of this works there. ScriptCat injects into sub-frames correctly.
>
> Tested on **Brave** (current version, post-MV3 update) with **ScriptCat**.

---

### Features

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

### Installation

1. Install [ScriptCat](https://scriptcat.org/)
2. In the extension's browser permissions, set site access to **"On all sites"** — VOE rotates through mirror domains, so a fixed match list won't keep up
3. Install the script
4. Open any episode on aniworld.to or s.to

---

### Usage

| Action | How |
|--------|-----|
| Toggle autoplay | Click the **toggle switch** in the player controlbar |
| Open settings | **Right-click** the toggle switch |
| Fullscreen | `F` |
| Quick skip forward | `X` / `C` / `V` / `B` |
| Quick skip backward | `Alt+X` / `Alt+C` / `Alt+V` / `Alt+B` |

---

### How Fullscreen Works

`F` doesn't call the real Fullscreen API. Instead it's a CSS "theater mode": the player's container is pinned `position:fixed` over the whole viewport and the iframe is stretched to 100%. No browser fullscreen state is ever entered.

This is deliberate, not a shortcut — real fullscreen was tried first and broke smooth bingeing:

- **Real fullscreen on the iframe dies on episode switch.** Auto-next-episode swaps the iframe's `src` to the next episode (so the fullscreen survives without a full page reload). But cross-origin navigation inside an iframe silently exits any fullscreen held on it.
- **Real fullscreen on the outer container is worse.** Aniworld's player wrapper is a fixed ~410×500px box, so "fullscreen" on it just shows a stamp-sized video floating in a black screen.
- **Re-requesting fullscreen after each switch doesn't work either** — the Fullscreen API requires a user gesture, and an autoplay-triggered episode change isn't one.

CSS theater mode sidesteps all three: there's no fullscreen state for the browser to revoke, so it survives every episode change and reload automatically (the mode is remembered in settings and reapplied on page load). For real OS-level fullscreen on top of that, press `F11` — that's browser-chrome fullscreen, not tied to any element, so it also survives iframe swaps.

Settings panel and toast notifications mount onto `document.fullscreenElement` when present, falling back to `document.body` — this only matters for real `F11` fullscreen, since theater mode never sets that property.

---

### Settings

Right-click the toggle switch to open settings:

- Autoplay, intro-skip on/off
- Intro-skip target second
- Auto-next-episode on/off, outro threshold, countdown length
- Skip durations for X/C/V/B
- Reset episode watch-progress

---

### Supported Sites

| Site | Status |
|------|--------|
| aniworld.to | ✅ |
| s.to | ✅ |

---

## License

[GPL-3.0-or-later](https://spdx.org/licenses/GPL-3.0-or-later.html)

---

## Credits

AniScript Lite based on AniScript Lite 0.1.5 by [Saos-EBB](https://github.com/Saos-EBB).
