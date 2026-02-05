module.exports = {
  apps: [
    {
      name: "dohyeon-kr-server",
      cwd: __dirname,
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "3000"
      }
    }
  ]
};

