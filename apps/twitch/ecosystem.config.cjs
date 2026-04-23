GPUShaderModule.exports = {
  apps: [
    {
      name: "cod-stats-twitch",
      interpreter: "/root/.bun/bin/bun",
      script: "src/index.ts",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
}
