module.exports = {
  apps: [
    {
      name: "s-pm-web",
      cwd: "/home/ubuntu/s-pm",
      script: "./node_modules/vinext/dist/cli.js",
      args: "start --hostname 127.0.0.1 --port 3108",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "700M",
      env: {
        NODE_ENV: "production",
        SPM_DATA_DIR: "/home/ubuntu/s-pm-data",
      },
    },
    {
      name: "s-pm-api",
      cwd: "/home/ubuntu/s-pm",
      script: "./server/api.mjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        SPM_API_HOST: "127.0.0.1",
        SPM_API_PORT: "3110",
        SPM_DATA_DIR: "/home/ubuntu/s-pm-data",
        SPM_SESSION_SECRET_FILE: "/home/ubuntu/s-pm-data/session-secret",
      },
    },
  ],
};
