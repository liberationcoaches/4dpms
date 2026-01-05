# API Documentation

## Authentication Endpoints

### POST /api/auth/signup

Create a new user account and generate OTPs for verification.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "mobile": "1234567890",
  "companyName": "Tech Corp",
  "industry": "Technology"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "User created successfully. OTPs sent to email and mobile.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "john.doe@example.com",
    "mobile": "1234567890",
    "emailOTP": "123456",
    "mobileOTP": "654321"
  }
}
```

**Note:** `emailOTP` and `mobileOTP` are only returned in development mode for testing purposes.

**Error Responses:**

- `400 Bad Request` - Validation errors
- `500 Internal Server Error` - User already exists or server error

---

### POST /api/auth/verify-otp

Verify both email and mobile OTPs and activate the user account.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "mobile": "1234567890",
  "emailOTP": "123456",
  "mobileOTP": "654321"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "OTPs verified successfully. Account activated.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "john.doe@example.com",
    "isEmailVerified": true,
    "isMobileVerified": true
  }
}
```

**Error Responses:**

- `400 Bad Request` - Validation errors
- `500 Internal Server Error` - Invalid/expired OTP or user not found

---

### POST /api/auth/verify-otp/email

Verify email OTP individually (for auto-validation).

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "OTP verified successfully",
  "data": {
    "verified": true
  }
}
```

**Response (400 Bad Request):**
```json
{
  "status": "error",
  "message": "Invalid or expired OTP",
  "data": {
    "verified": false
  }
}
```

---

### POST /api/auth/verify-otp/mobile

Verify mobile OTP individually (for auto-validation).

**Request Body:**
```json
{
  "mobile": "1234567890",
  "otp": "654321"
}
```

**Response:** Same as `/api/auth/verify-otp/email`

---

### POST /api/auth/resend-otp/email

Resend OTP to email address.

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "OTP sent to email",
  "data": {
    "otp": "789012"
  }
}
```

**Note:** `otp` is only returned in development mode.

---

### POST /api/auth/resend-otp/mobile

Resend OTP to mobile number.

**Request Body:**
```json
{
  "mobile": "1234567890"
}
```

**Response:** Same as `/api/auth/resend-otp/email`

---

## Error Response Format

All error responses follow this format:

```json
{
  "status": "error",
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Validation Rules

### Sign Up
- `name`: Required, 1-100 characters
- `email`: Required, valid email format, unique
- `mobile`: Required, exactly 10 digits, unique
- `companyName`: Required, 1-200 characters
- `industry`: Required, must be one of: Technology, Healthcare, Finance, Education, Manufacturing, Retail, Consulting, Other

### OTP Verification
- `otp`: Required, exactly 6 digits
- `email`: Required, valid email format
- `mobile`: Required, exactly 10 digits

---

## OTP Rules

- OTPs are 6-digit numeric codes
- OTPs expire after 10 minutes
- Maximum 3 verification attempts per OTP
- New OTP invalidates previous unused OTPs for the same identifier
- Expired OTPs are automatically deleted from the database

---

## Status Codes

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Validation error or invalid input
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

