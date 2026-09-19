"use client"

import { useEffect, useRef } from "react"

/** Decorative only. CSS remains visible before hydration or when WebGL is unavailable. */
export function ProductBackground({
  effect,
}: {
  effect: "threads" | "dither"
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const motion = window.matchMedia(
      "(prefers-reduced-motion: reduce), (max-width: 767px)"
    )
    let dispose: (() => void) | undefined
    let generation = 0
    const start = async () => {
      const current = ++generation
      dispose?.()
      dispose = undefined
      canvas.style.opacity = "0"
      if (motion.matches) return
      const shaders = await import("./shaders")
      if (current !== generation) return
      const gl = canvas.getContext("webgl2", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        powerPreference: "low-power",
      })
      if (!gl) return
      const program = gl.createProgram()
      if (!program) return
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type)
        if (!shader) return null
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader)
          return null
        }
        gl.attachShader(program, shader)
        gl.deleteShader(shader)
        return shader
      }
      const vertex = compile(
        gl.VERTEX_SHADER,
        `#version 300 es
        in vec2 position; void main() { gl_Position = vec4(position, 0., 1.); }`
      )
      const fragment = compile(
        gl.FRAGMENT_SHADER,
        effect === "dither" ? shaders.ditherShader : shaders.threadsShader
      )
      if (!vertex || !fragment) {
        gl.deleteProgram(program)
        return
      }
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program)
        return
      }
      gl.useProgram(program)
      const buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW
      )
      const position = gl.getAttribLocation(program, "position")
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      const uniform = (name: string) => gl.getUniformLocation(program, name)
      const time = uniform(effect === "dither" ? "time" : "iTime")
      const resolution = uniform(
        effect === "dither" ? "resolution" : "iResolution"
      )
      gl.uniform1f(uniform("waveSpeed"), 0.025)
      gl.uniform1f(uniform("waveFrequency"), 3)
      gl.uniform1f(uniform("waveAmplitude"), 0.3)
      gl.uniform1f(uniform("uAmplitude"), 0.55)
      gl.uniform1f(uniform("uDistance"), 0.18)
      gl.uniform2f(uniform("uMouse"), 0.5, 0.5)
      const updateColor = () => {
        const sample = document.createElement("canvas").getContext("2d")
        if (!sample) return
        sample.fillStyle = getComputedStyle(canvas).color
        sample.fillRect(0, 0, 1, 1)
        const pixels = sample.getImageData(0, 0, 1, 1).data
        const r = (pixels[0] ?? 0) / 255,
          g = (pixels[1] ?? 0) / 255,
          b = (pixels[2] ?? 0) / 255
        gl.uniform3f(uniform("uColor"), r, g, b)
        gl.uniform3f(uniform("ink"), r, g, b)
      }
      updateColor()
      const theme = new MutationObserver(updateColor)
      theme.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style"],
      })
      let frame = 0
      let visible = false
      let contextLost = false
      let last = 0
      let elapsed = 0
      const draw = (now: number) => {
        frame = requestAnimationFrame(draw)
        if (now - last < 1000 / 24) return
        elapsed += Math.min(now - last, 100) / 1000
        last = now
        gl.uniform1f(time, elapsed)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      const sync = () => {
        cancelAnimationFrame(frame)
        if (visible && !document.hidden && !contextLost) {
          last = performance.now()
          frame = requestAnimationFrame(draw)
        }
      }
      const resize = () => {
        // Half-resolution, at most 960x600, independent of device pixel ratio.
        canvas.width = Math.max(
          1,
          Math.min(960, Math.round(canvas.clientWidth / 2))
        )
        canvas.height = Math.max(
          1,
          Math.min(600, Math.round(canvas.clientHeight / 2))
        )
        gl.viewport(0, 0, canvas.width, canvas.height)
        if (effect === "dither")
          gl.uniform2f(resolution, canvas.width, canvas.height)
        else gl.uniform3f(resolution, canvas.width, canvas.height, 1)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? false
        sync()
      })
      const sizes = new ResizeObserver(resize)
      observer.observe(canvas)
      sizes.observe(canvas)
      document.addEventListener("visibilitychange", sync)
      const lost = () => {
        contextLost = true
        cancelAnimationFrame(frame)
        canvas.style.opacity = "0"
      }
      canvas.addEventListener("webglcontextlost", lost)
      resize()
      canvas.style.opacity = "1"
      dispose = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        theme.disconnect()
        sizes.disconnect()
        document.removeEventListener("visibilitychange", sync)
        canvas.removeEventListener("webglcontextlost", lost)
        gl.deleteBuffer(buffer)
        gl.deleteProgram(program)
      }
    }
    const update = () => {
      void start()
    }
    update()
    motion.addEventListener("change", update)
    return () => {
      generation++
      dispose?.()
      motion.removeEventListener("change", update)
    }
  }, [effect])
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden text-primary"
    >
      <div className="absolute inset-0 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:8px_8px] opacity-15" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-0"
      />
    </div>
  )
}
