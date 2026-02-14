# College Clubs & Events Management Platform - Backend

A FastAPI-based backend system for managing college clubs and events. This platform streamlines club membership, event organization, attendance tracking, and certificate generation.

## 🎯 Features

### User Management
- **Three-tier role system**: Student, Club Admin, Super Admin
- Secure authentication with bcrypt password hashing
- User registration and login

### Club Management
- Create and manage clubs with objectives and activities
- Membership approval system (request → pending → approved)
- Track club members and pending requests
- Social media links integration

### Event Management
- Create events with capacity limits
- Event registration and cancellation
- Event calendar view (by month/year)
- Attendance tracking
- Automatic certificate generation on attendance
- Social media promotion text for events

### Feedback System
- Event ratings (1-5 stars)
- Written feedback/comments
- Statistics dashboard for admins (ratings breakdown)

### Certificates
- Auto-generated HTML certificates
- Downloadable for attended events
- User certificate history

### Admin Features
- **Super Admin Dashboard**: User management, promote/demote admins
- **Club Admin Dashboard**: Manage clubs, events, members, attendance

## 🛠️ Tech Stack

- **Framework**: FastAPI
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: Passlib (bcrypt)
- **CORS**: Enabled for frontend integration

## 📋 Prerequisites

- Python 3.8+
- pip

## 🚀 Installation

1. **Clone the repository**
```bash
git clone https://github.com/YashPawar-YP/xenia-hackathon-project.git
cd xenia-hackathon-project/backend
```

2. **Install dependencies**
```bash
pip install fastapi uvicorn sqlalchemy passlib bcrypt python-multipart
```

3. **Run the server**
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

4. **Access API documentation**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🔑 Default Credentials

**Super Admin** (created automatically on startup):
- Email: `admin@college.edu`
- Password: `admin123`

## 👥 User Roles

| Role | Permissions |
|------|------------|
| **Student** | Register for events, join clubs, submit feedback, view certificates |
| **Club Admin** | Create events, approve members, mark attendance, manage club |
| **Super Admin** | All permissions + promote users, view all data |

## 📚 API Endpoints

### 🔐 Authentication

#### Register User
```http
POST /register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### 👤 User Endpoints

#### Get User Details
```http
GET /users/{user_id}
```

#### Get User's Events
```http
GET /users/{user_id}/events
```

#### Get User's Certificates
```http
GET /users/{user_id}/certificates
```

### 🏛️ Club Endpoints

#### Create Club (Admin only)
```http
POST /clubs?admin_id={admin_id}
Content-Type: application/json

{
  "name": "Coding Club",
  "description": "Learn to code together",
  "objectives": "Improve coding skills",
  "activities": "Weekly coding sessions",
  "admin_id": 2
}
```

#### List All Clubs
```http
GET /clubs
```

#### List Clubs by Admin
```http
GET /clubs?admin_id={admin_id}
```

#### Get Club Details
```http
GET /clubs/{club_id}
```

#### Join Club
```http
POST /clubs/{club_id}/join?user_id={user_id}
```

#### Approve Member (Admin only)
```http
POST /clubs/{club_id}/approve/{user_id}?admin_id={admin_id}
```

#### Reject Member (Admin only)
```http
POST /clubs/{club_id}/reject/{user_id}?admin_id={admin_id}
```

#### Get Club Members
```http
GET /clubs/{club_id}/members
```

### 📅 Event Endpoints

#### Create Event (Admin only)
```http
POST /events?admin_id={admin_id}
Content-Type: application/json

{
  "club_id": 1,
  "title": "Hackathon 2024",
  "description": "24-hour coding competition",
  "event_date": "2024-03-15T09:00:00",
  "location": "Main Auditorium",
  "capacity": 100,
  "social_promo_text": "Join us for Hackathon 2024! 🚀"
}
```

#### List All Events
```http
GET /events
```

#### Get Event Calendar (by month)
```http
GET /events/calendar/{year}/{month}
```

#### Get Event Details
```http
GET /events/{event_id}
```

#### Register for Event
```http
POST /events/{event_id}/register?user_id={user_id}
```

#### Cancel Registration
```http
DELETE /events/{event_id}/register/{user_id}
```

#### Get Event Registrations
```http
GET /events/{event_id}/registrations
```

#### Mark Attendance (Admin only)
```http
POST /events/{event_id}/mark-attendance/{user_id}?admin_id={admin_id}
```

#### Delete Event (Admin only)
```http
DELETE /events/{event_id}?admin_id={admin_id}
```

### ⭐ Feedback Endpoints

#### Submit Feedback
```http
POST /events/{event_id}/feedback
Content-Type: application/json

{
  "event_id": 1,
  "user_id": 3,
  "rating": 5,
  "comment": "Great event!"
}
```

#### Get Event Feedback
```http
GET /events/{event_id}/feedback
```

#### Get Feedback Stats (Admin only)
```http
GET /admin/events/{event_id}/feedback-stats?admin_id={admin_id}
```

### 📜 Certificate Endpoints

#### Download Certificate
```http
GET /certificates/{cert_id}/download
```

### 📱 Social Media

#### Get Social Media Promo
```http
GET /events/{event_id}/social-promo
```

Returns shareable links for Twitter, Facebook, WhatsApp.

### 🔧 Admin Endpoints

#### Super Admin Dashboard
```http
GET /superadmin/dashboard?super_admin_id={admin_id}
```

#### List All Users (Super Admin)
```http
GET /superadmin/users?super_admin_id={admin_id}
```

#### Promote User to Club Admin
```http
POST /superadmin/promote-to-club-admin?super_admin_id={admin_id}
Content-Type: application/json

{
  "user_id": 5
}
```

#### Demote Club Admin to Student
```http
POST /superadmin/demote-from-club-admin?super_admin_id={admin_id}
Content-Type: application/json

{
  "user_id": 5
}
```

#### Club Admin Dashboard
```http
GET /admin/dashboard?admin_id={admin_id}
```

## 🔄 Common Workflows

### 1. Student Joining a Club
```
1. Student registers: POST /register
2. Student logs in: POST /login
3. View clubs: GET /clubs
4. Request to join: POST /clubs/{club_id}/join
5. Wait for admin approval
```

### 2. Creating and Running an Event
```
1. Admin creates event: POST /events
2. Students register: POST /events/{event_id}/register
3. Event happens
4. Admin marks attendance: POST /events/{event_id}/mark-attendance/{user_id}
5. Certificate auto-generated
6. Students submit feedback: POST /events/{event_id}/feedback
```

### 3. Super Admin Promoting Users
```
1. Login as super admin
2. View all users: GET /superadmin/users
3. Promote user: POST /superadmin/promote-to-club-admin
4. User can now create clubs and events
```

## 📊 Database Schema

### Tables
- **users**: User accounts with roles
- **clubs**: Club information and membership
- **events**: Event details and registrations
- **feedback**: Event ratings and comments
- **certificates**: Participation certificates

## 🧪 Testing

### Using Swagger UI (Recommended)
1. Go to `http://localhost:8000/docs`
2. Expand any endpoint
3. Click "Try it out"
4. Fill parameters
5. Execute

### Using cURL

**Register a user:**
```bash
curl -X POST "http://localhost:8000/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"pass123"}'
```

**Login:**
```bash
curl -X POST "http://localhost:8000/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@college.edu","password":"admin123"}'
```

### Using Postman
1. Import the API to Postman
2. Create a collection
3. Add requests with proper headers and body

## 🐛 Troubleshooting

**Database locked error:**
- Stop all running instances
- Delete `test.db` and restart

**CORS errors:**
- CORS is enabled for all origins (`*`)
- If issues persist, check frontend URL in CORS settings

**Password hash errors:**
- Bcrypt compatibility fix is included
- If issues persist, reinstall: `pip install --upgrade bcrypt`

## 📁 Project Structure
```
backend/
├── main.py              # Main FastAPI application
├── test.db              # SQLite database (auto-created)
└── README.md            # This file
```

## 🔒 Security Notes

- Passwords are hashed with bcrypt
- Truncated to 72 bytes for bcrypt compatibility
- Use HTTPS in production
- Change default super admin password
- Implement JWT tokens for production (currently basic auth)

## 🚀 Production Deployment

For production, consider:
- Use PostgreSQL instead of SQLite
- Implement JWT authentication
- Add rate limiting
- Enable HTTPS
- Use environment variables for secrets
- Add logging
- Implement proper error handling

## 📝 License

This project is created for the Xenia Hackathon.

## 👥 Contributors

- Yash Pawar ([@YashPawar-YP](https://github.com/YashPawar-YP))

## 🤝 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for Xenia Hackathon 2024**
