module.exports = {
    apps: [
        {
            name: "booklist-backend",
            script: "src/server.js",
            node_args: "--env-file=.env",
            env_production: {
                NODE_ENV: "production",
            },
        },
    ],
};
