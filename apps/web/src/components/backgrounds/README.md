# React Bits adaptations

Source: https://github.com/DavidHDev/react-bits (Dither and Threads, retrieved 2026-09-19). Copyright David Haz. License retained in LICENSE.react-bits.md.

The original fragment algorithms are rendered by a small native WebGL2 host rather than adding Three/R3F/postprocessing and OGL. Dither combines its wave and ordered Bayer passes in one shader and emits a monochrome mask. Threads retains its line field. These are decorative product backgrounds, not application analytics infrastructure.

Rendering is capped at 24 fps and 960x600 pixels, pauses off-screen and in hidden documents, and is disabled below 768px or for reduced motion. CSS dots are the SSR, mobile, reduced-motion, unsupported-WebGL and context-loss fallback. Resize and preference listeners are cleaned up. Runtime shader/browser validation is still required on the user-owned server.
