# Cursor Playground

> One canvas. Unlimited experiments.

A browser-based creative coding playground where visitors combine visual effects and physics behaviors in real-time on a shared canvas.

![Cursor Playground](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Build](https://img.shields.io/badge/Build-Passing-success)

## Features

### Core Effects
- **Particle Trails** - Particles follow the cursor with configurable size, lifetime, spread, and color modes
- **Magnetic Field** - Attract or repel particles from the cursor with adjustable radius, strength, and falloff
- **Glow Ribbon** - Smooth glowing ribbon trails following pointer movement
- **Gravity** - Configurable gravity with pointer attractor, boundary bouncing, and damping
- **Collisions** - Particle-particle and boundary collisions with spatial grid optimization
- **Drag & Throw** - Grab particles, drag them, and throw with velocity
- **Attraction Field** - Multiple force modes (attract, repel, vortex, spiral) with configurable falloff
- **Fireworks** - Click for spectacular bursts with multiple patterns (radial, spiral, heart, star, rings)
- **Explosions** - Directional and patterned particle explosions
- **Color Effects** - Global color cycling, gradients, palettes, and hue shifting
- **Distortion** - Visual distortion effects (wave, ripple, twist, bulge, pinch, chromatic aberration)
- **Liquid Motion** - Real-time fluid simulation (Navier-Stokes) with cursor-driven ink flow
- **Typography Distortion** - Text that reacts to pointer with scatter, magnetic, wave, displacement, rearrange, and explode modes

### Interface & Controls
- **Responsive Layout** - Desktop panels, mobile drawers, full-screen canvas
- **Effect Library** - Categorized effects with toggles and descriptions
- **Contextual Controls** - Sliders, toggles, color pickers, and selectors for each effect
- **Global Controls** - Master intensity, speed, particle limits, pause/resume, clear
- **Presets** - 8 curated presets (Neon Trails, Magnetic Storm, Firework Party, Gravity Well, Liquid Ink, Typography Chaos, Cosmic Dust, Calm Ambient)
- **Custom Presets** - Save, load, delete, and share custom configurations
- **Chaos Mode** - Random safe combinations of effects and parameters
- **Random Config** - Generate random but bounded configurations
- **Color Palettes** - 8 built-in palettes (Neon, Midnight, Fire, Ocean, Forest, Sunset, Pastel, Mono)

### Capture & Sharing
- **Screenshot Export** - PNG export with timestamped filenames
- **Video Recording** - WebM recording via MediaRecorder/canvas.captureStream
- **URL Sharing** - Encode configuration in URL query parameter
- **Web Share API** - Native sharing on supported devices
- **Clipboard Fallback** - Copy link to clipboard

### Audio
- **Procedural Audio** - Web Audio API generated sounds (chimes, clicks, bursts, ambient tones)
- **Audio Toggle** - Off by default, enabled by user action
- **Master Volume & Mute** - Full audio control

### Experience
- **Interactive Tutorial** - 7-step guided onboarding
- **Effect Gallery** - Browse all effects and presets with search
- **Easter Eggs** - Konami code, party mode, title clicker
- **Keyboard Shortcuts** - Full keyboard navigation
- **Multiple Themes** - Default, Midnight, Neon, Dawn, Forest

### Accessibility & Performance
- **Reduced Motion** - Respects `prefers-reduced-motion`
- **Low Power Mode** - Automatic performance scaling
- **Keyboard Navigation** - Full keyboard support with visible focus
- **Mobile Touch** - Touch-optimized controls
- **FPS Monitoring** - Rolling 60-frame average
- **Object Pooling** - Efficient particle allocation
- **Delta-time Animation** - Frame-rate independent simulation

## Quick Start

### Development
```bash
npm install
npm run dev
```
Opens at `http://localhost:3000`

### Production Build
```bash
npm run build
npm run preview
```
Builds to `dist/` for static deployment.

### Deploy to Render
1. Connect repository to Render
2. Create Static Site
3. Build Command: `npm ci && npm run build`
4. Publish Directory: `dist`
5. Add rewrite rule: `/*` → `/index.html`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Pause/Resume |
| `Escape` | Close panels |
| `R` | Random configuration |
| `C` | Clear canvas |
| `G` | Open effect gallery |
| `T` | Open tutorial |
| `F` | Toggle fullscreen |
| `Ctrl+S` | Save preset |
| `1/2/3` | Load preset 1/2/3 |

## Easter Eggs
- **Konami Code** (↑↑↓↓←→←→BA) - Unlocks Konami Chaos
- **Type "PARTY"** - Activates Party Mode
- **Click title 5x** - Title Clicker easter egg

## Architecture

```
src/
├── app/
│   ├── App.jsx              # Root component
│   ├── components/
│   │   ├── Tutorial.jsx     # Interactive onboarding
│   │   └── EffectGallery.jsx # Effect/preset browser
│   ├── layout/
│   │   ├── TopBar.jsx       # Header with controls
│   │   ├── EffectLibrary.jsx # Left panel
│   │   ├── ControlPanel.jsx  # Right panel
│   │   ├── StatusBar.jsx     # Bottom status
│   │   └── MobilePanels.jsx  # Mobile drawers
│   └── hooks/
│       ├── useLocalStorage.js
│       └── useReducedMotion.js
├── canvas/
│   ├── CanvasHost.jsx       # React canvas wrapper
│   ├── Simulation.js        # Central animation loop
│   ├── Renderer.js          # Canvas 2D rendering
│   ├── PointerManager.js    # Shared pointer tracking
│   ├── PerformanceMonitor.js # FPS/particle monitoring
│   └── objectPool.js        # Particle allocation pools
├── effects/
│   ├── registry.js          # Effect registration
│   ├── base/EffectBase.js   # Base effect class
│   ├── particles/           # ParticleTrail, MagneticField, GlowRibbon
│   ├── physics/             # Gravity, Collision, DragThrow, Attraction
│   ├── bursts/              # Fireworks, Explosions
│   ├── visual/              # ColorEffects, Distortion, LiquidMotion
│   └── typography/          # TypographyDistortion
├── audio/
│   ├── AudioManager.js      # Web Audio API wrapper
│   └── RecordingManager.js  # MediaRecorder wrapper
├── presets/
│   ├── defaults.js          # Default configurations
│   ├── curatedPresets.js    # 8 built-in presets
│   └── presetValidation.js  # Schema validation/migration
├── storage/
│   ├── settingsStorage.js   # LocalStorage for settings
│   └── presetStorage.js     # LocalStorage for presets
├── utils/
│   ├── math.js              # Math utilities
│   ├── colour.js            # Color manipulation
│   ├── dom.js               # DOM helpers
│   └── share.js             # URL encoding, easter eggs, shortcuts
└── styles/
    ├── variables.css        # CSS custom properties
    └── index.css            # Global styles
```

## Effect Contract

Each effect implements:
```javascript
{
  id, name, category, description,
  defaultConfig, config,
  initialize(context, config),
  update(deltaTime, context, config),
  render(context, config),
  onPointerDown(pointer, context, config),
  onPointerUp(pointer, context, config),
  onEnable(context, config),
  onDisable(context, config),
  onConfigChange(context, config),
  onGlobalConfigChange(context, globalConfig),
  onResize(context, config),
  clear(context),
  dispose(context),
  validateConfig(config)
}
```

## Browser Support

- Chrome 80+, Firefox 75+, Safari 14+, Edge 80+
- Canvas 2D (primary), WebGL (optional for Liquid Motion)
- Web Audio API (audio features)
- MediaRecorder (video recording)
- LocalStorage (persistence)

## Performance Notes

- Target: 60 FPS on modern desktop
- Max particles: Configurable (default 2000)
- DPR capped at 2x for HiDPI displays
- Tab visibility pauses simulation
- Spatial grid for collision detection
- Object pools prevent GC pressure

## License

MIT License - see LICENSE file for details.