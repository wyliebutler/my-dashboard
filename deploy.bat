@echo off
echo Packaging modified files for deployment...
tar -cf deploy.tar frontend/index.html frontend/styles.css frontend/app.js frontend/js frontend/Dockerfile backend/package.json backend/tsconfig.json backend/Dockerfile backend/server.ts backend/database.ts backend/routes backend/middleware backend/types.ts

echo Uploading to production server...
scp -o BatchMode=yes deploy.tar ubuntu@51.79.55.125:/home/ubuntu/docker/my-dashboard/

echo Extracting and rebuilding Docker containers...
ssh -o BatchMode=yes ubuntu@51.79.55.125 "cd /home/ubuntu/docker/my-dashboard && tar -xf deploy.tar && docker compose up -d --build"

echo Deployment Complete!
pause
