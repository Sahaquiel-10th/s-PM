module.exports = {
  apps: [
    {
      name: "s-pm-web",
      cwd: "/home/ubuntu/s-pm",
      script: "./node_modules/.bin/vinext",
      args: "start --hostname 127.0.0.1 --port 3108",
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
  ],
};
