# Advmen NGO Management System - Backend

Node.js + Express + MongoDB backend for Super Admin Portal

## 📁 Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js (MongoDB connection)
│   ├── controllers/
│   │   └── authController.js (Login & Dashboard logic)
│   ├── middleware/
│   │   └── auth.js (JWT verification)
│   ├── models/
│   │   └── User.js (User schema)
│   ├── routes/
│   │   └── authRoutes.js (API routes)
│   └── index.js (Main server file)
├── .env (Environment variables)
├── package.json
└── README.md
```

## 🚀 Installation

```bash
cd backend
npm install
npm run dev
```

Server will start on `http://localhost:5000`

## 🔐 Super Admin Credentials

**Email**: `admin@advmen.org`
**Password**: `Admin@123456`

These are set in `.env` file and super admin is created automatically on first server start.

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - Super admin login

### Dashboard (Protected)
- `GET /api/auth/dashboard/stats` - Get dashboard statistics
- `GET /api/auth/dashboard/recent-registrations` - Get recent registrations

### Health Check
- `GET /api/health` - Server health check

## 🔑 Environment Variables

```
PORT=5000
MONGODB_URL=<your-mongodb-url>
JWT_SECRET=advmen_ngo_super_secret_key_2024_production_level_security
SUPER_ADMIN_EMAIL=admin@advmen.org
SUPER_ADMIN_PASSWORD=Admin@123456
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

## 📦 Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **cors**: Cross-origin requests
- **dotenv**: Environment variables
- **nodemon**: Development auto-reload

## 🔄 Request/Response Format

### Login Request
```json
{
  "email": "admin@advmen.org",
  "password": "Admin@123456"
}
```

### Login Response
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "Super Admin",
    "email": "admin@advmen.org",
    "role": "super_admin"
  }
}
```

## 🛡️ Security Features

- JWT token authentication
- Password hashing with bcryptjs
- Role-based access control
- CORS enabled
- Input validation
- Error handling

## 📝 Scripts

```bash
npm start      # Start production server
npm run dev    # Start development server with nodemon
npm test       # Run tests
```

## 🔗 Frontend Integration

Frontend connects to:
- `http://localhost:5000/api/auth/login`
- `http://localhost:5000/api/auth/dashboard/stats`
- `http://localhost:5000/api/auth/dashboard/recent-registrations`

## ✅ Features

- ✅ Super Admin login with JWT
- ✅ Password hashing
- ✅ Protected routes
- ✅ Dashboard statistics
- ✅ Recent registrations
- ✅ Error handling
- ✅ CORS support
- ✅ MongoDB integration

## 🚨 Troubleshooting

**Port 5000 already in use?**
```bash
# Change PORT in .env
PORT=5001
```

**MongoDB connection error?**
- Check MONGODB_URL in .env
- Ensure MongoDB is running
- Verify network access

**Super admin not created?**
- Check .env credentials
- Restart server
- Check MongoDB connection

## 📞 Support

For issues or questions, contact: admin@advmen.org

---

**Built with ❤️ for Advmen NGO**
