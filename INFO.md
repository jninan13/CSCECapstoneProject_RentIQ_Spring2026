# RentIQ - Investment Property Analysis Platform

A full-stack web application for beginner investors to identify profitable real estate properties in their area.

## Tech Stack

- **Frontend**: React.js with Vite and Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Containerization**: Docker & Docker Compose

## Features

1. **Property Search**: Search properties by zip code with advanced filters (price, size, radius, etc.)
2. **Profitability Scoring**: Each property gets an algorithmic score (0-100) based on investment potential
3. **Authentication**: Google OAuth and email/password registration
4. **User Profiles**: Save personal details (DOB, address, etc.)
5. **Favorites**: Save and manage favorite properties

## Project Structure

```
CSCECapstoneProject_RentIQ_Spring2026/
├── backend/           # FastAPI application
│   ├── Dockerfile
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Business logic (security, scoring)
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── utils/    # Utilities (cache, etc.)
│   └── tests/        # Backend tests
├── frontend/         # React application (Vite)
│   ├── Dockerfile
│   └── src/
│       ├── components/
│       ├── context/
│       └── services/
└── docker-compose.yml
```

## Setup Instructions

### Prerequisites

- Docker & Docker Compose
- Git

### 1. Clone and Setup Environment

```bash
git clone <repository-url>
cd CSCECapstoneProject_RentIQ_Spring2026
# Copy the environment template if one exists
# cp .env.example .env
```

### 2. Start the Application

The entire application stack (Frontend, Backend, PostgreSQL, and Redis) is containerized and can be started with a single command:

```bash
docker compose up --build -d
```

### 3. Access the Application

- **Frontend**: `http://localhost:5173`
- **Backend API API**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs`

### 4. Seed Sample Data (Optional)

To add sample properties to your database, you can run the seed script inside the backend container:

```bash
docker exec -it rentiq_backend python seed_data.py
```
*(Make sure `seed_data.py` exists in the backend root)*

## Running Tests

To run tests, you can execute pytest inside the backend container:

```bash
docker exec -it rentiq_backend pytest tests/ -v
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user

### Properties
- `GET /api/properties` - Search properties (with filters)
- `GET /api/properties/{id}` - Get property details

### User Profile
- `GET /api/users/profile` - Get profile
- `PUT /api/users/profile` - Update profile

### Favorites
- `GET /api/favorites` - Get favorites
- `POST /api/favorites` - Add favorite
- `DELETE /api/favorites/{id}` - Remove favorite

## Profitability Scoring Algorithm

Properties are scored 0-100 based on:

1. **Price-to-Rent Ratio (40%)**: Lower is better (ideal: 100-150x monthly rent)
2. **Price per Square Foot (30%)**: Compared to national average (~$200/sqft)
3. **Property Age (15%)**: Newer properties score higher
4. **Property Type (15%)**: Single-family homes score highest

## Security Considerations

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Short-lived access tokens (30 min default)
- **Input Validation**: Pydantic schemas validate all inputs
- **SQL Injection**: Protected via SQLAlchemy ORM
- **CORS**: Configured for specific origins only

## Future Enhancements

- Real estate API integration (Zillow, Redfin)
- Machine learning for score prediction
- Property comparison tool
- Email notifications for new listings
- Mortgage calculator
- Market trend analysis
- Mobile app (React Native)

## Troubleshooting

### Check Container Status
```bash
docker compose ps
```

### View Logs
```bash
# View all logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Database or Redis Connection Issues
If the backend fails to connect to the database or Redis, ensure that the respective containers are healthy:
```bash
docker compose ps
# Check if postgres and redis show as (healthy)
```

### Port Conflicts
If ports 5432, 6379, 8000, or 5173 are in use on your host machine, modify the port mappings in `docker-compose.yml` or stop the conflicting services before running `docker compose up`.

## License

MIT

## Contact

For questions or support, please open an issue in the repository.
