# Use official nginx base image
FROM nginx:latest

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy your application files (index.html) to nginx default directory
COPY index.html /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
