# Authentication API Documentation

## Setup

1. Run the SQL script to create the users table in Supabase:
   ```bash
   # Execute the contents of prisma/users_table.sql in your Supabase SQL editor
   ```

2. Make sure to change the JWT_SECRET in your .env file to a secure random string in production.

## Endpoints

Base URL: `http://localhost:3001/api/auth`

### Public Endpoints

#### 1. Signup
Create a new user account.

**POST** `/api/auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optional
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token-here"
}
```

**Validation:**
- Email must be valid format
- Password must be at least 6 characters
- Email must not already exist

---

#### 2. Login
Login with existing credentials.

**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token-here"
}
```

---

### Protected Endpoints
All protected endpoints require an `Authorization` header with a Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

#### 3. Get Current User
Get the currently authenticated user's information.

**GET** `/api/auth/me`

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### 4. Update Profile
Update the current user's profile information.

**PUT** `/api/auth/profile`

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "newemail@example.com" // optional
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "email": "newemail@example.com",
    "name": "Jane Doe",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### 5. Change Password
Change the current user's password.

**PUT** `/api/auth/change-password`

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Validation:**
- Current password must be correct
- New password must be at least 6 characters

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "Error message describing what went wrong"
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid email or password"
}
// or
{
  "error": "Access token required"
}
```

**403 Forbidden:**
```json
{
  "error": "Invalid or expired token"
}
```

**404 Not Found:**
```json
{
  "error": "User not found"
}
```

**409 Conflict:**
```json
{
  "error": "Email already registered"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Server error message"
}
```

---

## Usage Example (JavaScript/TypeScript)

### Signup
```javascript
const response = await fetch('http://localhost:3001/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe'
  }),
});

const data = await response.json();
const token = data.token;
// Store token in localStorage or secure storage
localStorage.setItem('token', token);
```

### Login
```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  }),
});

const data = await response.json();
localStorage.setItem('token', data.token);
```

### Making Authenticated Requests
```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:3001/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
console.log(data.user);
```

---

## Security Notes

1. **JWT Secret:** Change `JWT_SECRET` in `.env` to a strong, random string in production
2. **HTTPS:** Always use HTTPS in production to protect tokens in transit
3. **Token Storage:** Store tokens securely (httpOnly cookies or secure storage)
4. **Token Expiration:** Tokens expire after 7 days by default (configurable via `JWT_EXPIRES_IN`)
5. **Password Hashing:** Passwords are hashed using bcrypt with salt rounds of 10
