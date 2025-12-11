# Weather Dashboard

A **Flask-based weather dashboard** that displays real-time weather conditions and 5-day forecasts for cities worldwide. Features a polished, responsive UI with autocomplete search, favorites management, and unit conversion support.

---

## Features

### Core Functionality

- **Real-time weather data** via Google Weather API v1
- **5-day forecast** with daily high/low temperatures and conditions
- **City search** with live autocomplete using Google Places API
- **Favorites system** supporting up to 10 saved cities (cookie-based storage)
- **Weather icons** dynamically fetched from Google's weather icon library

### User Experience

- **Unit conversion** for temperature (°C/°F) and wind speed (km/h/mph)
- **Keyboard navigation** for search results (arrow keys, enter, escape)
- **Responsive design** that adapts to any device
- **Debounced search** for optimal API usage
- **Persistent preferences** stored in localStorage

### Technical Features

- **CORS-enabled API** for flexible deployment
- **Comprehensive logging** for debugging and monitoring
- **RESTful architecture** with clean separation of concerns
- **Input validation** and sanitization for security
- **Error handling** with user-friendly error messages
- **Proxy endpoint** for weather icons to avoid CORS issues

---

## Tech Stack

**Backend:**

- Python 3.14
- Flask 3.1.2
- Flask-CORS 6.0.1
- python-dotenv 1.2.1
- requests 2.32.5

**Frontend:**

- Vanilla JavaScript (ES6)
- Modern CSS with flexbox/grid
- SVG weather icons

**Testing:**

- pytest 7.0.0
- requests-mock 1.9.0
- pylint 4.0.3
- flake8 7.3.0

**APIs:**

- Google Weather API v1
- Google Places API (Autocomplete & Details)

---

## Project Structure

```none
weather_dashboard/
├── app/
│   ├── __init__.py
│   ├── app.py                  # Flask application & routes
│   ├── config.py               # Configuration classes
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css       # Complete UI styling
│   │   └── js/
│   │       └── app.js          # Frontend logic (521 lines)
│   └── templates/
│       └── index.html          # Main template
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # pytest configuration
│   └── test_api.py             # API tests
├── __main__.py                 # Entry point
├── requirements.txt
├── Dockerfile
├── eslint.config.js
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.10+ (3.14 recommended)
- Google API key with the following APIs enabled:
  - **Weather API v1**
  - **Places API** (Autocomplete)
  - **Places API** (Details)

To enable these APIs:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select an existing one
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable each API listed above
5. Create credentials (API key) under "APIs & Services" > "Credentials"

### Installation

1. **Clone the repository:**

   ```bash
      git clone https://github.com/sdev-256-leah-osborne/weather_dashboard.git
      cd weather_dashboard
   ```

2. **Create and activate a virtual environment:**

   ```bash
      python -m venv venv
      source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**

   ```bash
      pip install -r requirements.txt
   ```

4. **Configure your API key:**

   Create a `.env` file in the project root:

   ```env
      GOOGLE_API_KEY=your_google_api_key_here
   ```

5. **Run the application:**

   ```bash
      python -m weather_dashboard
   ```

      Or using Flask directly:

   ```bash
      flask --app app.app run
   ```

      The application will be available at `http://localhost:5000`

   ---

## Docker Deployment

Build and run using Docker:

```bash
# Build the image
docker build -t weather-dashboard .

# Run the container
docker run -p 8000:8000 --env-file .env weather-dashboard
```

Access the dashboard at `http://localhost:8000`

---

## API Endpoints

### Main Route

- `GET /` - Main dashboard interface

### Weather Endpoints

- `GET /weather/current?lat={lat}&lng={lng}` - Current weather conditions
- `GET /weather/daily?lat={lat}&lng={lng}` - 5-day daily forecast
- `GET /weather/hourly?lat={lat}&lng={lng}` - Hourly forecast

### Places Endpoints

- `GET /autocomplete?query={query}` - City name autocomplete suggestions
- `GET /place_details?place_id={place_id}` - Get location details (name, address, coordinates)

### Favorites Endpoints

- `GET /favorites/get` - Retrieve all saved favorites
- `GET /favorites/get?place_id={id}` - Get specific favorite by place_id
- `POST /favorites/set?place_id={id}&name={name}` - Add or update a favorite city
- `POST /favorites/delete?place_id={id}` - Remove a favorite city
- `POST /favorites/clear` - Clear all favorites

### Icon Proxy Endpoint

- `GET /icon?icon={icon_name}&dark={true|false}` - Fetch weather icon SVG
  - Validates against whitelist of 37 supported weather condition icons
  - Supports dark mode variants

---

## Configuration

Edit `app/config.py` to customize:

**Cookie Settings:**

- `MAX_FAVORITES` - Maximum saved cities (default: 10)
- `MAX_COOKIE_AGE` - Cookie lifetime in seconds (default: 2,592,000 = 30 days)
- `FAV_COOKIE` - Cookie name for favorites (default: "favorites")

**API Settings:**

- `REQUESTS_CONNECT_TIMEOUT` - Connection timeout (default: 5 seconds)
- `REQUESTS_RESPONSE_TIMEOUT` - Response timeout (default: 15 seconds)

**Environment Configs:**

- `DebugConfig` - Development settings (DEBUG=True, port 5000)
- `ProductionConfig` - Production settings (DEBUG=False)

---

## Testing

Run the test suite:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run with verbose output
pytest -v
```

Code quality checks:

```bash
# Linting
pylint app/

# Style checking
flake8 app/
```

---

## Usage Guide

### Searching for Cities

1. Type at least 2 characters in the search bar
2. Select a city from the autocomplete suggestions
3. Weather data loads automatically

**Keyboard shortcuts:**

- `Arrow Down/Up` - Navigate suggestions
- `Enter` - Select highlighted suggestion
- `Escape` - Close suggestions

### Managing Favorites

- Click the star icon next to a city name to save it
- Click a favorite chip to quickly load that city's weather
- Maximum 10 favorites can be saved
- Favorites persist across browser sessions

### Unit Conversion

- Toggle between °C/°F by clicking the temperature toggle (top right)
- Toggle between km/h and mph by clicking the wind toggle (in metrics section)
- Preferences are saved to localStorage

---

## Security Features

- **HTTP-only cookies** prevent XSS attacks on favorites data
- **SameSite=Strict** cookie policy prevents CSRF attacks
- **Secure flag** ensures cookies only sent over HTTPS
- **Input validation** on all API parameters
- **Icon whitelist** prevents arbitrary SVG fetching
- **Request timeouts** prevent hanging connections
- **Error sanitization** avoids exposing internal details

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

Requires JavaScript enabled.

---

## Known Limitations

- No authentication system (suitable for personal/demo use)
- Weather icons require Google's CDN availability
- Favorites limited to 10 cities
- No offline support
- API rate limits apply per Google's policies

---

## Potential Future Enhancements

- [ ] Hourly forecast display in UI
- [ ] Weather alerts and severe weather notifications
- [ ] Geolocation support for automatic local weather
- [ ] Historical weather data and trends
- [ ] Weather radar and satellite imagery
- [ ] Air quality index integration
- [ ] UV index and sunrise/sunset times
- [ ] Multi-language support
- [ ] Dark mode theme toggle
- [ ] Export weather data as CSV/PDF
- [ ] User authentication and cloud-synced favorites
- [ ] Mobile app (React Native/Flutter)

---

## Troubleshooting

**Search returns no results:**

- Verify your Google API key has Places API enabled
- Check browser console for API errors
- Ensure you're connected to the internet

**Weather data not loading:**

- Verify Weather API v1 is enabled for your API key
- Check API quotas in Google Cloud Console
- Review Flask logs for error details

**Favorites not persisting:**

- Check browser settings allow cookies
- Verify cookies aren't being cleared on exit
- Try a different browser

**Icons not displaying:**

- Check browser console for CORS errors
- Verify icon names in frontend match backend whitelist
- Try clearing browser cache

---

## Development

To contribute or modify:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -am 'Add new feature'`)
6. Push to the branch (`git push origin feature/your-feature`)
7. Create a Pull Request

---

## License

This project is provided as-is for educational and personal use.

---

## Credits

- Weather data provided by Google Weather API v1
- Location data from Google Places API
- Weather icons from Google Static Maps Weather Icons
- Built with Flask web framework

---

## Contact

For questions, issues, or suggestions, please open an issue on GitHub.
