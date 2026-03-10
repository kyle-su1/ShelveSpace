# ShelveSpace

A full-stack social bookshelf app. Search for books, track what you're reading, and share recommendations with friends.

## Features

- **Book search & tracking** — search the Google Books API and add books to your personal shelves
- **Social friending** — send/accept friend requests and browse friends' shelves
- **Recommendations** — send book recommendations directly to friends
- **Real-time updates** — live notifications via WebSockets (Socket.io)
- **Authentication** — sign up / log in with AWS Cognito (JWT-based)
- **Redis caching** — book search results cached to reduce API calls

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL (AWS RDS) |
| Cache | Redis |
| Auth | AWS Cognito |
| Real-time | Socket.io |
| External API | Google Books API |

## Deployment

The app is hosted on an AWS EC2 instance with the following setup:

- **Nginx** serves the Vite-built React frontend (`frontend/dist`) and reverse-proxies API and WebSocket traffic to the Node backend on port 3000
- **PM2** manages the Node process (`ecosystem.config.cjs`)
- **CI/CD** — pushing to `main` triggers a GitHub Actions workflow that SSHs into the EC2 instance, pulls the latest code, builds the frontend, and restarts the backend via PM2