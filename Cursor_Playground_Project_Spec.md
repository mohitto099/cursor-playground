# Cursor Playground — Product & Engineering Specification

**Working title:** Cursor Playground  
**Tagline:** One canvas. Unlimited experiments.  
**Product type:** Static, client-side creative coding playground  
**Primary experience:** One large interactive canvas where visitors combine visual effects and physics behaviours in real time.

---

## 1. Product vision

Cursor Playground is a browser-based creative playground. The visitor moves, clicks, drags and experiments with the pointer to influence a living visual canvas.

This is not a collection of disconnected demo pages. It is one shared canvas with independently configurable effects that can run together. A visitor might combine particle trails, magnetic attraction, gravity, fireworks and colour distortion to create an unexpected result.

The experience should feel playful, surprising, responsive and polished. It should also demonstrate thoughtful frontend engineering: modular effects, a stable rendering loop, clear state management, performance safeguards and graceful fallbacks.

### Product principles

1. **Play first:** The canvas should be interesting within seconds, without requiring a tutorial.
2. **One shared world:** Effects should interact where technically reasonable rather than feeling like unrelated pages.
3. **Combinable by design:** Visitors can enable multiple effects and adjust them independently.
4. **Fast feedback:** Controls should visibly affect the canvas immediately.
5. **Progressive complexity:** Basic interactions are obvious; advanced controls can live in expandable panels.
6. **Client-side by default:** No backend, account, database or external API is required.
7. **Performance is a feature:** Avoid freezing the browser when users enable too many effects.
8. **Respect the visitor:** Audio starts only after an explicit action; reduced-motion preferences are respected.

---

## 2. Core experience and layout

### Main screen

Use a responsive, dark creative-tool interface:

- **Top bar:** Product name/logo, preset selector, help, settings, fullscreen and sound controls.
- **Left panel:** Effect library grouped by category, with on/off toggles.
- **Center:** Large canvas occupying most of the available viewport.
- **Right panel:** Contextual controls for selected/enabled effects, global controls and preset settings.
- **Bottom status strip:** FPS, active effect count, approximate particle/object count, performance state and reset action.

On narrower screens, panels should become drawers or collapsible sheets. The canvas remains the primary focus.

### First-visit experience

- Show a brief, dismissible hint: “Move your cursor. Click. Make a mess.”
- Start with one attractive, low-cost effect enabled (particle trail).
- Provide a visible “Try a preset” affordance.
- Do not show every advanced setting at once.
- Persist whether the introductory hint was dismissed.

### Input behaviour

Support:
- Pointer movement.
- Pointer down/up and click.
- Dragging.
- Pointer velocity and direction.
- Touch input where practical.
- Keyboard shortcuts for important actions.

Handle pointer leaving the canvas, window blur, resize, device-pixel-ratio changes and touch cancellation safely.

---

## 3. Complete feature inventory

The following is the complete candidate scope. Do not silently discard features. Implement them in phases, and record any feature that is deferred or technically reduced.

### A. Cursor and particle effects

1. **Particle Trails**
   - Particles follow the pointer.
   - Configurable particle count, size, lifetime, speed, spread and opacity.
   - Multiple trail shapes or emission styles.
   - Fade and decay naturally.

2. **Magnetic Field**
   - Particles or eligible objects are attracted to or repelled from the pointer.
   - Configurable radius, strength and falloff.
   - Optional toggle between attraction and repulsion.

3. **Cursor Force Field**
   - Pointer creates a local force field affecting particles and physics objects.
   - Configurable force direction and strength.

4. **Glow and Ribbon Trails**
   - Smooth glowing lines or ribbons follow pointer movement.
   - Configurable width, colour, fade and smoothing.

### B. Physics behaviours

5. **Gravity Playground**
   - Objects respond to gravity.
   - Pointer can attract, repel, grab or throw objects.
   - Configurable gravity strength and direction.

6. **Collisions and Bouncing**
   - Particles/objects collide with canvas boundaries and, where feasible, one another.
   - Configurable bounce and damping.
   - Use simplified physics if full collision detection is too expensive.

7. **Drag and Throw**
   - Visitors can grab objects, move them and release them with pointer velocity.
   - Support object interaction without breaking other active effects.

8. **Attraction and Repulsion**
   - Multiple force modes and configurable influence radius.
   - Avoid unstable acceleration and runaway velocities.

### C. Click and visual effects

9. **Fireworks**
   - Click/tap to create bursts.
   - Several burst patterns.
   - Configurable particle count, speed, colour and lifetime.

10. **Particle Explosions**
    - Click or trigger events to create radial, directional or patterned bursts.

11. **Colour Effects**
    - Colour cycling, gradients, palettes, hue shifts and optional random colour modes.
    - Allow a visitor-defined palette.

12. **Distortion**
    - Visual distortion of eligible canvas elements.
    - Keep expensive shader-based effects optional and capability-gated.

13. **Liquid Motion**
    - Cursor movement produces flowing, ink-like visual trails.
    - Treat this as an advanced effect. Prefer an efficient implementation and provide a simpler fallback if WebGL is unavailable.

### D. Typography experiment

14. **Typography Distortion**
    - A configurable text phrase is displayed in the canvas.
    - Letters react to pointer proximity.
    - Modes can include scatter, displacement, wave, magnetic attraction and rearrangement.
    - Allow visitors to enter a short custom phrase.
    - Sanitize and constrain user text; do not treat it as HTML.

### E. Combined effects

15. **Effect stacking**
    - Multiple effects can run simultaneously.
    - Each effect has a clear enabled/disabled state.
    - Shared pointer data and the common simulation world are reused.
    - Effects must not register duplicate global listeners or start independent animation loops.

16. **Effect interaction rules**
    - Define how effects influence shared particles/objects.
    - For example: trails emit particles; gravity moves them; magnetic fields alter their velocity; colour effects change their appearance.
    - Not every effect must interact with every other effect. Document intentional limitations.

17. **Chaos Mode**
    - Randomly selects a safe, supported combination of effects and parameter values.
    - Avoid combinations known to overload the device.
    - Provide “New chaos”, “Freeze”, and “Clear” actions.
    - Make it possible to inspect which effects and values are active.

### F. Controls and customization

18. **Contextual effect controls**
    - Show relevant controls for the selected effect.
    - Use sliders, toggles, colour inputs and simple selectors.
    - Display current values and sensible ranges.
    - Changes should take effect immediately.

19. **Global controls**
    - Master intensity.
    - Global speed.
    - Particle/object limit.
    - Clear canvas.
    - Pause/resume simulation.
    - Reset current configuration.

20. **Colour picker**
    - Support individual effect colours and shared palettes.
    - Include a small set of attractive built-in palettes.
    - Ensure controls remain usable with keyboard and screen readers.

21. **Random mode**
    - Generate random but bounded configurations.
    - Avoid invalid values and known expensive combinations.
    - Allow a visitor to regenerate a configuration.

22. **Presets**
    - Ship with curated presets such as:
      - Neon Trails
      - Magnetic Storm
      - Firework Party
      - Gravity Well
      - Liquid Ink
      - Typography Chaos
      - Cosmic Dust
      - Calm Ambient
    - Presets should be data/configuration, not hard-coded UI branches.

23. **Save and load presets**
    - Save a named configuration in localStorage.
    - Load, rename and delete locally saved presets.
    - Validate saved data and handle malformed or old versions safely.
    - Do not imply that presets sync between devices.

24. **Undo/reset**
    - Provide a clear/reset action for the canvas.
    - Provide reset-to-default for settings.
    - If full undo history is too complex, explicitly scope undo to configuration changes or defer it.

### G. Capture and sharing

25. **Screenshot**
    - Export the canvas as PNG where supported.
    - Give the exported file a useful name.
    - Handle unsupported canvas export gracefully.

26. **Recording mode**
    - Record a short canvas session using MediaRecorder/canvas captureStream where supported.
    - Require an explicit user action.
    - Show recording state and elapsed time.
    - Provide stop and download actions.
    - Handle unsupported browsers and resource cleanup.
    - Treat this as a later-phase feature.

27. **Shareable configuration**
    - Optional: encode a validated, compact configuration in the URL query/hash.
    - Do not include personal information.
    - Validate all imported values and enforce size limits.

### H. Sound

28. **Procedural audio**
    - Use Web Audio API for optional generated sounds.
    - Possible sounds: soft particle chimes, click bursts, ambient tones and interaction feedback.
    - Audio is off by default until the visitor enables it.
    - Provide master volume and mute.
    - Avoid continuous loud or distracting audio.
    - Stop/dispose audio nodes when no longer needed.

### I. Experience and discovery

29. **Fullscreen**
    - Use the Fullscreen API when available.
    - Provide a clear exit path and fallback.

30. **Interactive tutorial**
    - Short, skippable onboarding.
    - Teach pointer movement, click, enabling effects, adjusting settings and combining effects.
    - Never block access to the canvas.

31. **Effect gallery**
    - Show available effects and curated presets with short descriptions.
    - Selecting an item enables it or loads its preset.
    - Do not navigate away from the main playground.

32. **Hidden discoveries / Easter eggs**
    - Optional secret combinations, visual reactions or unlockable preset hints.
    - Keep these discoverable but not required for core use.
    - Do not add a complex achievement system unless it genuinely improves the experience.

33. **Themes**
    - At least a few interface themes/palettes.
    - Theme changes should not unexpectedly reset the simulation.
    - Persist the selected theme locally.

34. **Performance monitor**
    - Show FPS and approximate active particle/object count.
    - Show active effects.
    - Use a rolling FPS estimate rather than a single-frame reading.
    - Avoid making monitoring itself expensive.

### J. Accessibility and device support

35. **Reduced motion**
    - Respect `prefers-reduced-motion`.
    - Offer a reduced-motion mode and lower default animation intensity.

36. **Keyboard**
    - Important controls are keyboard accessible.
    - Avoid trapping focus.
    - Provide visible focus indicators.
    - Shortcuts must not interfere with typing in inputs.

37. **Mobile and touch**
    - Support touch interactions where feasible.
    - Adapt panels to small screens.
    - Avoid requiring hover.
    - Provide a lower-cost default configuration on mobile.
    - Explain when an effect requires a mouse or powerful device.

38. **Responsive layout**
    - Desktop, tablet and mobile layouts.
    - Keep canvas usable at all sizes.
    - Handle orientation changes.

---

## 4. Recommended technical architecture

### Stack

- React + Vite
- JavaScript initially (TypeScript is acceptable if the existing project already uses it)
- CSS or CSS Modules
- HTML Canvas 2D for the main rendering engine
- WebGL/Three.js only for advanced effects that justify it
- Web Audio API for procedural sound
- localStorage for preferences and saved presets
- MediaRecorder for optional recording
- No backend or external API dependency

Do not add libraries just because they are popular. Prefer browser APIs and small focused utilities. If a dependency is proposed, explain why it is needed.

### Architecture principles

- One central animation loop.
- One shared pointer/input manager.
- One shared simulation state for particles and physics objects where appropriate.
- Effects are modular and independently enabled/disabled.
- UI state is separate from high-frequency simulation state.
- Avoid triggering React renders on every pointer movement or animation frame.
- Use `requestAnimationFrame`.
- Use `devicePixelRatio` carefully and cap the effective resolution on high-DPI devices.
- Pause or reduce work when the tab is hidden.
- Clean up event listeners, animation frames, audio nodes and recording tracks.
- Use a bounded particle/object pool or other allocation-conscious approach.
- Keep effect configuration serializable.

### Suggested folder structure

Adapt this to the existing repository rather than forcing a rewrite.

```text
src/
  app/
    App.jsx
    layout/
      TopBar.jsx
      EffectLibrary.jsx
      ControlPanel.jsx
      StatusBar.jsx
      MobilePanels.jsx
  canvas/
    CanvasHost.jsx
    Renderer.js
    Simulation.js
    PointerManager.js
    PerformanceMonitor.js
    objectPool.js
  effects/
    registry.js
    particles/
      ParticleTrail.js
      MagneticField.js
      GlowRibbon.js
    physics/
      Gravity.js
      Collision.js
      DragThrow.js
    bursts/
      Fireworks.js
      Explosions.js
    visual/
      LiquidMotion.js
      Distortion.js
      ColourEffects.js
    typography/
      TypographyDistortion.js
  audio/
    AudioManager.js
  presets/
    defaults.js
    curatedPresets.js
    presetValidation.js
  storage/
    settingsStorage.js
    presetStorage.js
  hooks/
  styles/
  utils/
```

This is a suggested structure, not a requirement to create every file immediately. Keep the project simpler until each module is needed.

### Effect contract

Every effect should follow a consistent lifecycle. The exact API can be refined during Phase 1, but it should support the equivalent of:

```js
{
  id,
  name,
  category,
  defaultConfig,
  initialize(context, config),
  update(deltaTime, context, config),
  render(context, config),
  onPointerDown(pointer, context),
  onPointerUp(pointer, context),
  dispose()
}
```

Not every hook needs to do work. The engine should call only the hooks an effect needs, or use safe no-op defaults.

The shared context may expose:
- Canvas/context and dimensions.
- Pointer position, velocity and buttons.
- Simulation particles/objects.
- Delta time.
- Random utility.
- Shared colour/palette utilities.
- Performance budget information.

Do not let effects directly manipulate unrelated UI components.

---

## 5. Performance and stability requirements

This project is animation-heavy, so performance must be designed in from the beginning.

- Target 60 FPS on a reasonably modern desktop for the default preset, but do not promise 60 FPS on every device.
- Use a configurable maximum particle/object count.
- Avoid unnecessary allocations in the animation loop.
- Use delta time so simulation speed is not tied to frame rate.
- Clamp unusually large delta-time values after tab suspension.
- Use spatial partitioning or simplified collision checks if object counts grow.
- Reduce resolution or particle counts on lower-powered devices.
- Pause animation when the document is hidden.
- Provide a low-power mode.
- Prevent duplicate animation loops when React components rerender.
- Ensure effects can be disabled without leaving stale objects, listeners or timers.
- Test combinations, not just individual effects.
- Do not silently let Chaos Mode activate unlimited expensive effects.

If an effect is too expensive, degrade gracefully and tell the visitor which quality setting was reduced.

---

## 6. Data model

A configuration should be serializable and versioned. Example:

```js
{
  version: 1,
  theme: "midnight",
  global: {
    intensity: 0.7,
    speed: 1,
    maxParticles: 1200,
    reducedMotion: false
  },
  effects: {
    particleTrail: {
      enabled: true,
      config: {
        particleSize: 4,
        lifetime: 900,
        spread: 18
      }
    },
    magneticField: {
      enabled: true,
      config: {
        radius: 160,
        strength: 0.8,
        mode: "attract"
      }
    }
  }
}
```

This is illustrative. Validate every loaded configuration against known effect IDs, allowed settings and numeric limits. Include a schema version so future updates can migrate old presets.

---

## 7. Phased implementation roadmap

The project scope is intentionally broad. Build it incrementally and keep the application usable after every phase.

### Phase 0 — Repository audit and plan

- Inspect the current repository and existing package scripts.
- Identify framework, language, dependencies and current entry points.
- Check whether a project already exists; do not overwrite it blindly.
- Propose the architecture and implementation sequence.
- Identify risks and any dependencies that are genuinely necessary.

**Exit criteria:** A concise audit and agreed implementation plan. No unnecessary code changes.

### Phase 1 — Foundation and first playable canvas

- Create the responsive shell.
- Create the canvas host and renderer.
- Add one animation loop.
- Add pointer tracking.
- Add pause, clear and reset.
- Implement Particle Trails.
- Add basic effect registration and enable/disable lifecycle.
- Add a simple status strip.

**Exit criteria:** A visitor can open the static site, move the pointer, see trails, clear the canvas and use the layout on desktop/mobile.

### Phase 2 — Core effects

- Magnetic Field.
- Glow/Ribbon Trails.
- Fireworks and click explosions.
- Shared particles and basic force interactions.
- Contextual controls for each effect.
- Curated colour palettes.

**Exit criteria:** Several effects can run together without duplicate loops or broken state.

### Phase 3 — Physics and advanced visuals

- Gravity.
- Drag and throw.
- Collision/bouncing.
- Attraction and repulsion.
- Typography Distortion.
- Liquid Motion.
- Optional distortion effects.

**Exit criteria:** Each advanced effect works independently and has documented combination limitations.

### Phase 4 — Creativity and configuration

- Chaos Mode.
- Random configuration generator.
- Curated presets.
- Save/load/delete local presets.
- Global settings.
- Theme selector.
- Configuration validation and migration.

**Exit criteria:** Visitors can create, save, reload and share/restore configurations without corrupting settings.

### Phase 5 — Capture, sound and discovery

- Screenshot export.
- Optional procedural audio.
- Fullscreen.
- Interactive tutorial.
- Effect gallery.
- Easter eggs.
- Optional URL-based configuration sharing.
- Optional short video recording.

**Exit criteria:** Extras are optional, permission-conscious and fail gracefully when browser APIs are unavailable.

### Phase 6 — Quality and release

- Performance monitor and low-power mode.
- Reduced-motion support.
- Keyboard accessibility.
- Mobile/touch refinement.
- Browser testing.
- Test effect combinations.
- Error handling and cleanup.
- README, screenshots and deployment.

**Exit criteria:** A polished static website with documented limitations and no critical interaction or performance bugs.

---

## 8. Testing checklist

### Rendering engine
- Only one animation loop exists.
- Resize and device-pixel-ratio changes work.
- Hidden tab pauses or reduces work.
- No runaway particle creation.
- Delta time is bounded.
- Clearing/resetting leaves no stale effects.

### Effects
- Each effect can be enabled and disabled repeatedly.
- Each effect disposes its resources.
- Multiple effects can run simultaneously.
- Effect combinations have predictable behaviour.
- Controls update the intended effect only.
- Invalid settings are rejected or clamped.

### Persistence
- Settings survive refresh.
- Saved presets can be loaded and deleted.
- Malformed localStorage data does not crash the app.
- Old configuration versions are handled safely.

### Browser/device
- Desktop mouse.
- Touchscreen/mobile.
- Window resize and orientation change.
- Fullscreen unavailable.
- WebGL unavailable.
- Audio unavailable or blocked.
- Recording unavailable.
- Reduced-motion preference enabled.

### Usability
- Visitors understand how to start.
- Canvas remains the visual focus.
- Controls are discoverable.
- No audio starts unexpectedly.
- Keyboard focus is visible.
- Mobile panels do not cover the entire canvas unnecessarily.

---

## 9. Non-goals for the initial release

Do not add these unless there is a clear reason later:

- User accounts or authentication.
- Cloud-synced presets.
- Database or backend.
- Social feed or public user gallery.
- External AI APIs.
- Multiplayer.
- Analytics/tracking.
- Complex achievement or reward systems.

The goal is a self-contained creative playground, not a social platform.

---

## 10. Definition of a successful project

A successful Cursor Playground should:

1. Be enjoyable within the first 10 seconds.
2. Make it easy to discover and combine effects.
3. Have at least three polished effects before adding many more.
4. Support a meaningful set of combinations.
5. Remain responsive under sensible load.
6. Work as a static deployment.
7. Remember local preferences and presets.
8. Handle unsupported browser features gracefully.
9. Have clean modular architecture.
10. Be visually distinctive enough that visitors want to experiment and share what they create.

---

## 11. Instructions for AI coding agents

Treat this document as the product specification and source of truth.

- First inspect the existing repository.
- Do not assume the project is empty.
- Do not rewrite working code without explaining why.
- Do not implement all phases in one pass.
- Work phase by phase.
- Before each phase, state the files likely to change and the acceptance criteria.
- Preserve existing working features.
- Prefer small, testable changes.
- Do not claim a feature is complete until it has been run and tested.
- If a requested feature conflicts with performance, browser support or the architecture, explain the trade-off and propose a fallback.
- Keep this document updated when scope or architecture decisions change.
- At the end of each phase, report what was implemented, what was tested, what remains and any known limitations.

**First task:** Perform Phase 0 only. Audit the repository, summarize the current state, propose the architecture and implementation plan, and wait for approval before modifying files.
