## Technical Decisions

### Backend Framework: NestJS
- Opinionated structure for maintainability
- Built-in TypeScript support
- Modular architecture for scalability
- Extensive ecosystem (passport, mongoose, etc.)

### Database: MongoDB
- Flexible schema for property metadata
- Geospatial queries for location-based filtering
- Good for multi-tenant data isolation

### State Management: [Choose based on frontend]
- TanStack Query: Automatic caching/synchronization

### Access Control:
- JWT-based authentication
- Permission-based RBAC with decorators
- Tenant isolation via middleware

### Hardest Challenge: Multi-tenant data isolation
- Implemented tenant middleware for request scoping
- Repository pattern with tenant-aware queries
- Ensuring data never leaks between tenants

### Scalability Concerns:
- Image uploads could strain server
- Consider CDN for images
- Database indexing critical for performance