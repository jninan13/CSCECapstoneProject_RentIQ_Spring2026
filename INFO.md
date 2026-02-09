# RentIQ - Investment Property Analysis Platform

A full-stack web application for beginner investors to identify profitable real estate properties in their area.

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Hosting**: AWS Lambda (serverless)

## Features

1. **Property Search**: Search properties by zip code with advanced filters (price, size, radius, etc.)
2. **Profitability Scoring**: Each property gets an algorithmic score (0-100) based on investment potential
3. **Authentication**: Google OAuth and email/password registration
4. **User Profiles**: Save personal details (DOB, address, etc.)
5. **Favorites**: Save and manage favorite properties

## Project Structure

```
test_app/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Business logic (security, scoring)
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── utils/    # Utilities (cache, etc.)
│   └── tests/        # Backend tests
├── frontend/         # React application
│   └── src/
│       ├── components/
│       ├── context/
│       └── services/
└── docker-compose.yml
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker & Docker Compose

### 1. Clone and Setup Environment

```bash
cd test_app
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Database Services

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis containers.

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 5. Seed Sample Data (Optional)

Create a Python script to add sample properties:

```python
# backend/seed_data.py
from app.database import SessionLocal
from app.models import Property
from app.core.scoring import calculate_profitability_score, estimate_monthly_rent
from decimal import Decimal

db = SessionLocal()

properties_data = [
    {
        "address": "123 Main St",
        "city": "Los Angeles",
        "state": "CA",
        "zip_code": "90210",
        "price": Decimal("450000"),
        "size_sqft": 1800,
        "bedrooms": 3,
        "bathrooms": 2.0,
        "property_type": "single_family",
        "year_built": 2015,
        "lat": 34.0901,
        "lng": -118.4065
    },
    # Add more properties...
]

for prop_data in properties_data:
    estimated_rent = estimate_monthly_rent(
        prop_data["price"],
        prop_data["size_sqft"],
        prop_data["bedrooms"]
    )
    
    score = calculate_profitability_score(
        price=prop_data["price"],
        size_sqft=prop_data["size_sqft"],
        estimated_rent=estimated_rent,
        year_built=prop_data.get("year_built"),
        property_type=prop_data["property_type"]
    )
    
    property_obj = Property(
        **prop_data,
        profitability_score=score,
        estimated_rent=estimated_rent
    )
    db.add(property_obj)

db.commit()
print("Sample data created!")
```

Run: `python seed_data.py`

## Running Tests

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Frontend Tests (if implemented)

```bash
cd frontend
npm test
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

## Deployment to AWS Lambda

### Using Mangum

The backend is Lambda-ready via the Mangum adapter:

```python
# app/main.py
from mangum import Mangum
handler = Mangum(app)
```

### Deployment Steps

1. **Install dependencies to a package directory**:
   ```bash
   pip install -r requirements.txt -t package/
   ```

2. **Create deployment package**:
   ```bash
   cd package
   zip -r ../deployment.zip .
   cd ../app
   zip -g ../deployment.zip -r .
   ```

3. **Deploy to Lambda**:
   - Upload `deployment.zip` to AWS Lambda
   - Set handler to `app.main.handler`
   - Configure environment variables
   - Set up API Gateway

4. **Database**: Use AWS RDS for PostgreSQL
5. **Cache**: Use AWS ElastiCache for Redis

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

### Database Connection Issues
```bash
# Check if containers are running
docker-compose ps

# View logs
docker-compose logs postgres
```

### Redis Connection Issues
```bash
# Test Redis connection
docker-compose exec redis redis-cli ping
```

### Port Conflicts
If ports 5432, 6379, 8000, or 3000 are in use, modify the ports in `docker-compose.yml` or your run commands.

## License

MIT

## Contact

For questions or support, please open an issue in the repository.
