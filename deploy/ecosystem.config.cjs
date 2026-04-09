module.exports = {
  apps: [
    {
      name: 'buzzforge-api',
      cwd: './backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      // Wait for process.send('ready') before considering the app online
      wait_ready: true,
      listen_timeout: 10000,
      // Give the app up to 5 s to finish in-flight requests on stop/reload
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
