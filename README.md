# Parking — The Geometry of Perfect Parking

An interactive motion-graphics presentation application built to explain the mathematics of parallel parking based on Simon R. Blackburn's paper, _The Geometry of Perfect Parking_ (2009). Designed for screen capture with OBS Studio and voice-over narration generated with ElevenLabs.

## Art Direction & Minimalist UI Principles

- **Monochrome Obsidian & Luminous Silver Palette**: Inspired by precision dark-mode geometric diagrams, the visual palette uses deep matte charcoal and obsidian graphite canvases (`oklch(0.19 0 0)` to `oklch(0.14 0 0)` radial vignette), smoked graphite surfaces, fine structural hairlines, and luminous silver-white focal nodes.
- **2D Wheel-Center Cut-Plane Car**: Vehicles are rendered top-down as a horizontal cross-section sliced directly through the plane of the four wheel centers. All four sectioned tires, wheel hubs, front steering knuckle angles (Ackermann geometry), and the fixed rear axle line remain visible at all times.
- **Strict Minimalism**: The interface contains only what is strictly necessary to communicate the geometric idea on screen. Avoid sidebars, decorative telemetry banners, status badges, secondary descriptions, and legend boxes. Let the spatial layout, geometry, and motion graphics do the explaining.
- **OBS-First Stage**: The presentation runs on a clean full-viewport canvas with a minimal floating playback pill that can be toggled off completely with the `H` key during screen recording.
- **WCAG AA Contrast**: All visible typography, geometric strokes, and active focal points maintain strict WCAG AA contrast against the dark graphite background.

## ElevenLabs (Eleven v4) Constraints & Best Practices

All voice-over scripts in `video-editing-script.md` follow the official ElevenLabs best practices for the **Eleven v4 (`eleven_v4`)** model:

1. **No SSML Break Tags or Bracketed Pause Tags**:
   - Eleven v4 does not support SSML `<break time="..." />` tags, nor does it use `[short pause]` or `[long pause]` tags.
   - Instead, control pauses, hesitation, and breathing room using **ellipses (`...`)**, **em-dashes (`—`)**, and **paragraph breaks**.
2. **Audio Delivery Tags**:
   - Use square-bracket audio tags supported by Eleven v4 (such as `[curious]`, `[confident]`, `[thoughtful]`, `[frustrated]`, `[sighs]`, `[whispering]`) to guide vocal tone and expression.
3. **Text Normalization for Mathematics & Measurements**:
   - Write all numbers, decimals, units, and mathematical equations in full spoken English words inside voice-over scripts (for example, write `"five point four meters"` instead of `"5.4m"`, and `"the square root of r squared minus l squared"` instead of symbolic notation) so the TTS model reads equations naturally.
4. **Pronunciation Control via IPA**:
   - When a technical term or proper noun requires exact pronunciation in Eleven v4, wrap the standard International Phonetic Alphabet transcription in forward slashes and double quotes (`"/IPA_transcription/"`) including primary (`ˈ`) and secondary (`ˌ`) stress markers.

## Keyboard Shortcuts

- `Space`: Play / Pause current slide animation
- `R`: Restart current slide from `00:00.0`
- `H`: Hide / Show the minimal playback pill for clean OBS recording
- `ArrowLeft` / `ArrowRight`: Previous / Next slide

## Library Stack

- React - https://react.dev/
- Base UI - https://base-ui.com/
- Tailwind CSS - https://tailwindcss.com/
- cn - https://github.com/shadcn-ui/cn
- Phosphor Icons - https://phosphoricons.com/
- Zustand - https://zustand.docs.pmnd.rs/
- Valibot - https://valibot.dev/
- Hono - https://hono.dev/
- Cloudflare Wrangler - https://developers.cloudflare.com/workers/wrangler/
- Vite - https://vite.dev/
- Oxlint - https://oxc.rs/docs/guide/usage/linter.html
- Oxfmt - https://oxc.rs/docs/guide/usage/formatter.html
- Vitest - https://vitest.dev/
- TypeScript - https://www.typescriptlang.org/
