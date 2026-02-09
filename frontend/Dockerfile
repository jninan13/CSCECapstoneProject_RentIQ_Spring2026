FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the frontend code
COPY . .

EXPOSE 5173

# Run Vite dev server, accessible from host
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

