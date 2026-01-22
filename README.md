# 🏘️ Multi-Tenant Property Listing Platform – Backend

A **production-ready, scalable backend** for a multi-tenant property listing platform, built with **NestJS**, **MongoDB**, and **Domain-Driven Design (DDD)** principles.

---

## 🎯 Live Deployment

🔗 **API Base URL**
👉 [https://property-listing-backend-6fb4.onrender.com](https://property-listing-backend-6fb4.onrender.com)

📘 **API Documentation (Swagger)**
👉 [https://property-listing-backend-6fb4.onrender.com/api/docs](https://property-listing-backend-6fb4.onrender.com/api/docs)

❤️ **Health Check**
👉 [https://property-listing-backend-6fb4.onrender.com/health](https://property-listing-backend-6fb4.onrender.com/health)

---

## 🚀 Quick Start

### ✅ Prerequisites

* Node.js **18+**
* MongoDB Atlas account
* Cloudinary account

### 📦 Installation

```bash
# Clone repository
git clone https://github.com/master12-ctr/property-listing-backend.git
cd property-listing-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run start
```

---

## 🧰 Tech Stack

* **Framework:** NestJS (TypeScript)
* **Database:** MongoDB + Mongoose
* **Authentication:** JWT (Access & Refresh Token Rotation)
* **Image Storage:** Cloudinary (CDN)
* **API Docs:** Swagger / OpenAPI
* **Deployment:** Render

---

## 🔧 Environment Variables

```env
# Database
MONGODB_URI=your_mongodb_atlas_connection_string

# Security
JWT_SECRET=generate_secure_random_string_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Application
FRONTEND_URL=http://localhost:3001
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecureAdminPass123
PORT=3000
```

> ⚠️ **Important:** Change default admin credentials in production.

---

## 🏗️ Architecture

### 📐 Domain-Driven Design (DDD)

```text
src/
├── auth/                 # JWT authentication & guards
├── users/               # User management
├── properties/          # Core domain
│   ├── domain/          # Business rules & entities
│   ├── persistence/    # Repositories & schemas
│   ├── usecases/       # Application services
│   └── dto/            # DTOs & validation
├── roles/               # RBAC permissions
├── tenants/             # Multi-tenant middleware
├── images/              # Cloudinary integration
├── contact/             # Messaging system
├── metrics/             # Admin analytics
└── shared/              # Common utilities
```

---

## 🔐 Security Implementation

### 🛡️ Three-Layer Security Model

1. **Tenant Isolation Middleware** – Extracts `X-Tenant-ID`
2. **JWT Authentication** – Access & refresh token rotation
3. **RBAC Permissions** – Fine-grained role control

### 🔒 Key Security Features

* Password hashing (bcrypt – 10 rounds)
* JWT expiry: 15 min access / 7 day refresh
* Rate limiting: 100 req/min
* Helmet (CSP, security headers)
* DTO validation with `class-validator`
* MongoDB injection prevention

---

## 📊 Business Logic

### 🏠 Property Lifecycle

```text
DRAFT → [Publish] → PUBLISHED → [Archive] → ARCHIVED
   ↓                       ↓
 [Edit]              [Admin Disable] → DISABLED
```

**Rules enforced at domain level:**

* Published listings are immutable
* Only owners can publish
* Required: title, description, price, location, ≥1 image
* Drafts are private
* Only admins can disable listings

---

## 🧩 Multi-Tenant Data Isolation

All repositories automatically apply tenant filtering:

```ts
private buildTenantQuery(tenantId?: string): any {
  const query = { deletedAt: null };
  if (tenantId) {
    query.tenant = new Types.ObjectId(tenantId);
  }
  return query;
}
```

✔ Prevents data leakage
✔ Clean, reusable architecture

---

## 🚀 API Endpoints

### 🔑 Authentication

```http
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh
```

### 🏘️ Properties (Public)

```http
GET /api/v1/properties
GET /api/v1/properties/:id
```

### 🧑‍💼 Properties (Owner)

```http
POST  /api/v1/properties
GET   /api/v1/properties/my
PATCH /api/v1/properties/:id
POST  /api/v1/properties/:id/publish
POST  /api/v1/properties/:id/images
```

### ❤️ Favorites

```http
POST   /api/v1/properties/:id/favorite
DELETE /api/v1/properties/:id/favorite
GET    /api/v1/properties/favorites
```

### 💬 Contact

```http
POST /api/v1/contact
GET  /api/v1/contact
```

### 👑 Admin

```http
GET  /api/v1/metrics/system
GET  /api/v1/users
POST /api/v1/properties/:id/disable
```

---

## 🏆 Exam Requirements

✅ **All Core Requirements Met**
✅ **Bonus Features Implemented**

Highlights:

* JWT + RBAC
* Multi-tenancy
* Property lifecycle enforcement
* Soft deletes
* Cloudinary image handling
* Pagination & filtering
* Metrics dashboard
* Swagger docs
* Health checks

---

## 🚀 Deployment (Render)

* **Runtime:** Node.js 18
* **Build:** `npm install && npm run build`
* **Start:** `npm run start:prod`
* **Auto Deploy:** Enabled on push

### 🗄️ MongoDB Atlas

* M0 Free Tier
* Daily backups
* Compound indexes (tenant + status)

---

## 🧪 Testing

```bash
# Health check
curl https://property-listing-backend-6fb4.onrender.com/health

# Admin login
curl -X POST https://property-listing-backend-6fb4.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecureAdminPass123"}'
```

---

## 🔗 Resources

* 🌍 Live API: [https://property-listing-backend-6fb4.onrender.com](https://property-listing-backend-6fb4.onrender.com)
* 📘 Swagger Docs: /api/docs
* 🧠 GitHub Repo: [https://github.com/master12-ctr/property-listing-backend](https://github.com/master12-ctr/property-listing-backend)
* 📮 Postman Collection: `/docs`

---

## ⭐ Why This Project Stands Out

* **Enterprise-grade architecture (DDD + Repository Pattern)**
* **Security-first design**
* **Production-ready & scalable**
* **Excellent developer experience**
