module.exports = {
  apps: [
    {
      name: "cod-stats-twitch",
      interpreter: "/root/.bun/bin/bun",
      script: "src/index.ts",
      cwd: "/opt/cod-stats-tracker/current/apps/twitch",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
}
