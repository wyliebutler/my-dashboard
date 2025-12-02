# Stage 1: Build static assets (if we had any, like React)
# For now, we just use a base Nginx image.

# Stage 2: Production image
FROM nginx:1.25-alpine

# Copy our custom Nginx configuration
# This is the most likely point of failure.
# Make sure your file is named 'nginx.conf' and is in the 'frontend' directory.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static site (our index.html)
# Copy the built static site
COPY index.html /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js

# Expose port 80
EXPOSE 80

# Nginx will be started automatically by the base image

