module.exports = {
  apps: [{
    name: 'ayuuto-backend',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: '/var/log/pm2/ayuuto-backend-error.log',
    out_file: '/var/log/pm2/ayuuto-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Restart app if it crashes
    min_uptime: '10s',
    max_restarts: 10,
    // Wait before restarting
    restart_delay: 4000
  }]
};
