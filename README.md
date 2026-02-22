# Turf Booking Application

A comprehensive full-stack web application for booking and managing sports turfs (fields). Built with Spring Boot backend and Angular frontend, this platform enables users to search, book, review, and manage turf venues while providing tools for turf managers and administrators.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database](#database)
- [Configuration](#configuration)
- [Project Architecture](#project-architecture)

## Overview

The Turf Booking Application is a two-tier web application designed to streamline the booking and management of sports turfs. Users can search for available turfs, make bookings, leave reviews, and manage their bookings. Turf managers have dedicated tools to manage their venues, while administrators can moderate content and manage the platform.

## Features

### User Features
- **Authentication & Authorization**
  - User registration and login
  - JWT-based authentication
  - Secure password management
  
- **Turf Discovery & Search**
  - Search and filter turfs by location, amenities, and price
  - View detailed turf information with images
  - Check slot availability in real-time
  
- **Booking Management**
  - Create and manage bookings
  - Book multiple time slots
  - Extend existing bookings
  - Invite friends to bookings
  - Cancel bookings with transaction history
  
- **Reviews & Ratings**
  - Leave reviews and ratings for turfs
  - Add images to reviews
  - View other users' reviews
  
- **Notifications**
  - Real-time booking notifications
  - System notifications for important events
  
- **Support System**
  - Submit support tickets for issues
  - Track ticket status
  - Communicate with support team
  
- **User Profile**
  - Manage personal information
  - View booking history
  - Manage preferences

### Turf Manager Features
- **Turf Management**
  - Create and edit turf listings
  - Manage multiple turfs
  - Upload turf images
  - Set pricing and time slots
  
- **Maintenance Scheduling**
  - Block time slots for maintenance
  - Update maintenance status
  
- **Analytics & Dashboard**
  - View booking statistics
  - Track revenue and bookings

### Admin Features
- **Moderation**
  - Review and moderate user content
  - Manage user accounts
  - Monitor system activity
  
- **User Directory**
  - View all registered users
  - Manage user roles and permissions

## Tech Stack

### Backend
- **Framework:** Spring Boot 4.0.2
- **Language:** Java 17
- **Database:** H2 (In-memory, configurable to other databases)
- **ORM:** Spring Data JPA with Hibernate
- **Security:** Spring Security + JWT (JJWT 0.11.5)
- **Validation:** Spring Validation Framework
- **API Documentation:** SpringDoc OpenAPI 2.6.0
- **Build Tool:** Maven

### Frontend
- **Framework:** Angular 19
- **Language:** TypeScript 5.5
- **Styling:** SCSS
- **HTTP Client:** Angular HttpClient
- **Routing:** Angular Router
- **Forms:** Angular Reactive Forms & Template Forms
- **Testing:** Jasmine & Karma
- **CLI:** Angular CLI 19

### Additional Tools
- Node.js & npm (for frontend development)
- Git for version control

## Project Structure

```
turfBooking/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/turfBooking/
│   │   │   │   ├── config/          # Spring configuration classes
│   │   │   │   ├── controller/      # REST controllers
│   │   │   │   ├── dto/             # Data Transfer Objects
│   │   │   │   ├── model/           # JPA entity models
│   │   │   │   ├── repo/            # Spring Data repositories
│   │   │   │   ├── security/        # JWT and security utilities
│   │   │   │   └── TurfBookingApplication.java
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── test/
│   ├── pom.xml
│   └── mvnw/mvnw.cmd
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                # Services & interceptors
│   │   │   ├── features/            # Feature modules & components
│   │   │   │   ├── admin/
│   │   │   │   ├── auth/
│   │   │   │   ├── bookings/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── landing/
│   │   │   │   ├── layout/
│   │   │   │   ├── manager/
│   │   │   │   ├── notifications/
│   │   │   │   ├── profile/
│   │   │   │   ├── support/
│   │   │   │   └── turfs/
│   │   │   ├── models/              # TypeScript interfaces
│   │   │   ├── app.component.ts
│   │   │   ├── app.routes.ts
│   │   │   └── app.config.ts
│   │   ├── assets/
│   │   ├── environments/
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.scss
│   ├── angular.json
│   ├── tsconfig.json
│   ├── package.json
│   └── proxy.conf.json
│
└── README.md
```

## Prerequisites

### System Requirements
- Windows, macOS, or Linux
- 8GB RAM minimum
- Internet connection for dependency downloads

### Required Software

**For Backend:**
- JDK 17 or higher
- Maven 3.6 or higher (included: mvnw/mvnw.cmd)

**For Frontend:**
- Node.js 18.x or higher
- npm 9.x or higher
- Angular CLI 19

### Verify Installations
```bash
# Check Java version
java -version

# Check Maven version
mvn -version

# Check Node.js and npm
node -v
npm -v

# Check Angular CLI
ng version
```

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/sshyaam/Turf-Booking-Application.git
cd turfBooking
```

### 2. Backend Setup

#### Option A: Using Maven Wrapper (Recommended)
```bash
# Navigate to project root
cd c:/Users/shyaa/Desktop/turfBooking

# Build the project
mvnw clean install

# Run the application
mvnw spring-boot:run
```

#### Option B: Using Installed Maven
```bash
maven clean install
maven spring-boot:run
```

The backend will start on **http://localhost:8080**

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will start on **http://localhost:4200** and automatically proxy API calls to the backend.

## Running the Application

### Starting Both Services

**Terminal 1 - Backend:**
```bash
cd c:/Users/shyaa/Desktop/turfBooking
mvnw spring-boot:run
# Backend runs on http://localhost:8080
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# Frontend runs on http://localhost:4200
```

### Access the Application
- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:8080/api
- **API Documentation (Swagger):** http://localhost:8080/swagger-ui.html
- **H2 Database Console:** http://localhost:8080/h2-console

### Default Database Credentials (H2)
- **JDBC URL:** jdbc:h2:mem:turfdb
- **Driver Class:** org.h2.Driver
- **Username:** sa
- **Password:** (empty)

## API Documentation

### Swagger UI
The application includes interactive API documentation powered by SpringDoc OpenAPI.

**Access Swagger UI:** http://localhost:8080/swagger-ui.html

### Main API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh JWT token

#### Turfs
- `GET /api/turfs` - Get all turfs
- `GET /api/turfs/{id}` - Get turf details
- `POST /api/turfs` - Create new turf (manager)
- `PUT /api/turfs/{id}` - Update turf
- `DELETE /api/turfs/{id}` - Delete turf
- `GET /api/turfs/search` - Search turfs

#### Bookings
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/{id}` - Get booking details
- `PUT /api/bookings/{id}` - Update booking
- `DELETE /api/bookings/{id}` - Cancel booking
- `POST /api/bookings/{id}/extend` - Extend booking
- `POST /api/bookings/{id}/invite` - Invite friends

#### Reviews
- `GET /api/reviews` - Get reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/{id}` - Get review details
- `PUT /api/reviews/{id}` - Update review
- `DELETE /api/reviews/{id}` - Delete review

#### Users
- `GET /api/users/{id}` - Get user profile
- `PUT /api/users/{id}` - Update profile
- `GET /api/users` - Get all users (admin)

#### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/{id}` - Mark as read

#### Support
- `GET /api/support` - Get support tickets
- `POST /api/support` - Create ticket
- `PUT /api/support/{id}` - Update ticket status

#### Maintenance
- `GET /api/maintenance` - Get maintenance blocks
- `POST /api/maintenance` - Create maintenance block
- `PUT /api/maintenance/{id}` - Update maintenance

## Database

### Default Configuration
The application uses **H2 In-Memory Database** for development/testing.

**Current Configuration:**
```properties
spring.datasource.url=jdbc:h2:mem:turfdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
spring.jpa.hibernate.ddl-auto=update
```

### Switching to Other Databases

#### PostgreSQL Example
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/turfdb
spring.datasource.driverClassName=org.postgresql.Driver
spring.datasource.username=postgres
spring.datasource.password=yourpassword
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
```

#### MySQL Example
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/turfdb
spring.datasource.driverClassName=com.mysql.cj.jdbc.Driver
spring.datasource.username=root
spring.datasource.password=yourpassword
spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect
```

Add required dependencies to `pom.xml`:
```xml
<!-- For PostgreSQL -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- For MySQL -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>8.x.x</version>
</dependency>
```

## Configuration

### Backend Configuration ([application.properties](src/main/resources/application.properties))

```properties
# Application name
spring.application.name=turf-booking

# JWT Configuration
app.jwt.secret=MAIN-TURF-SECRET-KEY-FOR-JWT-SECRET    # Change in production
app.jwt.expiration=3600000                             # 1 hour in milliseconds

# CORS Configuration
app.cors.allowed-origins=http://localhost:4200

# H2 Console
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# API Documentation
springdoc.api-docs.enabled=true
springdoc.swagger-ui.path=/swagger-ui.html
```

### Frontend Configuration

**Proxy Configuration** ([proxy.conf.json](frontend/proxy.conf.json)):
Routes all API calls from frontend to backend.

**Environment Configuration** ([environment.ts](frontend/src/environments/environment.ts)):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
```

## Project Architecture

### Backend Architecture

```
REST API (Controllers)
    ↓
DTOs (Data Transfer Objects)
    ↓
Services (Business Logic)
    ↓
Repositories (Data Access)
    ↓
Entity Models (JPA)
    ↓
Database
```

### Frontend Architecture

```
Components (UI)
    ↓
Services (HTTP Calls)
    ↓
Models/Interfaces (TypeScript)
    ↓
Backend API
```

### Security Flow

```
User Login
    ↓
Authentication (Spring Security)
    ↓
JWT Token Generated
    ↓
Token sent to Frontend
    ↓
Stored in Session/Local Storage
    ↓
HTTP Interceptor adds token to requests
    ↓
Backend validates token (JwtAuthFilter)
    ↓
Authorized requests proceed
```

## Development Tips

### Backend
- Use the Swagger UI to test endpoints during development
- Check H2 console at http://localhost:8080/h2-console for database inspection
- Review logs in the console for debugging
- Run `mvnw test` to execute unit tests

### Frontend
- Use Angular DevTools browser extension for debugging
- Check browser console for errors
- Use Chrome DevTools Network tab to inspect API calls
- Run `npm test` to execute unit tests with Karma

## Building for Production

### Backend
```bash
mvnw clean package -DskipTests
# Creates: target/turfBooking-0.0.1-SNAPSHOT.jar
```

### Frontend
```bash
cd frontend
ng build --configuration production
# Creates: dist/ directory
```

## Troubleshooting

### Port Already in Use
```bash
# Windows - Kill process on port 8080 (backend)
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Kill process on port 4200 (frontend)
netstat -ano | findstr :4200
taskkill /PID <PID> /F
```

### Dependencies Not Installing
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Clear Maven cache
mvnw clean
rm -rf .m2/repository
mvnw install
```

### CORS Errors
Check `app.cors.allowed-origins` in application.properties matches your frontend URL.

### JWT Token Expired
Tokens expire after 1 hour. User needs to login again. Configure in application.properties: `app.jwt.expiration`

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Contact & Support

For issues, questions, or suggestions, please create an issue on the GitHub repository.

**Repository:** https://github.com/sshyaam/Turf-Booking-Application

---

**Happy Booking! ⚽🏏🎾**
