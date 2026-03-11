# FREEFLIX V2

Share and stream movies with your friends and family.

## Overview

A full-featured media streaming platform built with modern web technologies. Upload movies and series in chunks, sync with TMDB for rich content details, and stream directly through a responsive interface. Watch movies simultaneously with friends via synchronized Watch Together rooms. Fully containerized with separate configurations for development and production.

[Live Demo](https://freeflix.austin-full-stack-developer.tech/)

## Features

- 🎬 TMDB integration for detailed movie/series information
- ⚡ Chunked file uploads with pause/resume capability
- 📺 Support for series with seasons and episodes
- 🎨 Responsive, mobile-friendly design
- 🔍 Advanced filtering and browsing
- 📥 Direct streaming and download functionality
- 🔐 JWT authentication with role-based content permissions
- 👥 Watch Together rooms for synchronized co-watching
- 🧠 Redis-backed room state for Watch Together sessions
- 🐳 Docker-ready with dev and prod configurations

## Authentication & Permissions

FreeFlix uses a custom `Flixer` user model (UUID primary key) backed by **Django REST Framework + Simple JWT + Djoser**.

- Users can register/login via `/auth/` and stay signed in with JWT-based sessions.
- Browsing is open, while create/update/delete actions require authenticated users with the right permissions.
- The frontend uses the `can_create_flix` flag to show or hide creator features.

## Watch Together

Create a synchronized viewing room directly from any movie detail page and invite friends via a shareable link.

### How it works

1. **Create** — The host clicks "Watch Together" on a movie page to generate an invite link.
2. **Invite** — Friends open the link and join the same room.
3. **Sync** — Host playback actions are synced to everyone in real time.
4. **Stabilize** — New joiners receive immediate sync, and reconnect handling keeps sessions smooth.

Room state is stored in Redis (instead of in-memory maps) so sessions are more resilient.

### Authentication in room sessions

- Room creation and join flow require authenticated users.
- Socket joins are validated before users are allowed into a room.
- Unauthenticated access is blocked.

## Tech Stack

- **Frontend**: React 16.13.1 + Tailwind CSS
- **API Backend**: Django 4.2.23 + Django REST Framework + Simple JWT + Djoser
- **Media Backend**: Node.js + Socket.IO + Redis (`ioredis`)
- **Streaming**: Nginx
- **Server**: Nginx + Gunicorn
- **Containerization**: Docker & Docker Compose
- **Database**: MySQL

## Getting Started

### Prerequisites

- Docker and Docker Compose (recommended)
- Or: Node.js, Python 3.9+ (Linux environment recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jhetjhet/freeflixv2.git
   cd freeflix
   ```

2. Start with Docker:
   ```bash
   # Development
   docker compose up
   
   # Production
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up
   ```

3. Without Docker (Use Ubuntu Linux Recommended):
   - Set up Python virtual environment and install dependencies
   - Set up Node.js for the media backend
   - Run migrations and start services


