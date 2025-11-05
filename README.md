# My Personal Dashboard

A self-hosted, full-stack dashboard application with a Node.js backend and a pure JavaScript frontend, all running in Docker.

## How to Run

1.  Ensure Docker and Docker Compose are installed.
2.  Clone this repository:
    ```bash
    git clone [https://github.com/wyliebutler/my-dashboard.git](https://github.com/wyliebutler/my-dashboard.git)
    cd my-dashboard
    ```
3.  Create your own secret `.env` file. You can copy the template:
    ```bash
    cp .env.example .env
    ```
4.  Edit the `.env` file and add your own unique secret:
    ```bash
    nano .env
    # Add a line like: JWT_SECRET=my-super-random-key
    ```
5.  Run the application. Docker will automatically create the database volume.
    ```bash
    docker-compose up -d --build
    ```
6.  The dashboard will be available at `http://<your-server-ip>:4446`.
