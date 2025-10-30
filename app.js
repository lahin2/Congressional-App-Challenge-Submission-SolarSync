// Solar Power Optimizer App
// Set your DeepSeek API key here
const DEEPSEEK_API_KEY = 'Ysk-1a4bc8c6a2bf485ca2350e2f004e21a7';

class SolarOptimizer {
    constructor() {
        this.latitude = null;
        this.longitude = null;
        this.timezone = null;
        this.address = null;
        this.solarData = [];
        this.weatherData = null;
        this.chart = null;
        this.init();
    }

    init() {
        // Event listeners
        document.getElementById('getLocationBtn').addEventListener('click', () => this.getUserLocation());
        document.getElementById('manualLocationBtn').addEventListener('click', () => this.setManualLocation());
        document.getElementById('addressBtn').addEventListener('click', () => this.geocodeAddress());
        document.getElementById('refreshWeatherBtn').addEventListener('click', () => this.refreshWeather());
        const assistantBtn = document.getElementById('assistantAskBtn');
        if (assistantBtn) assistantBtn.addEventListener('click', () => this.askApplianceAssistant());
        // Pre-fill DeepSeek API key from localStorage
        // No UI key storage; API key is set in code at DEEPSEEK_API_KEY
        
        // Handle Enter key in address input
        document.getElementById('addressInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.geocodeAddress();
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.solarData && this.solarData.length > 0) {
                this.renderChart();
            }
        });
        
        // Try to get location on load
        this.getUserLocation();
    }

    // Get user's geolocation
    getUserLocation() {
        const locationDisplay = document.getElementById('locationDisplay');
        const btn = document.getElementById('getLocationBtn');
        
        btn.innerHTML = '<span class="loading"></span> Getting location...';
        
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    this.latitude = position.coords.latitude;
                    this.longitude = position.coords.longitude;
                    this.address = null;
                    await this.getTimezone();
                    await this.updateUI();
                    btn.innerHTML = 'Use My Location';
                },
                (error) => {
                    locationDisplay.innerHTML = `<div class="error-message">Unable to get location: ${error.message}. Please enter manually.</div>`;
                    btn.innerHTML = 'Use My Location';
                }
            );
        } else {
            locationDisplay.innerHTML = `<div class="error-message">Geolocation is not supported by your browser. Please enter location manually.</div>`;
            btn.innerHTML = 'Use My Location';
        }
    }

    // Geocode address to coordinates
    async geocodeAddress() {
        const addressInput = document.getElementById('addressInput');
        const address = addressInput.value.trim();
        const btn = document.getElementById('addressBtn');
        
        if (!address) {
            document.getElementById('locationDisplay').innerHTML = 
                `<div class="error-message">Please enter an address.</div>`;
            return;
        }
        
        btn.innerHTML = '<span class="loading"></span> Finding address...';
        
        try {
            // Use Nominatim (OpenStreetMap) free geocoding service
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                this.latitude = parseFloat(result.lat);
                this.longitude = parseFloat(result.lon);
                this.address = result.display_name;
                
                // Get timezone using coordinates
                await this.getTimezone();
                
                await this.updateUI();
                btn.innerHTML = 'Find Address';
            } else {
                throw new Error('Address not found');
            }
        } catch (error) {
            document.getElementById('locationDisplay').innerHTML = 
                `<div class="error-message">Could not find address. Please try a different format or use coordinates.</div>`;
            btn.innerHTML = 'Find Address';
        }
    }

    // Get timezone for coordinates
    async getTimezone() {
        // Use longitude-based timezone estimation for simplicity
        this.timezone = this.estimateTimezone();
    }

    // Fetch weather data from WeatherAPI
    async fetchWeatherData() {
        if (!this.latitude || !this.longitude) {
            return;
        }

        try {
            const API_KEY = '4d134b61df3140bc9ce15957253010'; // Replace with your actual API key
            
            // Check if API key is set
            if (API_KEY === 'YOUR_API_KEY_HERE') {
                // Use mock weather data for demonstration
                this.weatherData = this.generateMockWeatherData();
                this.updateWeatherDisplay();
                return;
            }
            
            // Fetch current weather data
            const currentResponse = await fetch(
                `http://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${this.latitude},${this.longitude}&aqi=no`
            );
            
            // Fetch forecast data for hourly weather
            const forecastResponse = await fetch(
                `http://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${this.latitude},${this.longitude}&days=1&aqi=no&alerts=no`
            );
            
            if (!currentResponse.ok || !forecastResponse.ok) {
                throw new Error('Weather API request failed');
            }
            
            const currentData = await currentResponse.json();
            const forecastData = await forecastResponse.json();
            
            // Convert WeatherAPI response to our expected format
            this.weatherData = this.convertWeatherAPIData(currentData, forecastData);
            
            // Update weather display
            this.updateWeatherDisplay();
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            // Use mock weather data as fallback
            this.weatherData = this.generateMockWeatherData();
            this.updateWeatherDisplay();
        }
    }

    // Convert WeatherAPI response to our expected format
    convertWeatherAPIData(currentData, forecastData) {
        const current = currentData.current;
        const forecast = forecastData.forecast.forecastday[0];
        
        return {
            isMockData: false,
            current: {
                temp: current.temp_c,
                clouds: current.cloud,
                humidity: current.humidity,
                uvi: current.uv
            },
            hourly: forecast.hour.map(hour => ({
                temp: hour.temp_c,
                clouds: hour.cloud,
                humidity: hour.humidity,
                uvi: hour.uv
            }))
        };
    }

    // Generate mock weather data for demonstration
    generateMockWeatherData() {
        const now = new Date();
        const hour = now.getHours();
        
        // Simulate different weather conditions based on time of day
        const baseTemp = 20 + Math.sin((hour - 6) * Math.PI / 12) * 10; // Temperature varies throughout day
        const cloudCover = Math.random() * 60 + 20; // Random cloud cover between 20-80%
        const humidity = Math.random() * 40 + 40; // Random humidity between 40-80%
        const uvIndex = Math.max(0, Math.sin((hour - 6) * Math.PI / 12) * 8); // UV index follows sun pattern
        
        return {
            isMockData: true,
            current: {
                temp: Math.round(baseTemp),
                clouds: Math.round(cloudCover),
                humidity: Math.round(humidity),
                uvi: Math.round(uvIndex * 10) / 10
            },
            hourly: Array.from({ length: 24 }, (_, i) => ({
                temp: Math.round(20 + Math.sin((i - 6) * Math.PI / 12) * 10 + (Math.random() - 0.5) * 4),
                clouds: Math.round(Math.random() * 60 + 20),
                humidity: Math.round(Math.random() * 40 + 40),
                uvi: Math.max(0, Math.sin((i - 6) * Math.PI / 12) * 8)
            }))
        };
    }

    // Update weather display in the UI
    updateWeatherDisplay() {
        if (!this.weatherData) return;

        const current = this.weatherData.current;
        const weatherInfo = document.getElementById('weatherDisplay');
        const refreshBtn = document.getElementById('refreshWeatherBtn');
        const isMockData = this.weatherData.isMockData;

        // Show refresh button
        if (refreshBtn) {
            refreshBtn.style.display = 'inline-flex';
        }
        
        if (weatherInfo) {
            weatherInfo.innerHTML = `
                <div class="weather-info">
                    <h3>Current Weather</h3>
                    <div class="weather-details">
                        <div class="weather-item">
                            <span class="weather-label">Temperature:</span>
                            <span class="weather-value">${Math.round(current.temp)}°C</span>
                        </div>
                        <div class="weather-item">
                            <span class="weather-label">Cloud Cover:</span>
                            <span class="weather-value">${current.clouds}%</span>
                        </div>
                        <div class="weather-item">
                            <span class="weather-label">Humidity:</span>
                            <span class="weather-value">${current.humidity}%</span>
                        </div>
                        <div class="weather-item">
                            <span class="weather-label">UV Index:</span>
                            <span class="weather-value">${current.uvi || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Refresh weather data
    async refreshWeather() {
        if (!this.latitude || !this.longitude) {
            return;
        }

        const btn = document.getElementById('refreshWeatherBtn');
        btn.innerHTML = '<span class="loading"></span> Refreshing...';
        
        await this.fetchWeatherData();
        this.calculateSolarData();
        this.displayPeakHours();
        this.updateApplianceRecommendations();
        this.displayCurrentPower();
        
        btn.innerHTML = 'Refresh Weather';
    }

    // Appliance Assistant:
    async askApplianceAssistant() {
        const questionInput = document.getElementById('assistantQuestion');
        const applianceSelect = document.getElementById('applianceSelect');
        const responseEl = document.getElementById('assistantResponse');

        if (!responseEl) return;

        const apiKey = '';
        const question = (questionInput?.value || '').trim();
        const appliance = (applianceSelect?.value || 'Appliance');

        if (!this.solarData || this.solarData.length === 0) {
            responseEl.innerHTML = '<div class="error-message">No solar data available yet. Set your location first.</div>';
            return;
        }

        // Build compact context: top hours and summary
        const peakData = [...this.solarData].filter(d => d.irradiance > 0).sort((a,b)=>b.irradiance-a.irradiance);
        const best = peakData[0];
        const windowSize = 16; // 4 hours
        let bestStart = null; let maxAvg = 0;
        for (let i = 0; i <= this.solarData.length - windowSize; i++) {
            const w = this.solarData.slice(i, i + windowSize);
            const avg = w.reduce((s,d)=>s+d.irradiance,0)/windowSize;
            if (avg > maxAvg) { maxAvg = avg; bestStart = w[0]; }
        }
        const bestStartHour = bestStart ? bestStart.hour : 10;
        const bestEndHour = bestStartHour + 4;

        // Serialize a lightweight day profile at 1h resolution
        const hourly = [];
        for (let h = 0; h < 24; h++) {
            const nearest = this.solarData.reduce((p,c)=>Math.abs(c.hour-h)<Math.abs(p.hour-h)?c:p);
            hourly.push({ h, irr: Math.round(nearest.irradiance) });
        }

        const to12h = (h) => {
            const hour24 = ((h % 24) + 24) % 24;
            const hour12 = ((hour24 % 12) || 12);
            const ampm = hour24 < 12 ? 'AM' : 'PM';
            return `${hour12}:00 ${ampm}`;
        };
        const basePrompt = '';

        responseEl.innerHTML = '<span class="loading"></span> Getting advice...';

        try {
            // Always use local fallback heuristic
            const startH = Math.max(0, Math.floor(bestStartHour));
            const endH = Math.min(24, Math.floor(bestEndHour));
            responseEl.textContent = `Suggested: ${to12h(startH)}–${to12h(startH+2)} and ${to12h(startH+2)}–${to12h(endH)}. Rationale: aligns with today’s highest solar window (${to12h(Math.floor(bestStartHour))}–${to12h(Math.floor(bestEndHour))}).`;
            return;
            const dsResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    temperature: 0.2,
                    messages: [
                        { role: 'system', content: 'You are a concise solar energy scheduling assistant.' },
                        { role: 'user', content: basePrompt }
                    ]
                })
            });

            if (!dsResp.ok) throw new Error(`DeepSeek API error (${dsResp.status})`);
            const dsJson = await dsResp.json();
            const content = dsJson?.choices?.[0]?.message?.content?.trim();
            if (!content) throw new Error('Empty response from DeepSeek');
            responseEl.textContent = content;
        } catch (err) {
            // Robust fallback (12-hour format)
            const startH = Math.max(0, Math.floor(bestStartHour));
            const endH = Math.min(24, Math.floor(bestEndHour));
            responseEl.innerHTML = `Suggested: ${to12h(startH)}–${to12h(startH+2)} and ${to12h(startH+2)}–${to12h(endH)}. ` +
                `Rationale: aligns with today’s highest solar window (${to12h(Math.floor(bestStartHour))}–${to12h(Math.floor(bestEndHour))}).`;
        }
    }

    // Estimate timezone from longitude
    estimateTimezone() {
        const offset = Math.round(this.longitude / 15);
        const utc = new Date();
        const localTime = new Date(utc.getTime() + (offset * 60 * 60 * 1000));
        return `UTC${offset >= 0 ? '+' : ''}${offset}`;
    }

    // Set location manually
    async setManualLocation() {
        const lat = parseFloat(document.getElementById('latInput').value);
        const lon = parseFloat(document.getElementById('lonInput').value);

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            document.getElementById('locationDisplay').innerHTML = 
                `<div class="error-message">Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.</div>`;
            return;
        }

        this.latitude = lat;
        this.longitude = lon;
        this.address = null;
        this.timezone = this.estimateTimezone();
        await this.updateUI();
    }

    // Update UI with location data
    async updateUI() {
        const locationDisplay = document.getElementById('locationDisplay');
        
        let locationInfo = `
            <div class="success-message">
                <strong>Location Set:</strong> ${this.latitude.toFixed(4)}°, ${this.longitude.toFixed(4)}°
        `;
        
        if (this.address) {
            locationInfo += `<br><strong>Address:</strong> ${this.address}`;
        }
        
        if (this.timezone) {
            locationInfo += `<br><strong>Timezone:</strong> ${this.timezone}`;
        }
        
        locationInfo += `</div>`;
        
        locationDisplay.innerHTML = locationInfo;

        try {
            // Fetch weather data first, then calculate solar data
            await this.fetchWeatherData();
            this.calculateSolarData();
            this.displayPeakHours();
            this.updateApplianceRecommendations();
            this.displayCurrentPower();
        } catch (error) {
            console.error('Error calculating solar data:', error);
            locationDisplay.innerHTML += `
                <div class="error-message">
                    Error calculating solar data. Please check your location coordinates.
                </div>
            `;
        }
    }

    // Calculate solar position and irradiance for the day
    calculateSolarData() {
        // Validate coordinates
        if (this.latitude === null || this.longitude === null) {
            throw new Error('Location not set');
        }
        
        if (isNaN(this.latitude) || isNaN(this.longitude)) {
            throw new Error('Invalid coordinates');
        }
        
        this.solarData = [];
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        // Calculate for every 15 minutes of the day for more precision
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                // Create date in local time for the location
                const date = new Date(year, month - 1, day, hour, minute);
                
                const solarPosition = this.calculateSolarPosition(date);
                const currentHour = hour + minute / 60;
                const irradiance = this.calculateIrradiance(solarPosition.altitude, currentHour);
                
                this.solarData.push({
                    time: date,
                    hour: currentHour,
                    altitude: solarPosition.altitude,
                    azimuth: solarPosition.azimuth,
                    irradiance: irradiance
                });
            }
        }
        

        this.renderChart();
    }

    // Calculate solar position (altitude and azimuth) - Accurate astronomical calculation
    calculateSolarPosition(date) {
        try {
            const lat = this.latitude * Math.PI / 180;
            const lon = this.longitude * Math.PI / 180;

            // Get UTC time components
            const year = date.getUTCFullYear();
            const month = date.getUTCMonth() + 1;
            const day = date.getUTCDate();
            const hour = date.getUTCHours();
            const minute = date.getUTCMinutes();
            const second = date.getUTCSeconds();

            // Calculate Julian Day
            const JD = this.getJulianDay(date);
            const JC = (JD - 2451545.0) / 36525.0;

            // Calculate day of year
            const dayOfYear = this.getDayOfYear(year, month, day);
            
            // Calculate solar declination (more accurate)
            const declination = 23.45 * Math.sin((284 + dayOfYear) * Math.PI / 180) * Math.PI / 180;
            
            // Calculate equation of time (correction for Earth's elliptical orbit)
            const B = (dayOfYear - 81) * 2 * Math.PI / 365;
            const equationOfTime = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
            
            // Calculate solar time (local apparent time)
            const timeDecimal = hour + minute / 60 + second / 3600;
            const solarTime = timeDecimal + equationOfTime / 60 + lon * 180 / Math.PI / 15;
            
            // Calculate hour angle
            const hourAngle = (solarTime - 12) * 15 * Math.PI / 180;
            
            // Calculate solar altitude
            const altitude = Math.asin(
                Math.sin(lat) * Math.sin(declination) + 
                Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
            );
            
            // Calculate solar azimuth
            const azimuth = Math.atan2(
                Math.sin(hourAngle),
                Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat)
            );

            return {
                altitude: altitude * 180 / Math.PI,
                azimuth: (azimuth * 180 / Math.PI + 180) % 360
            };
        } catch (error) {
            return { altitude: 0, azimuth: 0 };
        }
    }

    // Calculate solar noon for a specific date and location
    calculateSolarNoon(year, month, day) {
        const lat = this.latitude * Math.PI / 180;
        const lon = this.longitude * Math.PI / 180;
        
        // Calculate day of year
        const dayOfYear = this.getDayOfYear(year, month, day);
        
        // Calculate equation of time
        const B = (dayOfYear - 81) * 2 * Math.PI / 365;
        const equationOfTime = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
        
        // Solar noon occurs when the sun is at its highest point
        // This happens when the hour angle is 0 (sun is due south)
        // Solar noon = 12:00 + equation of time + longitude correction
        const solarNoonHours = 12 + equationOfTime / 60 - lon * 180 / Math.PI / 15;
        
        // Create date for solar noon
        const solarNoonDate = new Date(year, month - 1, day, Math.floor(solarNoonHours), (solarNoonHours % 1) * 60);
        
        return solarNoonDate;
    }

    // Helper function to get day of year
    getDayOfYear(year, month, day) {
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        // Check for leap year
        if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
            daysInMonth[1] = 29;
        }
        
        let dayOfYear = day;
        for (let i = 0; i < month - 1; i++) {
            dayOfYear += daysInMonth[i];
        }
        
        return dayOfYear;
    }

    // Calculate Julian Day
    getJulianDay(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const second = date.getSeconds();

        let a = Math.floor((14 - month) / 12);
        let y = year + 4800 - a;
        let m = month + 12 * a - 3;

        let JD = day + Math.floor((153 * m + 2) / 5) + 365 * y + 
                Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
        
        JD += (hour - 12) / 24 + minute / 1440 + second / 86400;

        return JD;
    }

    // Calculate solar irradiance based on altitude and weather conditions
    calculateIrradiance(altitude, hour = null) {
        try {
            if (altitude < 0) {
                return 0; // Sun is below horizon
            }

            // Maximum irradiance at sea level (W/m²)
            const maxIrradiance = 1000;
            
            // Simple irradiance model based on solar altitude
            const altitudeRad = altitude * Math.PI / 180;
            
            // Basic atmospheric attenuation
            const airMass = 1 / Math.sin(altitudeRad);
            
            // Check for invalid air mass
            if (!isFinite(airMass) || airMass <= 0) {
                return 0;
            }
            
            // Atmospheric transmission (simplified model)
            const transmission = Math.pow(0.7, Math.pow(airMass, 0.678));
            
            // Calculate base irradiance
            let irradiance = maxIrradiance * Math.sin(altitudeRad) * transmission;
            
            // Apply additional factors for more realistic curve
            irradiance = irradiance * Math.sin(altitudeRad);

            // Apply weather adjustments if available
            if (this.weatherData) {
                irradiance = this.applyWeatherAdjustments(irradiance, hour);
            }

            return Math.max(0, irradiance);
        } catch (error) {
            return 0;
        }
    }

    // Apply weather-based adjustments to solar irradiance
    applyWeatherAdjustments(baseIrradiance, hour) {
        if (!this.weatherData) return baseIrradiance;

        let adjustedIrradiance = baseIrradiance;

        // Get weather data for the specific hour
        let weatherForHour = this.weatherData.current;
        
        // If we have hourly forecast data and hour is specified, use that
        if (this.weatherData.hourly && hour !== null && hour >= 0 && hour < 24) {
            const hourIndex = Math.floor(hour);
            if (this.weatherData.hourly[hourIndex]) {
                weatherForHour = this.weatherData.hourly[hourIndex];
            }
        }

        // Cloud cover adjustment (most significant factor)
        const cloudCover = weatherForHour.clouds || 0;
        const cloudFactor = 1 - (cloudCover / 100) * 0.7; // Up to 70% reduction for full cloud cover
        adjustedIrradiance *= cloudFactor;

        // Temperature adjustment (solar panels are less efficient at higher temperatures)
        const temperature = weatherForHour.temp || 25;
        const tempFactor = 1 - Math.max(0, (temperature - 25) * 0.004); // 0.4% reduction per degree above 25°C
        adjustedIrradiance *= tempFactor;

        // Humidity adjustment (higher humidity reduces solar irradiance)
        const humidity = weatherForHour.humidity || 50;
        const humidityFactor = 1 - (humidity / 100) * 0.1; // Up to 10% reduction for high humidity
        adjustedIrradiance *= humidityFactor;

        // UV Index adjustment (if available)
        if (weatherForHour.uvi !== undefined) {
            const uvFactor = Math.min(1, weatherForHour.uvi / 11); // Normalize UV index (max ~11)
            adjustedIrradiance *= (0.5 + 0.5 * uvFactor); // Scale between 50% and 100%
        }

        return adjustedIrradiance;
    }

    // Calculate theoretical solar data under perfect conditions
    calculateTheoreticalSolarData() {
        const theoreticalData = [];
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        // Calculate for every 15 minutes of the day for more precision
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                // Create date in local time for the location
                const date = new Date(year, month - 1, day, hour, minute);
                
                const solarPosition = this.calculateSolarPosition(date);
                const currentHour = hour + minute / 60;
                
                // Calculate theoretical irradiance without weather adjustments
                const theoreticalIrradiance = this.calculateTheoreticalIrradiance(solarPosition.altitude);
                
                theoreticalData.push({
                    time: date,
                    hour: currentHour,
                    altitude: solarPosition.altitude,
                    azimuth: solarPosition.azimuth,
                    irradiance: theoreticalIrradiance
                });
            }
        }
        
        return theoreticalData;
    }

    // Calculate theoretical irradiance under perfect conditions
    calculateTheoreticalIrradiance(altitude) {
        try {
            if (altitude < 0) {
                return 0; // Sun is below horizon
            }

            // Maximum irradiance at sea level (W/m²)
            const maxIrradiance = 1000;
            
            // Simple irradiance model based on solar altitude
            const altitudeRad = altitude * Math.PI / 180;
            
            // Basic atmospheric attenuation
            const airMass = 1 / Math.sin(altitudeRad);
            
            // Check for invalid air mass
            if (!isFinite(airMass) || airMass <= 0) {
                return 0;
            }
            
            // Atmospheric transmission (simplified model)
            const transmission = Math.pow(0.7, Math.pow(airMass, 0.678));
            
            // Calculate irradiance with realistic curve
            const irradiance = maxIrradiance * Math.sin(altitudeRad) * transmission;
            
            // Apply additional factors for more realistic curve
            const adjustedIrradiance = irradiance * Math.sin(altitudeRad);

            return Math.max(0, adjustedIrradiance);
        } catch (error) {
            return 0;
        }
    }

    // Render chart
    renderChart() {
        const canvas = document.getElementById('solarChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('chartContainer');
        
        // Set canvas size based on container
        const containerWidth = container.offsetWidth;
        canvas.width = containerWidth;
        canvas.height = 400;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 90;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Check if we have data
        if (!this.solarData || this.solarData.length === 0) {
            ctx.fillStyle = '#b8b8d1';
            ctx.font = '16px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('No solar data available', width / 2, height / 2);
            return;
        }

        // Find max irradiance for scaling
        const maxIrradiance = Math.max(...this.solarData.map(d => d.irradiance));
        
        if (maxIrradiance <= 0) {
            ctx.fillStyle = '#b8b8d1';
            ctx.font = '16px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('No sunlight detected for this location/date', width / 2, height / 2);
            return;
        }

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 5; i++) {
            const y = padding + (height - 2 * padding) * i / 5;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw vertical grid lines
        for (let hour = 0; hour <= 24; hour += 3) {
            const x = padding + (width - 2 * padding) * hour / 24;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }

        // Calculate theoretical solar data (perfect conditions) and combined scaling
        const theoreticalData = this.calculateTheoreticalSolarData();
        const maxTheoreticalIrradiance = Math.max(...theoreticalData.map(d => d.irradiance));
        const combinedMaxIrradiance = Math.max(maxIrradiance, maxTheoreticalIrradiance);

        // Draw axes labels
        ctx.fillStyle = '#b8b8d1';
        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'right';

        // Round Y max to a cleaner tick (nearest 100)
        let roundedMax = Math.ceil(combinedMaxIrradiance / 100) * 100;
        if (!isFinite(roundedMax) || roundedMax <= 0) {
            roundedMax = 100; // sensible default to avoid all-zero labels
        }
        for (let i = 0; i <= 5; i++) {
            const y = padding + (height - 2 * padding) * i / 5;
            const value = Math.round(roundedMax * (1 - i / 5));
            ctx.fillText(value + ' W/m²', padding - 10, y + 4);
        }

        // Draw x-axis labels (hours) in 12-hour format
        ctx.textAlign = 'center';
        for (let hour = 0; hour <= 24; hour += 3) {
            const x = padding + (width - 2 * padding) * hour / 24;
            const h24 = hour % 24;
            const h12 = ((h24 % 12) || 12);
            const ampm = h24 < 12 ? 'AM' : 'PM';
            ctx.fillText(`${h12}${hour === 24 ? '' : ' ' + ampm}`, x, height - padding + 20);
        }

        // Use combinedMaxIrradiance computed above for curve scaling

        // Draw theoretical solar curve underlay (perfect conditions)
        ctx.strokeStyle = '#FDB813';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();

        let firstPoint = true;
        theoreticalData.forEach(data => {
            const x = padding + (width - 2 * padding) * data.hour / 24;
            const y = height - padding - (height - 2 * padding) * data.irradiance / combinedMaxIrradiance;

            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
        ctx.setLineDash([]);

        // Fill area under theoretical curve (perfect conditions underlay)
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
        ctx.fillStyle = 'rgba(253, 184, 19, 0.15)';
        ctx.fill();

        // Draw weather-adjusted solar curve (solid line)
        if (this.weatherData) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.beginPath();

            firstPoint = true;
        this.solarData.forEach(data => {
            const x = padding + (width - 2 * padding) * data.hour / 24;
                const y = height - padding - (height - 2 * padding) * data.irradiance / combinedMaxIrradiance;

            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

            // Fill area under weather-adjusted curve
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.fill();
        } else {
            // Fill area under theoretical curve if no weather data
            ctx.lineTo(width - padding, height - padding);
            ctx.lineTo(padding, height - padding);
            ctx.closePath();
            ctx.fillStyle = 'rgba(253, 184, 19, 0.3)';
            ctx.fill();
        }

        // Draw current time indicator
        const now = new Date();
        const currentHour = now.getHours() + now.getMinutes() / 60;
        const currentX = padding + (width - 2 * padding) * currentHour / 24;

        if (currentX >= padding && currentX <= width - padding) {
            ctx.strokeStyle = '#FF6B35';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(currentX, padding);
            ctx.lineTo(currentX, height - padding);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label current time
            ctx.fillStyle = '#FF6B35';
            ctx.font = 'bold 12px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('Now', currentX, padding - 10);
        }
    }

    // Display peak hours
    displayPeakHours() {
        const peakData = this.solarData
            .filter(d => d.irradiance > 0)
            .sort((a, b) => b.irradiance - a.irradiance);

        if (peakData.length === 0) {
            document.getElementById('peakHoursDisplay').innerHTML = 
                '<p style="text-align: center;">No sunlight hours detected for today.</p>';
            return;
        }

        const peak = peakData[0];
        const peakTime = this.formatTime(peak.time);
        const maxIrradiance = Math.round(peak.irradiance);

        // Find the optimal window (continuous high irradiance period)
        let bestStart = null;
        let bestEnd = null;
        let maxAverage = 0;
        const windowSize = 16; // 4 hours (16 * 15 minutes)

        for (let i = 0; i <= this.solarData.length - windowSize; i++) {
            const window = this.solarData.slice(i, i + windowSize);
            const average = window.reduce((sum, d) => sum + d.irradiance, 0) / windowSize;
            
            if (average > maxAverage) {
                maxAverage = average;
                bestStart = window[0].time;
                bestEnd = window[window.length - 1].time;
            }
        }

        const html = `
            <div class="peak-hour-item">
                <h3>${peakTime}</h3>
                <p>Peak Solar Power</p>
                <p style="font-size: 1.2rem; margin-top: 5px;">${maxIrradiance} W/m²</p>
            </div>
            <div class="peak-hour-item">
                <h3>${this.formatTime(bestStart)} - ${this.formatTime(bestEnd)}</h3>
                <p>Optimal 4-Hour Window</p>
                <p style="font-size: 1.2rem; margin-top: 5px;">${Math.round(maxAverage)} W/m² avg</p>
            </div>
        `;

        document.getElementById('peakHoursDisplay').innerHTML = html;
    }

    // Display current power
    displayCurrentPower() {
        const now = new Date();
        const currentHour = now.getHours() + now.getMinutes() / 60;
        
        // Find closest data point
        let closest = this.solarData[0];
        let minDiff = Math.abs(this.solarData[0].hour - currentHour);

        this.solarData.forEach(data => {
            const diff = Math.abs(data.hour - currentHour);
            if (diff < minDiff) {
                minDiff = diff;
                closest = data;
            }
        });

        const currentIrradiance = Math.round(closest.irradiance);
        const maxIrradiance = Math.max(...this.solarData.map(d => d.irradiance));
        const percentage = maxIrradiance > 0 ? Math.round((currentIrradiance / maxIrradiance) * 100) : 0;

        const html = `
            <h3>Current Solar Power</h3>
            <p style="font-size: 2.5rem; font-weight: bold; color: #FDB813; margin: 10px 0;">
                ${currentIrradiance} W/m²
            </p>
            <p>${percentage}% of today's peak</p>
        `;

        document.getElementById('currentPowerDisplay').innerHTML = html;
    }

    // Update appliance recommendations
    updateApplianceRecommendations() {
        const peakData = this.solarData
            .filter(d => d.irradiance > 0)
            .sort((a, b) => b.irradiance - a.irradiance);

        if (peakData.length === 0) return;

        // Find optimal window
        const windowSize = 16;
        let bestStart = null;
        let maxAverage = 0;

        for (let i = 0; i <= this.solarData.length - windowSize; i++) {
            const window = this.solarData.slice(i, i + windowSize);
            const average = window.reduce((sum, d) => sum + d.irradiance, 0) / windowSize;
            
            if (average > maxAverage) {
                maxAverage = average;
                bestStart = window[0];
            }
        }

        const optimalStartHour = Math.floor(bestStart.hour);
        const optimalStartMinute = Math.round((bestStart.hour - optimalStartHour) * 60);

        // Update each appliance
        const appliances = document.querySelectorAll('.appliance-time');
        
        appliances.forEach((element, index) => {
            let startHour = optimalStartHour;
            let startMinute = optimalStartMinute;
            
            // Stagger appliances slightly
            startHour += Math.floor(index * 0.5);
            startMinute += (index * 30) % 60;
            
            if (startMinute >= 60) {
                startHour += 1;
                startMinute -= 60;
            }
            
            const endHour = startHour + 1;
            
            const to12 = (h, m) => {
                const hour24 = ((h % 24) + 24) % 24;
                const hour12 = ((hour24 % 12) || 12);
                const ampm = hour24 < 12 ? 'AM' : 'PM';
                return `${hour12}:${this.padZero(m)} ${ampm}`;
            };
            element.textContent = `${to12(startHour, startMinute)} - ${to12(endHour, startMinute)}`;
            
            // Check if time is during peak hours
            if (startHour >= optimalStartHour && startHour <= optimalStartHour + 4) {
                element.classList.remove('off-peak');
            } else {
                element.classList.add('off-peak');
            }
        });
    }

    // Helper function to format time
    formatTime(date) {
        // Convert to local time if timezone is available
        if (this.timezone && this.timezone !== 'UTC+0') {
            try {
                // Create a new date with the timezone offset
                const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
                const localTime = new Date(utcTime);
                return localTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
            } catch (error) {
                // Fallback to default formatting
            }
        }
        
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }

    // Helper function to format hour
    formatHour(hour) {
        const h = hour % 24;
        return h < 10 ? '0' + h : h;
    }

    // Helper function to pad zero
    padZero(num) {
        return num < 10 ? '0' + num : num;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SolarOptimizer();
});

