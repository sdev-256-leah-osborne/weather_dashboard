const DEBOUNCE_DELAY = 300;
let debounceTimer = null;
let currentCity = null;
let currentFavorites = [];
let currentWeatherData = null;
let currentForecastData = null;
let isDaytime = null;
let temperatureUnit = localStorage.getItem('tempUnit') || 'C';
let windUnit = localStorage.getItem('windUnit') || 'km/h';

const WEATHER_ICON_DAY_MAP = {
    'CLEAR': 'sunny',
    'MOSTLY_CLEAR': 'mostly_sunny',
    'PARTLY_CLOUDY': 'partly_cloudy',
    'MOSTLY_CLOUDY': 'mostly_cloudy',
    'CLOUDY': 'cloudy',
    'WINDY': 'windy_breezy',
    'WIND_AND_RAIN': 'showers',
    'LIGHT_RAIN_SHOWERS': 'drizzle',
    'CHANCE_OF_SHOWERS': 'drizzle',
    'SCATTERED_SHOWERS': 'scattered_showers',
    'RAIN_SHOWERS': 'showers',
    'HEAVY_RAIN_SHOWERS': 'heavy',
    'LIGHT_TO_MODERATE_RAIN': 'showers',
    'MODERATE_TO_HEAVY_RAIN': 'heavy',
    'RAIN': 'showers',
    'LIGHT_RAIN': 'drizzle',
    'HEAVY_RAIN': 'heavy',
    'RAIN_PERIODICALLY_HEAVY': 'heavy',
    'LIGHT_SNOW_SHOWERS': 'flurries',
    'CHANCE_OF_SNOW_SHOWERS': 'snow_showers',
    'SCATTERED_SNOW_SHOWERS': 'scattered_snow',
    'SNOW_SHOWERS': 'scattered_snow',
    'HEAVY_SNOW_SHOWERS': 'heavy_snow',
    'LIGHT_TO_MODERATE_SNOW': 'snow_showers',
    'MODERATE_TO_HEAVY_SNOW': 'heavy_snow',
    'SNOW': 'snow_showers',
    'LIGHT_SNOW': 'flurries',
    'HEAVY_SNOW': 'heavy_snow',
    'SNOWSTORM': 'snow_showers',
    'SNOW_PERIODICALLY_HEAVY': 'heavy_snow',
    'HEAVY_SNOW_STORM': 'heavy_snow',
    'BLOWING_SNOW': 'blowing_snow',
    'RAIN_AND_SNOW': 'wintry_mix',
    'WINTRY_MIX': 'wintry_mix',
    'HAIL': 'sleet_hail',
    'HAIL_SHOWERS': 'wintry_mix',
    'SLEET': 'sleet',
    'FREEZING_RAIN': 'freezing_rain',
    'FREEZING_DRIZZLE': 'freezing_drizzle',
    'THUNDERSTORM': 'strong_tstorms',
    'THUNDERSHOWER': 'strong_tstorms',
    'LIGHT_THUNDERSTORM_RAIN': 'strong_tstorms',
    'SCATTERED_THUNDERSTORMS': 'isolated_tstorms',
    'HEAVY_THUNDERSTORM': 'strong_tstorms',
    'DEFAULT': 'cloudy'
};

const WEATHER_ICON_NIGHT_MAP = {
    'CLEAR': 'clear',
    'MOSTLY_CLEAR': 'mostly_clear',
    'PARTLY_CLOUDY': 'partly_clear',
    'MOSTLY_CLOUDY': 'mostly_cloudy_night',
    'CLOUDY': 'cloudy',
    'WINDY': 'clear',
    'WIND_AND_RAIN': 'showers',
    'LIGHT_RAIN_SHOWERS': 'drizzle',
    'CHANCE_OF_SHOWERS': 'drizzle',
    'SCATTERED_SHOWERS': 'scattered_showers',
    'RAIN_SHOWERS': 'showers',
    'HEAVY_RAIN_SHOWERS': 'heavy',
    'LIGHT_TO_MODERATE_RAIN': 'showers',
    'MODERATE_TO_HEAVY_RAIN': 'heavy',
    'RAIN': 'showers',
    'LIGHT_RAIN': 'drizzle',
    'HEAVY_RAIN': 'heavy',
    'RAIN_PERIODICALLY_HEAVY': 'heavy',
    'LIGHT_SNOW_SHOWERS': 'flurries',
    'CHANCE_OF_SNOW_SHOWERS': 'snow_showers',
    'SCATTERED_SNOW_SHOWERS': 'scattered_snow',
    'SNOW_SHOWERS': 'scattered_snow',
    'HEAVY_SNOW_SHOWERS': 'heavy_snow',
    'LIGHT_TO_MODERATE_SNOW': 'snow_showers',
    'MODERATE_TO_HEAVY_SNOW': 'heavy_snow',
    'SNOW': 'snow_showers',
    'LIGHT_SNOW': 'flurries',
    'HEAVY_SNOW': 'heavy_snow',
    'SNOWSTORM': 'snow_showers',
    'SNOW_PERIODICALLY_HEAVY': 'heavy_snow',
    'HEAVY_SNOW_STORM': 'heavy_snow',
    'BLOWING_SNOW': 'blowing_snow',
    'RAIN_AND_SNOW': 'wintry_mix',
    'WINTRY_MIX': 'wintry_mix',
    'HAIL': 'sleet_hail',
    'HAIL_SHOWERS': 'wintry_mix',
    'SLEET': 'sleet',
    'FREEZING_RAIN': 'freezing_rain',
    'FREEZING_DRIZZLE': 'freezing_drizzle',
    'THUNDERSTORM': 'strong_tstorms',
    'THUNDERSHOWER': 'strong_tstorms',
    'LIGHT_THUNDERSTORM_RAIN': 'strong_tstorms',
    'SCATTERED_THUNDERSTORMS': 'isolated_tstorms',
    'HEAVY_THUNDERSTORM': 'strong_tstorms',
    'DEFAULT': 'cloudy'
};

function getWeatherIconUrl(weatherCondition, darkMode = false, useDay = true) {
    const conditionType = weatherCondition?.type || 'DEFAULT';
    const iconMap = useDay ? WEATHER_ICON_DAY_MAP : WEATHER_ICON_NIGHT_MAP;
    const iconName = iconMap[conditionType] || 'cloudy';

    return `/icon?icon=${iconName}${darkMode ? '&dark=true' : ''}`;
}

function createWeatherIconElement(weatherCondition, altText = 'Weather', className = 'weather-icon-img', darkMode = false, useDay = true) {
    const img = document.createElement('img');
    img.src = getWeatherIconUrl(weatherCondition, darkMode, useDay);
    img.alt = altText;
    img.className = className;
    img.onerror = function () {
        this.src = `/icon?icon=cloudy`;
    };
    return img;
}

document.addEventListener('DOMContentLoaded', () => {
    initializeSearchBar();
    initializeTemperatureToggle();
    initializeWindToggle();
    initializeFavoriteButton();
    loadFavorites();
});

function initializeTemperatureToggle() {
    const toggle = document.getElementById('tempToggle');
    if (!toggle) return;
    updateToggleUI();
    toggle.addEventListener('click', () => {
        temperatureUnit = temperatureUnit === 'C' ? 'F' : 'C';
        localStorage.setItem('tempUnit', temperatureUnit);
        updateToggleUI();
        if (currentWeatherData) {
            updateCurrentWeather(currentWeatherData);
        }
        if (currentForecastData) {
            updateForecast(currentForecastData);
        }
    });
}

function updateToggleUI() {
    const celsiusBtn = document.querySelector('.temp-unit-c');
    const fahrenheitBtn = document.querySelector('.temp-unit-f');
    if (!celsiusBtn || !fahrenheitBtn) return;
    if (temperatureUnit === 'C') {
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
    } else {
        celsiusBtn.classList.remove('active');
        fahrenheitBtn.classList.add('active');
    }
}

function convertTemp(celsius) {
    if (celsius === '--' || celsius === null || celsius === undefined) {
        return '--';
    }
    const temp = parseFloat(celsius);
    if (isNaN(temp)) return '--';
    if (temperatureUnit === 'F') {
        return ((temp * 9 / 5) + 32).toFixed(1);
    }
    return temp.toFixed(1);
}

function getTempSymbol() {
    return temperatureUnit === 'C' ? '°C' : '°F';
}

function initializeWindToggle() {
    const toggle = document.getElementById('windToggle');
    if (!toggle) return;
    updateWindToggleUI();
    toggle.addEventListener('click', () => {
        windUnit = windUnit === 'km/h' ? 'mph' : 'km/h';
        localStorage.setItem('windUnit', windUnit);
        updateWindToggleUI();
        if (currentWeatherData) {
            updateCurrentWeather(currentWeatherData);
        }
    });
}

function updateWindToggleUI() {
    const kmBtn = document.querySelector('.wind-unit-km');
    const miBtn = document.querySelector('.wind-unit-mi');
    if (!kmBtn || !miBtn) return;
    if (windUnit === 'km/h') {
        kmBtn.classList.add('active');
        miBtn.classList.remove('active');
    } else {
        kmBtn.classList.remove('active');
        miBtn.classList.add('active');
    }
}

function convertWindSpeed(kmh) {
    if (kmh === '--' || kmh === null || kmh === undefined) {
        return '--';
    }
    const speed = parseFloat(kmh);
    if (isNaN(speed)) return '--';
    if (windUnit === 'mph') {
        return (speed * 0.621371).toFixed(1);
    }
    return speed.toFixed(1);
}

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
        updateFavoriteButton();
        await fetchWeather(lat, lng);
        await fetchForecast(lat, lng);
    } catch (error) {
        console.error('Error selecting city:', error);
        showError('Failed to load weather data');
    }
    loadFavorites();
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
        console.log('Forecast data:', data);
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
    currentWeatherData = data;
    isDaytime = data.isDaytime;
    const weatherCard = document.getElementById('currentWeather');
    const tempRaw = data.temperature?.degrees ?? '--';
    const temp = convertTemp(tempRaw);
    const weatherCondition = data.weatherCondition || data.condition;
    const conditionType = weatherCondition?.type || '';
    const condition = formatConditionType(conditionType) || 'No data';
    const humidity = data.relativeHumidity ?? '--';
    const windSpeedRaw = data.wind?.speed?.value ?? '--';
    const windSpeedConverted = convertWindSpeed(windSpeedRaw);
    weatherCard.querySelector('.weather-city').textContent = currentCity?.name ?? 'Unknown';
    const iconContainer = weatherCard.querySelector('.weather-icon');
    iconContainer.innerHTML = '';
    const iconImg = createWeatherIconElement(weatherCondition, condition, 'weather-icon-img', false, isDaytime);
    iconContainer.appendChild(iconImg);
    weatherCard.querySelector('.temperature').textContent = `${temp}${getTempSymbol()}`;
    weatherCard.querySelector('.condition').textContent = condition;
    const metrics = document.getElementById('metrics');
    const metricValues = metrics.querySelectorAll('.metric-value');
    metricValues[0].textContent = `${humidity}%`;
    metricValues[1].textContent = `${windSpeedConverted} ${windUnit}`;
}

function formatConditionType(type) {
    if (!type) return '';
    return type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function updateForecast(data) {
    currentForecastData = data;
    const forecastContainer = document.getElementById('forecastContainer');
    const forecastGrid = document.getElementById('forecast');
    const days = data.forecastDays || data.days || [];
    if (days.length === 0) {
        forecastContainer.style.display = 'none';
        return;
    }
    forecastGrid.innerHTML = '';
    const forecastDays = days.slice(0, 5);
    const unitSymbol = temperatureUnit;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    forecastDays.forEach((day, index) => {
        let dayName;
        if (index === 0) {
            dayName = 'Today';
        } else {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + index);
            dayName = futureDate.toLocaleDateString('en-US', {weekday: 'short'});
        }
        const highTempRaw = day.daytimeForecast?.temperature?.degrees ?? day.maxTemperature?.degrees ?? '--';
        const lowTempRaw = day.nighttimeForecast?.temperature?.degrees ?? day.minTemperature?.degrees ?? '--';
        const highTemp = convertTemp(highTempRaw);
        const lowTemp = convertTemp(lowTempRaw);
        const weatherCondition = day.daytimeForecast?.weatherCondition || day.daytimeForecast?.condition;
        const conditionDescription = weatherCondition?.description || 'Weather';
        const iconUrl = getWeatherIconUrl(weatherCondition, darkMode = false, useDay = isDaytime);
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">
                <img src="${iconUrl}" alt="${conditionDescription}" class="forecast-icon-img" onerror="this.src='/icon?icon=cloudy'">
            </div>
            <div class="forecast-temps">
                <span class="temp-high">${highTemp}°<span class="temp-unit">${unitSymbol}</span></span>
                <span class="temp-low">${lowTemp}°<span class="temp-unit">${unitSymbol}</span></span>
            </div>
        `;
        forecastGrid.appendChild(card);
    });
    forecastContainer.style.display = 'block';
}

function showError(message) {
    console.error('Error:', message);
    alert(message);
}

async function loadFavorites() {
    try {
        const response = await fetch('/favorites/get');
        const favorites = await response.json();
        console.log('Favorites:', favorites);
        if (Array.isArray(favorites)) {
            currentFavorites = favorites;
            renderFavorites(favorites);
            updateFavoriteButton();
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

function renderFavorites(favorites) {
    const favoritesContainer = document.getElementById('favorites');
    favoritesContainer.innerHTML = '';

    // Show message if no favorites
    if (favorites.length === 0) {
        const noFav = document.createElement('div');
        noFav.className = 'no-favorites';
        noFav.textContent = 'No favorite cities yet';
        favoritesContainer.appendChild(noFav);
    } else {
        // Render favorite chips
        favorites.forEach(fav => {
            const chip = document.createElement('div');
            chip.className = 'favorite-chip';
            chip.innerHTML = `
                <span class="favorite-name" data-place-id="${fav.place_id}">${fav.name}</span>
                <button class="favorite-remove" data-place-id="${fav.place_id}" title="Remove">×</button>
            `;
            chip.querySelector('.favorite-name').addEventListener('click', () => {
                selectCity(fav.place_id, fav.name);
            });
            chip.querySelector('.favorite-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                removeFavorite(fav.place_id);
            });
            favoritesContainer.appendChild(chip);
        });
    }
}

function isCityFavorited() {
    if (!currentCity) return false;
    return currentFavorites.some(fav => fav.place_id === currentCity.place_id);
}

function updateFavoriteButton() {
    const favoriteBtn = document.getElementById('favoriteBtn');

    if (!currentCity) {
        favoriteBtn.style.display = 'none';
        return;
    }

    favoriteBtn.style.display = 'flex';

    if (isCityFavorited()) {
        favoriteBtn.classList.add('favorited');
        favoriteBtn.title = 'Remove from favorites';
    } else {
        favoriteBtn.classList.remove('favorited');
        favoriteBtn.title = 'Add to favorites';
    }
}

function initializeFavoriteButton() {
    const favoriteBtn = document.getElementById('favoriteBtn');

    favoriteBtn.addEventListener('click', async () => {
        if (!currentCity) return;

        if (isCityFavorited()) {
            await removeFavorite(currentCity.place_id);
        } else {
            await addFavorite(currentCity.place_id, currentCity.name);
        }
    });
}

async function addFavorite(placeId, name) {
    try {
        const response = await fetch(`/favorites/set?place_id=${encodeURIComponent(placeId)}&name=${encodeURIComponent(name)}`, {
            method: 'POST'
        });
        const result = await response.json();
        console.log('Add favorite result:', result);
        if (result.error) {
            showError(result.error);
            return;
        }
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
        console.log('Remove favorite result:', result);
        if (result.error) {
            showError(result.error);
            return;
        }
        loadFavorites();
    } catch (error) {
        console.error('Error removing favorite:', error);
        showError('Could not remove favorite');
    }
}
