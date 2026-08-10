const fs = require("node:fs");

function readEnvFile(filePath) {
  try {
    return Object.fromEntries(
      fs
        .readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return {};
  }
}

const cosEnv = readEnvFile("/home/ubuntu/s-pm-data/cos.env");

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
        TENCENT_COS_SECRET_ID:
          cosEnv.TENCENT_COS_SECRET_ID || process.env.TENCENT_COS_SECRET_ID,
        TENCENT_COS_SECRET_KEY:
          cosEnv.TENCENT_COS_SECRET_KEY || process.env.TENCENT_COS_SECRET_KEY,
        TENCENT_COS_BUCKET:
          cosEnv.TENCENT_COS_BUCKET || process.env.TENCENT_COS_BUCKET,
        TENCENT_COS_REGION:
          cosEnv.TENCENT_COS_REGION || process.env.TENCENT_COS_REGION,
      },
    },
  ],
};
