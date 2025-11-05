# My Personal Dashboard

A self-hosted, full-stack dashboard application with a Node.js backend and a pure JavaScript frontend, all running in Docker.

## How to Run

1.  Ensure Docker and Docker Compose are installed.
2.  Clone this repository:
    ```bash
    git clone https://github.com/wyliebutler/my-dashboard.git
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

7.  Use the EXPORT and IMPORT function to make a backup of your cards. Especially useful for testing the app.

If you want to create tiles for your windows apps you can use this work-a-round.  Here are the steps.

1.  Create a folder to hold your launcher.bat file you will create.  The file contents will look like this:
*******************************************
@echo off
REM --- This script silently launches local apps from a URL ---

REM Get the full URL (e.g., "launch://notepad/")
set APP_URL=%~1

REM Clean the URL to get just the app name
REM This removes "launch://" and the final "/"
set APP_NAME=%APP_URL:launch://=%
set APP_NAME=%APP_NAME:/=%

REM --- ADD YOUR APPS HERE ---
if /I "%APP_NAME%"=="notepad" (
    start "" "C:\Windows\System32\notepad.exe"

)
if /I "%APP_NAME%"=="Notepad++" (
    start "" "C:\Program Files\Notepad++\notepad++.exe"
)

REM Add more "if" blocks here for other apps
exit
******************************************
2.  Create a registry file to allow for the "launch" protocol.  Clicking on this file will add it to your registry. Here's the contents:
******************************************
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\launch]
@="URL:Launch Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\launch\shell]

[HKEY_CLASSES_ROOT\launch\shell\open]

[HKEY_CLASSES_ROOT\launch\shell\open\command]
@="\"C:\\dashboard-launcher\\launcher.bat\" \"%1\""
*********************************************
3.  Create your tile as normal.  In the APP URL field place: launch://notepad. Note:  Make this exactly same as the APP_NAME you have in your your launcher.bat file.   If you have the path and name correct your app should launch.
