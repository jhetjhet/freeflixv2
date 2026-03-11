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
- 🐳 Docker-ready with dev and prod configurations

## Authentication & Permissions

FreeFlix uses a custom `Flixer` user model (UUID primary key) backed by **Django REST Framework + Simple JWT + Djoser**.

- **JWT tokens**: 30-minute access tokens, 1-day refresh tokens; auto-refreshed every 25 minutes on the frontend
- **Registration / Login / Logout**: handled by Djoser endpoints under `/auth/`
- **Role-based write access**: a custom `FlixModelPermission` class enforces Django model permissions on all content views
  - `GET` / `HEAD` / `OPTIONS` are always public (read-only browsing without an account)
  - `POST` / `PUT` / `PATCH` / `DELETE` require an authenticated user with the matching Django model permission (e.g. `flix.add_movie`)
  - Superusers bypass all restrictions
- **`can_create_flix` flag**: returned in the `/auth/users/me/` response; the frontend uses it to show or hide the content-creation UI

## Watch Together

Create a synchronized viewing room directly from any movie detail page and invite friends via a shareable link.

### How it works

1. **Create a room** — An authenticated user clicks "Watch Together" on a movie detail page. The Node.js backend verifies the JWT, creates an in-memory room keyed to that user as host, and returns an invite path.
2. **Join a room** — Guests open the invite link. The frontend authenticates via Socket.IO (`join_room` event + JWT), and the server assigns each socket a host or client role.
3. **Host-led sync** — Only the host controls playback. `play`, `pause`, and `seek` events emitted by the host are broadcast to all clients in the room.
4. **Initial sync on join** — When a client joins, the server immediately requests a fresh sync payload from the host and delivers it to the new client, so late joiners start at the right position.
5. **Periodic sync broadcast** — The host periodically rebroadcasts its current playback state; clients apply drift-based correction (re-seek threshold: 2.5 s) to stay in lock-step.
6. **Host reconnect grace** — If the host disconnects, clients receive a `host_disconnected` notification and the room remains open for a configurable grace period (default 15 s). If the host does not reconnect in time, the room closes and all clients are notified.
7. **Copy room URL** — The host can copy the invite URL directly from the player overlay at any time.

### Authentication in room sessions

- Room creation and room-info requests (`POST /node/watch-together/create/:movieId`, `GET /node/watch-together/:roomId`) require a valid Bearer token.
- Socket connections authenticate via the `join_room` payload; the Node.js server proxies token verification to Django's `/auth/users/me/` endpoint.
- Unauthenticated users are redirected to a 404 page.

## Tech Stack

- **Frontend**: React 16.13.1 + Tailwind CSS
- **API Backend**: Django 4.2.23 + Django REST Framework + Simple JWT + Djoser
- **Media Backend**: Node.js + Socket.IO
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


