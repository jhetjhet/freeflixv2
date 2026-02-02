# FREEFLIX V2

Share and stream movies with your friends and family.

## Overview

A full-featured media streaming platform built with modern web technologies. Upload movies and series in chunks, sync with TMDB for rich content details, and stream directly through a responsive interface. Fully containerized with separate configurations for development and production.

## Features

- 🎬 TMDB integration for detailed movie/series information
- ⚡ Chunked file uploads with pause/resume capability
- 📺 Support for series with seasons and episodes
- 🎨 Responsive, mobile-friendly design
- 🔍 Advanced filtering and browsing
- 📥 Direct streaming and download functionality
- 🐳 Docker-ready with dev and prod configurations

## Tech Stack

- **Frontend**: React 16.13.1 + Tailwind CSS
- **API Backend**: Django 4.2.23
- **Media Backend**: Node.js
- **Streaming**: Nginx
- **Server**: Nginx + Gunicorn
- **Containerization**: Docker & Docker Compose
- **Database**: MySQL

## Getting Started

### Prerequisites

- Docker and Docker Compose (recommended)
- Or: Node.js, Python 3.9+, MySQL (Linux environment recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jhetjhet/freeflixv2.git
   cd freeflix
   ```

2. Start with Docker:
   ```bash
   # Development
   docker compose -f compose.dev.yml up
   
   # Production
   docker compose up
   ```

3. Without Docker:
   - Set up Python virtual environment and install dependencies
   - Set up Node.js for the media backend
   - Configure MySQL database
   - Run migrations and start services


