# Smart Open Space

## Getting Started

Follow these steps to get the development environment up and running.

### 1. Prerequisites
Ensure you have **Docker** and **Docker Compose** installed.

Verify installation:
```bash
docker --version
docker-compose --version
```

### 2. Environment Configuration
The project uses a `.env` file to manage environment variables. Create a file named `.env` in the root directory (same folder as `docker-compose.yml`). For reference, check `.env.example` file containing all used variables.

### 3. Run the App
To build the images and start all services, simply run:
```bash
docker compose up --build
```
add `-d` flag for daemon (running the app as a background service).