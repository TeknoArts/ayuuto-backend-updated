# Ayuuto Backend (Node.js / Express / MongoDB)

This is the backend API for the Ayuuto app. It provides authentication and user management, backed by MongoDB and secured with JWT.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT (JSON Web Tokens) for auth
- bcryptjs for password hashing
- dotenv for environment variables

## Getting Started

### 1. Install dependencies

```bash
cd ayuuto-backend
npm install
```

### 2. Configure environment

Create a `.env` file in `ayuuto-backend`:

```bash
MONGODB_URI=mongodb://localhost:27017/ayuuto
JWT_SECRET=your_super_secret_jwt_key
PORT=5001
```

You can change the `PORT`, but make sure it matches the `API_BASE_URL` used in the mobile app’s `utils/auth.ts`.

### 3. Run in development

```bash
npm run dev
```

This starts the server with `nodemon` and connects to MongoDB.

### 4. Production start

```bash
npm start
```

## API Overview

Base URL (default):

```text
http://localhost:5001/api
```

### Auth Routes

- `POST /api/auth/register`  
  Register a new user.

  **Body:**
  ```json
  {
    "name": "Amina",
    "email": "amina@example.com",
    "password": "secret123"
  }
  ```

  **Response (201):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "...",
        "name": "Amina",
        "email": "amina@example.com"
      },
      "token": "jwt-token-here"
    }
  }
  ```

- `POST /api/auth/login`  
  Login an existing user.

  **Body:**
  ```json
  {
    "email": "amina@example.com",
    "password": "secret123"
  }
  ```

- `GET /api/auth/me` (protected)  
  Get the current authenticated user.

  **Headers:**
  ```text
  Authorization: Bearer <jwt-token>
  ```

## Project Structure

```text
ayuuto-backend/
  app/
    controllers/
      authController.js   # register, login, getMe
    middleware/
      authMiddleware.js   # JWT auth guard
    models/
      User.js             # User schema + password hashing
    routes/
      authRoutes.js       # /api/auth routes
  server.js               # Express app entry point
  package.json
  .gitignore
  README.md
```

## Notes

- Passwords are hashed with `bcryptjs` before saving.
- JWTs default to 7-day expiry (see `authController.js`).
- If you change the backend port or host, update `API_BASE_URL` in `ayuuto-mobile/utils/auth.ts` to match.


