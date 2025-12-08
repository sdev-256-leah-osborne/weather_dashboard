import json
import logging
from flask import Flask, render_template, request, jsonify, abort, make_response
from flask_cors import CORS
from jinja2 import TemplateNotFound, TemplateError
import requests
from .config import DebugConfig as cfg

# -------------------------
# App + Logging
# -------------------------
app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# -------------------------
# Helpers
# -------------------------


def json_response(data, status=200):
    return jsonify(data), status


def load_cookie(name, default=None):
    raw = request.cookies.get(name)
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Invalid cookie detected: %s", name)
        return default


def save_cookie(resp, name, value, max_age=cfg.MAX_COOKIE_AGE):
    try:
        resp.set_cookie(
            name,
            json.dumps(value),
            max_age=max_age,
            httponly=True,
            samesite="Strict",
            secure=True,
        )
    except (TypeError, ValueError):
        logger.error("Failed to save cookie %s", name)


# -------------------------
# Favorites – Validation
# -------------------------


def valid_fav(obj):
    return (
        isinstance(obj, dict)
        and "place_id" in obj
        and "name" in obj
        and isinstance(obj["place_id"], str)
        and isinstance(obj["name"], str)
    )


def sanitize_favorites(favs):
    if not isinstance(favs, list):
        return []
    return [f for f in favs if valid_fav(f)]


# -------------------------
# Favorites Route
# -------------------------


@app.route("/favorites/get", methods=["GET"])
def favorites_get():
    fav_list = sanitize_favorites(load_cookie(cfg.FAV_COOKIE, default=[]))
    place_id = request.args.get("place_id")
    if place_id:
        fav_item = next((f for f in fav_list if f["place_id"] == place_id), None)
        return json_response(
            fav_item or {"error": "Not found"}, 200 if fav_item else 400
        )
    return json_response(fav_list)


@app.route("/favorites/set", methods=["POST"])
def favorites_set():
    fav_list = sanitize_favorites(load_cookie(cfg.FAV_COOKIE, default=[]))
    place_id = request.args.get("place_id")
    name = request.args.get("name")
    if not place_id or not name:
        return json_response({"error": "Missing place_id or name"}, 400)

    for fav_item in fav_list:
        if fav_item["place_id"] == place_id:
            fav_item["name"] = name
            resp = json_response({"status": "updated"})
            save_cookie(resp, cfg.FAV_COOKIE, fav_list)
            return resp

    if len(fav_list) >= cfg.MAX_FAVORITES:
        return json_response({"error": "Limit reached"}, 409)

    fav_list.append({"place_id": place_id, "name": name})
    resp = json_response({"status": "added"})
    save_cookie(resp, cfg.FAV_COOKIE, fav_list)
    return resp


@app.route("/favorites/delete", methods=["POST"])
def favorites_delete():
    fav_list = sanitize_favorites(load_cookie(cfg.FAV_COOKIE, default=[]))
    place_id = request.args.get("place_id")
    if not place_id:
        return json_response({"error": "Missing place_id"}, 400)

    if not any(f["place_id"] == place_id for f in fav_list):
        return json_response({"error": "Not found"}, 400)

    fav_list = [f for f in fav_list if f["place_id"] != place_id]
    resp = json_response({"status": "deleted"})
    save_cookie(resp, cfg.FAV_COOKIE, fav_list)
    return resp


@app.route("/favorites/clear", methods=["POST"])
def favorites_clear():
    resp = json_response({"status": "cleared"})
    save_cookie(resp, cfg.FAV_COOKIE, "", max_age=0)
    return resp


# -------------------------
# Query Param Helper
# -------------------------


def get_param(name):
    val = request.args.get(name)
    if not val:
        abort(make_response(json_response({"error": f"Missing {name}"}), 400))
    return val


# -------------------------
# API Caller – Safe
# -------------------------


def call_api(url, params=None, raw=False):
    """Unified API helper for JSON or raw content."""
    try:
        r = requests.get(
            url,
            params=params,
            timeout=(cfg.REQUESTS_CONNECT_TIMEOUT, cfg.REQUESTS_RESPONSE_TIMEOUT),
        )
        if r.status_code >= 400:
            logger.error("HTTP error calling API: %s (%s)", url, r.status_code)
            return {"error": "External service error"}, 502

        if raw:
            return r.content, 200
        try:
            return r.json(), 200
        except ValueError:
            logger.exception("Invalid JSON from API: %s", url)
            return {"error": "Invalid response from external service"}, 502

    except requests.Timeout:
        logger.error("Timeout calling API: %s", url)
        return {"error": "External service timed out"}, 504

    except requests.RequestException:
        logger.error("Request failure calling API: %s", url)
        return {"error": "Service unavailable"}, 502


# -------------------------
# Template route
# -------------------------


@app.route("/")
def index():
    try:
        return render_template("index.html")
    except TemplateNotFound:
        logger.warning("Template index.html missing")
        abort(404)
    except TemplateError:
        logger.error("Template processing error")
        abort(500)


# -------------------------
# Weather Routes
# -------------------------


def weather_route(endpoint):
    lat = get_param("lat")
    lng = get_param("lng")
    url = f"https://weather.googleapis.com/v1/{endpoint}"
    params = {
        "key": cfg.GOOGLE_API_KEY,
        "location.latitude": lat,
        "location.longitude": lng,
    }
    data, status = call_api(url, params)
    return json_response(data, status)


@app.route("/weather/current")
def current_weather():
    return weather_route("currentConditions:lookup")


@app.route("/weather/daily")
def daily_weather():
    return weather_route("forecast/days:lookup")


@app.route("/weather/hourly")
def hourly_weather():
    return weather_route("forecast/hours:lookup")


# -------------------------
# Places API Routes
# -------------------------


def places_api(url, params):
    data, status = call_api(url, params)
    return json_response(data, status)


@app.route("/autocomplete")
def autocomplete():
    query = get_param("query")
    url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    params = {"input": query, "key": cfg.GOOGLE_API_KEY}
    return places_api(url, params)


@app.route("/place_details")
def place_details():
    place_id = get_param("place_id")
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "key": cfg.GOOGLE_API_KEY,
        "fields": "geometry,name,formatted_address",
    }

    data, status = call_api(url, params)
    if status != 200:
        return json_response(data, status)

    if not isinstance(data, dict) or data.get("status") != "OK":
        return json_response({"error": "Lookup failed"}, 400)

    result = data.get("result", {})
    response = {
        "name": result.get("name"),
        "address": result.get("formatted_address"),
        "geometry": result.get("geometry"),
    }
    return json_response(response)


# Define all allowed icons
# Whitelist of all valid mapped icon names (from your frontend map)
ALLOWED_ICONS = {
    "sunny",
    "mostly_sunny",
    "partly_cloudy",
    "mostly_cloudy",
    "cloudy",
    "windy",
    "wind_and_rain",
    "showers",
    "scattered_showers",
    "heavy_showers",
    "rain_light",
    "rain_heavy",
    "rain",
    "drizzle",
    "snow_showers",
    "scattered_snow_showers",
    "heavy_snow",
    "snow_light",
    "snow_heavy",
    "blizzard",
    "blowing_snow",
    "flurries",
    "wintry_mix",
    "hail",
    "sleet",
    "freezing_rain",
    "freezing_drizzle",
    "thunderstorm",
    "isolated_thunderstorms",
    "scattered_thunderstorms",
    "strong_thunderstorms",
    "fog",
    "haze",
    "smoke",
    "dust",
}


@app.route("/icon")
def icon():
    icon_name = get_param("icon").lower()  # required
    dark_mode = request.args.get("dark", "false").lower() == "true"

    # Validate icon against whitelist
    if icon_name not in ALLOWED_ICONS:
        return json_response({"error": "Invalid icon"}, 400)

    # Build URL
    suffix = "_dark.svg" if dark_mode else ".svg"
    url = f"https://maps.gstatic.com/weather/v1/{icon_name}{suffix}"

    # Fetch icon (cached)
    data, status = call_api(url, raw=True)

    if status != 200:
        return {"error": "Failed to fetch icon"}, status

    # Return SVG with correct headers
    resp = make_response(data)
    resp.headers["Content-Type"] = "image/svg+xml"
    return resp, status
