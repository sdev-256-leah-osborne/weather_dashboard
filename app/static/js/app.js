const DEBOUNCE_DELAY = 300;
let debounceTimer = null;
let currentCity = null;

const weatherEmojis = {
    'clear': '☀️',
    'sunny': '☀️',
    'partly_cloudy': '⛅',
    'cloudy': '☁️',
    'overcast': '☁️',
    'rain': '🌧️',
    'light_rain': '🌦️',
    'heavy_rain': '🌧️',
    'thunderstorm': '⛈️',
    'snow': '❄️',
    'fog': '🌫️',
    'mist': '🌫️',
    'haze': '🌫️',
    'wind': '💨',
    'default': '🌡️'
};

document.addEventListener('DOMContentLoaded', () => {
    initializeSearchBar();
    loadFavorites();
});

function initializeSearchBar() {
    const searchInput = document.getElementById('cityInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        if (query.length < 2) {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(() => {
            fetchAutocomplete(query);
        }, DEBOUNCE_DELAY);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-section')) {
            searchResults.style.display = 'none';
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        const items = searchResults.querySelectorAll('.search-result-item');
        const activeItem = searchResults.querySelector('.search-result-item.active');
        let activeIndex = Array.from(items).indexOf(activeItem);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activeIndex < items.length - 1) {
                items[activeIndex]?.classList.remove('active');
                items[activeIndex + 1]?.classList.add('active');
            } else if (activeIndex === -1 && items.length > 0) {
                items[0].classList.add('active');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeIndex > 0) {
                items[activeIndex]?.classList.remove('active');
                items[activeIndex - 1]?.classList.add('active');
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeItem) {
                activeItem.click();
            } else if (items.length > 0) {
                items[0].click();
            }
        } else if (e.key === 'Escape') {
            searchResults.style.display = 'none';
        }
    });
}

async function fetchAutocomplete(query) {
    const searchResults = document.getElementById('searchResults');
    
    try {
        const response = await fetch(`/autocomplete?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        console.log('Autocomplete response:', data);

        if (data.error) {
            console.error('API Error:', data.error);
            searchResults.innerHTML = '<div class="search-error">Error fetching results</div>';
            searchResults.style.display = 'block';
            return;
        }

        renderSearchResults(data.predictions || []);
    } catch (error) {
        console.error('Fetch error:', error);
        searchResults.innerHTML = '<div class="search-error">Connection error</div>';
        searchResults.style.display = 'block';
    }
}

function renderSearchResults(predictions) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    if (predictions.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">No cities found</div>';
        searchResults.style.display = 'block';
        return;
    }

    predictions.forEach((place, index) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.setAttribute('data-place-id', place.place_id);
        
        item.innerHTML = `
            <span class="result-icon">📍</span>
            <span class="result-text">${place.description}</span>
        `;

        item.addEventListener('click', () => selectCity(place.place_id, place.description));
        
        item.addEventListener('mouseenter', () => {
            searchResults.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });

        searchResults.appendChild(item);
    });

    searchResults.style.display = 'block';
}

async function selectCity(placeId, name) {
    const searchInput = document.getElementById('cityInput');
    const searchResults = document.getElementById('searchResults');


    searchInput.value = name;
    searchResults.style.display = 'none';

    try {

        const detailsResponse = await fetch(`/place_details?place_id=${encodeURIComponent(placeId)}`);
        const details = await detailsResponse.json();

        console.log('Place details:', details);

        if (details.error) {
            console.error('Place details error:', details.error);
            showError('Could not get city details');
            return;
        }

        const lat = details.geometry?.location?.lat;
        const lng = details.geometry?.location?.lng;

        if (!lat || !lng) {
            showError('Invalid location data');
            return;
        }

        currentCity = {
            place_id: placeId,
            name: details.name || name,
            lat: lat,
            lng: lng
        };

        await fetchWeather(lat, lng);
        await fetchForecast(lat, lng);

    } catch (error) {
        console.error('Error selecting city:', error);
        showError('Failed to load weather data');
    }
}

async function fetchWeather(lat, lng) {
    try {
        const response = await fetch(`/weather/current?lat=${lat}&lng=${lng}`);
        const data = await response.json();

        console.log('Current weather:', data);

        if (data.error) {
            console.error('Weather error:', data.error);
            showError('Could not fetch weather');
            return;
        }

        updateCurrentWeather(data);
    } catch (error) {
        console.error('Weather fetch error:', error);
        showError('Connection error');
    }
}

async function fetchForecast(lat, lng) {
    try {
        const response = await fetch(`/weather/daily?lat=${lat}&lng=${lng}`);
        const data = await response.json();

        console.log('Forecast data:', data); // Debug logging

        if (data.error) {
            console.error('Forecast error:', data.error);
            return;
        }

        updateForecast(data);
    } catch (error) {
        console.error('Forecast fetch error:', error);
    }
}

function updateCurrentWeather(data) {
    const weatherCard = document.getElementById('currentWeather');
    
    const temp = data.temperature?.degrees ?? '--';
    const condition = data.condition?.description ?? 'No data';
    const conditionCode = data.condition?.type?.toLowerCase() ?? 'default';
    const humidity = data.relativeHumidity ?? '--';
    const windSpeed = data.wind?.speed?.value ?? '--';
    const windUnit = data.wind?.speed?.unit ?? 'km/h';

    const emoji = getWeatherEmoji(conditionCode);

    weatherCard.querySelector('.weather-city').textContent = currentCity?.name ?? 'Unknown';
    weatherCard.querySelector('.weather-icon').textContent = emoji;
    weatherCard.querySelector('.temperature').textContent = `${temp}°C`;
    weatherCard.querySelector('.condition').textContent = condition;

    const metrics = document.getElementById('metrics');
    const metricValues = metrics.querySelectorAll('.metric-value');
    metricValues[0].textContent = `${humidity}%`;
    metricValues[1].textContent = `${windSpeed} ${windUnit}`;
}

function updateForecast(data) {
    const forecastContainer = document.getElementById('forecastContainer');
    const forecastGrid = document.getElementById('forecast');
    
    const days = data.forecastDays || data.days || [];
    
    if (days.length === 0) {
        forecastContainer.style.display = 'none';
        return;
    }

    forecastGrid.innerHTML = '';

    const forecastDays = days.slice(0, 5);

    forecastDays.forEach((day, index) => {
        const date = day.date ? new Date(day.date.year, day.date.month - 1, day.date.day) : new Date();
        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const highTemp = day.daytimeForecast?.temperature?.degrees ?? day.maxTemperature?.degrees ?? '--';
        const lowTemp = day.nighttimeForecast?.temperature?.degrees ?? day.minTemperature?.degrees ?? '--';
        const conditionCode = day.daytimeForecast?.condition?.type?.toLowerCase() ?? 'default';
        const emoji = getWeatherEmoji(conditionCode);

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">${emoji}</div>
            <div class="forecast-temps">
                <span class="temp-high">${highTemp}°</span>
                <span class="temp-low">${lowTemp}°</span>
            </div>
        `;

        forecastGrid.appendChild(card);
    });

    forecastContainer.style.display = 'block';
}

function getWeatherEmoji(conditionCode) {
    for (const [key, emoji] of Object.entries(weatherEmojis)) {
        if (conditionCode.includes(key)) {
            return emoji;
        }
    }
    return weatherEmojis.default;
}

function showError(message) {
    console.error('Error:', message);
    alert(message); // Simple fallback
}

async function loadFavorites() {
    try {
        const response = await fetch('/favorites/get');
        const favorites = await response.json();

        console.log('Favorites:', favorites); // Debug logging

        if (Array.isArray(favorites)) {
            renderFavorites(favorites);
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}
// thonk
function renderFavorites(favorites) {
    const favoritesContainer = document.getElementById('favorites');
    favoritesContainer.innerHTML = '';

    if (favorites.length === 0) {
        favoritesContainer.innerHTML = '<div class="no-favorites">No favorite cities yet</div>';
        return;
    }

    favorites.forEach(fav => {
        const chip = document.createElement('div');
        chip.className = 'favorite-chip';
        chip.innerHTML = `
            <span class="favorite-name" data-place-id="${fav.place_id}">${fav.name}</span>
            <button class="favorite-remove" data-place-id="${fav.place_id}" title="Remove">×</button>
        `;

        // Click on name to select city
        chip.querySelector('.favorite-name').addEventListener('click', () => {
            selectCity(fav.place_id, fav.name);
        });

        // Click on X to remove
        chip.querySelector('.favorite-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavorite(fav.place_id);
        });

        favoritesContainer.appendChild(chip);
    });

    if (currentCity) {
        const addBtn = document.createElement('button');
        addBtn.className = 'add-favorite-btn';
        addBtn.textContent = '+ Add Current';
        addBtn.addEventListener('click', () => addFavorite(currentCity.place_id, currentCity.name));
        favoritesContainer.appendChild(addBtn);
    }
}

async function addFavorite(placeId, name) {
    try {
        const response = await fetch(`/favorites/set?place_id=${encodeURIComponent(placeId)}&name=${encodeURIComponent(name)}`, {
            method: 'POST'
        });
        const result = await response.json();

        console.log('Add favorite result:', result); // Debug logging

        if (result.error) {
            showError(result.error);
            return;
        }

        // Reload favorites list
        loadFavorites();
    } catch (error) {
        console.error('Error adding favorite:', error);
        showError('Could not add favorite');
    }
}

async function removeFavorite(placeId) {
    try {
        const response = await fetch(`/favorites/delete?place_id=${encodeURIComponent(placeId)}`, {
            method: 'POST'
        });
        const result = await response.json();

        console.log('Remove favorite result:', result); // Debug logging

        if (result.error) {
            showError(result.error);
            return;
        }

        // Reload favorites list
        loadFavorites();
    } catch (error) {
        console.error('Error removing favorite:', error);
        showError('Could not remove favorite');
    }
}
