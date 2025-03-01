const apiKey = 'ebd87276f4aa190082783af69b65a3a7';
const baseURL = 'https://api.openweathermap.org/data/2.5';

let searchInput, searchButton, weatherIcon, temperature, 
    description, cityName, humidity, wind;

let dateElement, timeElement;

let map, marker;

function resetToDashboard() {
    // Clear the search input
    searchInput.value = '';
    
    // Reset weather info with placeholder values
    cityName.textContent = 'Enter a city';
    temperature.textContent = '--°C';
    description.textContent = 'Weather description';
    humidity.textContent = '--%';
    wind.textContent = '-- km/h';
    weatherIcon.src = 'https://openweathermap.org/img/wn/02d@2x.png'; // Default cloud icon
    
    // Clear forecast
    const forecastContainer = document.querySelector('.forecast-container');
    if (forecastContainer) {
        forecastContainer.innerHTML = '';
    }

    // Reset background
    document.body.style.background = 'linear-gradient(135deg, #00feba, #5b548a)';

    // Reset timezone if exists
    const existingTimezone = document.querySelector('.timezone-info');
    if (existingTimezone) {
        existingTimezone.remove();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    searchInput = document.getElementById('search-input');
    searchButton = document.getElementById('search-button');
    weatherIcon = document.querySelector('.weather-icon');
    temperature = document.querySelector('.temperature');
    description = document.querySelector('.description');
    cityName = document.querySelector('.city');
    humidity = document.querySelector('.humidity span');
    wind = document.querySelector('.wind span');
    dateElement = document.querySelector('.date');
    timeElement = document.querySelector('.time');

    // Set initial opacity after welcome message
    const container = document.querySelector('.container');
    setTimeout(() => {
        container.style.opacity = '1';
        resetToDashboard(); // Initialize with placeholder values
    }, 100);

    searchButton.addEventListener('click', () => {
        const city = searchInput.value.trim();
        if (city) checkWeather(city);
    });

    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const city = searchInput.value.trim();
            if (city) checkWeather(city);
        }
    });

    updateDateTime();
    
    // Show only welcome message
    Swal.fire({
        title: 'Welcome to Weather App!',
        text: 'Search for any city to get weather information',
        icon: 'info',
        confirmButtonColor: '#00feba',
        background: 'rgba(0, 0, 0, 0)',
        color: '#fff',
        backdrop: 'rgba(0, 0, 0, 0.4)',
        showClass: {
            popup: 'animate__animated animate__fadeIn'
        }
    });

    // Initialize map
    initMap();
});

function updateDateTime(timezone = 0) {
    if (!dateElement || !timeElement) return;

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const cityTime = new Date(utc + (timezone * 1000));
    
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    };
    dateElement.textContent = cityTime.toLocaleString('en-US', dateOptions);

    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true
    };
    timeElement.textContent = cityTime.toLocaleString('en-US', timeOptions);

    return cityTime;
}

function isDayTime(localTime) {
    const hours = localTime.getHours();
    return hours >= 6 && hours < 18;
}

function getWeatherBackground(weatherCode) {
    const backgrounds = {
        '01d': 'linear-gradient(135deg, #00c6fb 0%, #1e89f7 100%)',
        '01n': 'linear-gradient(135deg, #243949 0%, #517fa4 100%)', 
    };

    return backgrounds[weatherCode] || 
           (weatherCode.endsWith('d') ? 
           'linear-gradient(135deg, #00feba, #5b548a)' : 
           'linear-gradient(135deg, #243949, #517fa4)');
}

function initMap() {
    // Initialize the map centered on a default location
    map = L.map('map').setView([0, 0], 2);
    
    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Create a marker but don't add it to the map yet
    marker = L.marker([0, 0]);
}

function updateMap(lat, lon, cityName) {
    // If map hasn't been initialized, initialize it
    if (!map) {
        initMap();
    }

    // Update map view and marker
    map.setView([lat, lon], 10);
    
    // Remove existing marker if it exists
    if (marker) {
        marker.remove();
    }
    
    // Add new marker
    marker = L.marker([lat, lon])
        .bindPopup(cityName)
        .addTo(map);
}

async function checkWeather(city) {
    try {
        // Fade out entire container
        const container = document.querySelector('.container');
        container.style.opacity = '0';

        // Wait for fade out
        await new Promise(resolve => setTimeout(resolve, 500));

        Swal.fire({
            title: 'Loading...',
            text: 'Fetching weather data',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            },
            background: 'rgba(0, 0, 0, 0)',
            color: '#fff',
            backdrop: 'rgba(0, 0, 0, 0.4)'
        });

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
        
        const response = await fetch(url);
        
        if (response.status === 404) {
            throw new Error('City not found. Please check the spelling.');
        }
        
        if (response.status === 401) {
            throw new Error('Invalid API key. Please check your API key.');
        }
        
        if (!response.ok) {
            throw new Error('Weather service error: ' + response.status);
        }

        const data = await response.json();

        if (window.timeInterval) {
            clearInterval(window.timeInterval);
        }

        const cityTime = updateDateTime(data.timezone);
        
        window.timeInterval = setInterval(() => {
            updateDateTime(data.timezone);
        }, 1000);

        const weatherCode = data.weather[0].icon;
        const isDay = isDayTime(cityTime);
        const adjustedWeatherCode = weatherCode.slice(0, -1) + (isDay ? 'd' : 'n');

        document.body.style.background = getWeatherBackground(adjustedWeatherCode);

        cityName.textContent = `${data.name}, ${data.sys.country}`;
        temperature.textContent = `${Math.round(data.main.temp)}°C`;
        description.textContent = data.weather[0].description;
        humidity.textContent = `${data.main.humidity}%`;
        wind.textContent = `${data.wind.speed} km/h`;
        weatherIcon.src = `https://openweathermap.org/img/wn/${weatherCode}@2x.png`;

        updateTimezoneInfo(data.timezone);

        // Update map with city coordinates
        updateMap(data.coord.lat, data.coord.lon, data.name);

        // After all data is updated, fade in the container
        setTimeout(() => {
            container.style.opacity = '1';
        }, 100);

        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: `Current weather in ${data.name}`,
            timer: 1500,
            showConfirmButton: false,
            background: 'rgba(0, 0, 0, 0)',
            color: '#fff',
            backdrop: 'rgba(0, 0, 0, 0.4)'
        });

        await updateForecast(city);

    } catch (error) {
        console.error('Error:', error);
        
        let errorMessage;
        if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            errorMessage = 'Unable to connect to weather service. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        // Reset to dashboard state
        resetToDashboard();

        // Fade in the container
        const container = document.querySelector('.container');
        setTimeout(() => {
            container.style.opacity = '1';
        }, 100);

        // Show error message
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonColor: '#00feba',
            background: 'rgba(0, 0, 0, 0)',
            color: '#fff',
            backdrop: 'rgba(0, 0, 0, 0.4)'
        });

        // Reset map to default view on error
        if (map) {
            map.setView([0, 0], 2);
            if (marker) {
                marker.remove();
            }
        }
    }
}

function updateTimezoneInfo(timezone) {
    const timezoneHours = Math.floor(Math.abs(timezone) / 3600);
    const timezoneMinutes = Math.floor((Math.abs(timezone) % 3600) / 60);
    const timezoneSign = timezone >= 0 ? '+' : '-';
    const timezoneFormatted = `GMT${timezoneSign}${String(timezoneHours).padStart(2, '0')}:${String(timezoneMinutes).padStart(2, '0')}`;
    
    const existingTimezone = document.querySelector('.timezone-info');
    if (existingTimezone) {
        existingTimezone.remove();
    }

    const timezoneInfo = document.createElement('div');
    timezoneInfo.className = 'timezone-info';
    timezoneInfo.textContent = timezoneFormatted;
    
    const datetimeBox = document.querySelector('.datetime-box');
    if (datetimeBox) {
        datetimeBox.appendChild(timezoneInfo);
    }
}

async function updateForecast(city) {
    try {
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
        const forecastResponse = await fetch(forecastUrl);
        if (forecastResponse.ok) {
            const forecastData = await forecastResponse.json();
            
            const forecastContainer = document.querySelector('.forecast-container');
            if (!forecastContainer) return;
            
            forecastContainer.innerHTML = '';

            const dailyForecasts = forecastData.list
                .filter(forecast => forecast.dt_txt.includes('12:00:00'))
                .slice(0, 5);

            dailyForecasts.forEach((forecast, index) => {
                const date = new Date(forecast.dt * 1000);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const temp = Math.round(forecast.main.temp);
                const iconCode = forecast.weather[0].icon;

                const forecastItem = document.createElement('div');
                forecastItem.className = 'forecast-item';
                forecastItem.innerHTML = `
                    <div class="date">${dayName}</div>
                    <img src="https://openweathermap.org/img/wn/${iconCode}.png" 
                         alt="weather icon" 
                         style="--i: ${index}">
                    <div class="temp">${temp}°C</div>
                `;

                forecastContainer.appendChild(forecastItem);
            });
        }
    } catch (error) {
        console.error('Forecast error:', error);
    }
}

function initApp() {
    updateDateTime();
    
    initWeatherApp();
}

function initWeatherApp() {
    checkWeather('London');
    showWelcomeMessage();
}

function showWelcomeMessage() {
    Swal.fire({
        title: 'Welcome to Weather App!',
        text: 'Search for any city to get weather information',
        icon: 'info',
        confirmButtonColor: '#00feba',
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#fff',
        backdrop: 'rgba(0, 0, 0, 0.4)',
        showClass: {
            popup: 'animate__animated animate__fadeIn'
        }
    });
}