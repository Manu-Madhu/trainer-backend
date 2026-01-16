# GymPro API Documentation

## Base URL
`http://localhost:5000/api`

## Authentication
- **POST** `/auth/register` - Register a new user (User/Trainer)
  - Body: `{ name, email, password, role, phone }`
- **POST** `/auth/login` - Login user
  - Body: `{ email, password }`
- **POST** `/auth/verify-otp` - Verify OTP
  - Body: `{ email, otp }`
- **POST** `/auth/resend-otp` - Resend OTP
  - Body: `{ email }`
- **POST** `/auth/forgot-password` - Request password reset
  - Body: `{ email }`

## Users (Admin/General)
- **GET** `/users` - Get all users (Admin only, filterable by role)
- **GET** `/users/:id` - Get user details
- **PUT** `/users/:id` - Update user profile
- **PUT** `/users/:id/block` - Block/Unblock user (Admin)
- **POST** `/users/assign-trainer` - Assign trainer to user
  - Body: `{ userId, trainerId }`

## Workouts
- **GET** `/workouts` - Get all workout plans
- **POST** `/workouts` - Create a workout plan (Trainer/Admin)
- **GET** `/workouts/my-plan` - Get assigned workout plan (User)
- **PUT** `/workouts/:id` - Update workout plan
- **DELETE** `/workouts/:id` - Delete workout plan

## Meals
- **GET** `/meals` - Get all meal plans
- **POST** `/meals` - Create a meal plan (Trainer/Admin)
- **GET** `/meals/my-plan` - Get assigned meal plan (User)
- **PUT** `/meals/:id` - Update meal plan
- **DELETE** `/meals/:id` - Delete meal plan

## Progress Tracking
- **POST** `/progress` - Log daily progress (User)
  - Body: `{ weight, date, measurements: { chest, waist, arms, legs } }`
- **POST** `/progress/photos` - Upload progress photos (User)
  - Body: FormData with file
- **GET** `/progress/history` - Get progress history (User/Trainer)
- **POST** `/progress/feedback` - Trainer feedback on progress
  - Body: `{ progressId, feedback }`

## Chat
- **GET** `/chat/conversations` - Get list of conversations
- **GET** `/chat/:userId` - Get messages with a specific user
- **POST** `/chat/send` - Send a message
  - Body: `{ recipientId, content, type (text/image) }`

## Subscriptions
- **GET** `/subscriptions/plans` - Get available subscription plans
- **POST** `/subscriptions/subscribe` - Subscribe to a plan
- **GET** `/subscriptions/status` - Get current subscription status

## Admin Dashboard
- **GET** `/admin/stats` - Get dashboard statistics (User count, revenue, etc.)
