module.exports = {
  apps: [
    {
      name: 'adsverse-shivani',
      script: './index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      // Logs management
      error_file: './leads/pm2-error.log',
      out_file: './leads/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
