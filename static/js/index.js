const input = document.getElementById("cityInput");
const suggestions = document.getElementById("suggestions");

input.addEventListener("input", async () => {
  const query = input.value.trim();
  if (!query) {
    suggestions.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(`/autocomplete?query=${encodeURIComponent(query)}`);
    const data = await res.json();

    suggestions.innerHTML = "";
    data.predictions.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.description;

      li.addEventListener("click", async () => {
        // Fill input and clear suggestions
        input.value = p.description;
        suggestions.innerHTML = "";

        // Fetch place details (to get coordinates)
        const detailsRes = await fetch(`/place_details?place_id=${p.place_id}`);
        const placeDetails = await detailsRes.json();

        // Coordinates
        const lat = placeDetails.geometry.location.lat;
        const lng = placeDetails.geometry.location.lng;

        console.log("Selected place coordinates:", lat, lng);

        // Fetch weather
        const currentWeather = await fetch(`/weather/current?lat=${lat}&lng=${lng}`).then(r => r.json());
        const dailyWeather = await fetch(`/weather/daily?lat=${lat}&lng=${lng}`).then(r => r.json());
        const hourlyWeather = await fetch(`/weather/hourly?lat=${lat}&lng=${lng}`).then(r => r.json());

        console.log("Current weather:", currentWeather);
        console.log("Daily forecast:", dailyWeather);
        console.log("Hourly forecast:", hourlyWeather);
      });

      suggestions.appendChild(li);
    });
  } catch (err) {
    console.error("Autocomplete error:", err);
  }
});