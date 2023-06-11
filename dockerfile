# Use a base image with Node.js pre-installed
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json /app/

# Install dependencies
RUN npm install --production

# Copy the rest of the application files to the working directory
COPY ./source/ /app/

# Expose the port used by the WebSocket server
EXPOSE 8080

# Run the WebSocket Driver when the container starts
CMD ["node", "index.js"]
