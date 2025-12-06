import json
from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    abort,
    make_response,
    Response,
)
from jinja2 import TemplateNotFound, TemplateError
import requests
from .config import DebugConfig as cfg


app = Flask(__name__)

# -------------------------
# General Cookie Helpers
# -------------------------


def load_cookie(name, default=None):
    """
    Load a JSON cookie safely and return its Python object.

    Args:
        name (str): The name of the cookie.
        default (Any): Value to return if cookie is missing or invalid.

    Returns:
        object: Python object parsed from JSON cookie, or default if missing/invalid.
    """
    raw = request.cookies.get(name)
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def save_cookie(resp, name, value, max_age=cfg.MAX_COOKIE_AGE):
    """
    Save a Python object as a JSON cookie in the response.

    Args:
        resp (flask.Response): Flask response object.
        name (str): Name of the cookie.
        value (object): Python object to save as JSON.
        max_age (int): Lifetime of the cookie in seconds.
    """
    resp.set_cookie(
        name,
        json.dumps(value),
        max_age=max_age,
        httponly=True,
        samesite="Strict",
        secure=True,
    )


# -------------------------
# Favorites Routes
# -------------------------


# -------------------------
# Favorites Routes
# -------------------------


@app.route("/favorites/get", methods=["GET"])
def favorites_get():
    """
    Retrieve favorites from cookies.

    Query Parameters (optional):
        place_id (str): If provided, return only the favorite with this ID.

    Returns:
        JSON response: list of all favorites or a single favorite object.
        Returns 400 if place_id is provided but does not exist.
    """
    favorites = load_cookie(cfg.FAV_COOKIE, default=[])
    place_id = request.args.get("place_id")

    if place_id:
        # Look for matching favorite
        fav = next((f for f in favorites if f["place_id"] == place_id), None)
        if not fav:
            return (
                jsonify({"error": f"Favorite with place_id '{place_id}' not found"}),
                400,
            )
        return jsonify(fav), 200

    # Return all favorites
    return jsonify(favorites), 200


@app.route("/favorites/set", methods=["POST"])
def favorites_set():
    """
    Add or update a favorite using query parameters.

    Query Parameters:
        place_id (str): ID of the place (required)
        name (str): Name of the place (required)

    Returns:
        JSON response: status message.
    """
    place_id = request.args.get("place_id")
    name = request.args.get("name")
    if not place_id or not name:
        return jsonify({"error": "Missing place_id or name"}), 400

    favorites = load_cookie(cfg.FAV_COOKIE, default=[])

    # Update existing
    for fav in favorites:
        if fav["place_id"] == place_id:
            fav["name"] = name
            resp = jsonify({"status": "updated"})
            save_cookie(resp, cfg.FAV_COOKIE, favorites)
            return resp

    # Enforce max limit
    if len(favorites) >= cfg.MAX_FAVORITES:
        return jsonify({"error": "Max favorites reached"}), 409

    favorites.append({"place_id": place_id, "name": name})
    resp = jsonify({"status": "added"})
    save_cookie(resp, cfg.FAV_COOKIE, favorites)
    return resp


@app.route("/favorites/delete", methods=["POST"])
def favorites_delete():
    """
    Delete a favorite by its place_id.

    Query Parameters:
        place_id (str): ID of the place to delete (required)

    Returns:
        JSON response: status message.
        Returns 400 if the place_id does not exist in favorites.
    """
    place_id = request.args.get("place_id")
    if not place_id:
        return jsonify({"error": "Missing place_id"}), 400

    favorites = load_cookie(cfg.FAV_COOKIE, default=[])

    # Check if the favorite exists
    if not any(f["place_id"] == place_id for f in favorites):
        return jsonify({"error": f"Favorite with place_id '{place_id}' not found"}), 400

    # Remove the favorite
    favorites = [f for f in favorites if f["place_id"] != place_id]
    resp = jsonify({"status": "deleted"})
    save_cookie(resp, cfg.FAV_COOKIE, favorites)
    return resp


@app.route("/favorites/clear", methods=["POST"])
def favorites_clear():
    """
    Clear all favorites by deleting the cookie.

    Returns:
        JSON response confirming cleared status.
    """
    resp = jsonify({"status": "cleared"})
    save_cookie(resp, cfg.FAV_COOKIE, "", max_age=0)
    return resp


# -------------------------
# Weather + Maps Helper Functions
# -------------------------


def get_param(name):
    """
    Get a query parameter from the request.
    Aborts with JSON error if missing.

    Args:
        name (str): The query parameter name.

    Returns:
        str: The query parameter value.
    """
    value = request.args.get(name)
    if not value:
        abort(make_response(jsonify({"error": f"Missing {name}"}), 400))
    return value


def call_api(url, params=None, raw=False):
    """
    Safely call an external API and return JSON or raw response.

    Args:
        url (str): API URL.
        params (dict, optional): Query parameters.
        raw (bool): If True, return the raw Response object instead of JSON.

    Returns:
        tuple: (dict or Response, HTTP status code)
    """
    try:
        r = requests.get(
            url,
            params=params,
            timeout=(cfg.REQUESTS_CONNECT_TIMEOUT, cfg.REQUESTS_RESPONSE_TIMEOUT),
        )
        r.raise_for_status()
        return (r if raw else r.json()), 200
    except requests.RequestException as e:
        return {"error": str(e)}, 500
    except ValueError:
        return {"error": "Invalid response from API"}, 500


# -------------------------
# Weather + Maps Routes
# -------------------------


@app.route("/")
def index():
    """
    Render the main index page.

    Returns:
        HTML response of index.html or 404 if template not found.
    """
    try:
        return render_template("index.html")
    except (TemplateNotFound, TemplateError):
        abort(404)


@app.route("/weather/current")
def current_weather():
    """
    Get current weather for given latitude and longitude.

    Query Parameters:
        lat (str): Latitude.
        lng (str): Longitude.

    Returns:
        JSON response with weather data and status code.
    """
    lat = get_param("lat")
    lng = get_param("lng")
    url = "https://weather.googleapis.com/v1/currentConditions:lookup"
    params = {
        "key": cfg.GOOGLE_API_KEY,
        "location.latitude": lat,
        "location.longitude": lng,
    }
    data, status = call_api(url, params)
    return jsonify(data), status


@app.route("/weather/daily")
def daily_weather():
    """
    Get daily weather forecast for given latitude and longitude.

    Query Parameters:
        lat (str): Latitude.
        lng (str): Longitude.

    Returns:
        JSON response with daily forecast and status code.
    """
    lat = get_param("lat")
    lng = get_param("lng")
    url = "https://weather.googleapis.com/v1/forecast/days:lookup"
    params = {
        "key": cfg.GOOGLE_API_KEY,
        "location.latitude": lat,
        "location.longitude": lng,
    }
    data, status = call_api(url, params)
    return jsonify(data), status


@app.route("/weather/hourly")
def hourly_weather():
    """
    Get hourly weather forecast for given latitude and longitude.

    Query Parameters:
        lat (str): Latitude.
        lng (str): Longitude.

    Returns:
        JSON response with hourly forecast and status code.
    """
    lat = get_param("lat")
    lng = get_param("lng")
    url = "https://weather.googleapis.com/v1/forecast/hours:lookup"
    params = {
        "key": cfg.GOOGLE_API_KEY,
        "location.latitude": lat,
        "location.longitude": lng,
    }
    data, status = call_api(url, params)
    return jsonify(data), status


@app.route("/autocomplete")
def autocomplete():
    """
    Autocomplete places based on query string.

    Query Parameters:
        query (str): Partial place name.

    Returns:
        JSON response with autocomplete results.
    """
    query = get_param("query")
    url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    params = {"input": query, "key": cfg.GOOGLE_API_KEY}
    data, status = call_api(url, params)
    return jsonify(data), status


@app.route("/place_details")
def place_details():
    """
    Get place details for a given place_id.

    Query Parameters:
        place_id (str): Google Place ID.

    Returns:
        JSON response with name, address, geometry or error.
    """
    place_id = get_param("place_id")
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "key": cfg.GOOGLE_API_KEY,
        "fields": "geometry,name,formatted_address",
    }
    data, status = call_api(url, params)
    if status != 200:
        return jsonify(data), status
    if data.get("status") != "OK":
        return jsonify({"error": data.get("status", "Unknown error")}), 400
    result = data.get("result", {})
    response = {
        "name": result.get("name"),
        "address": result.get("formatted_address"),
        "geometry": result.get("geometry"),
    }
    return jsonify(response), 200


@app.route("/icon")
def icon():
    """
    Proxy weather icons to avoid CORS issues.
    Expects query param 'url' with the full icon URL.
    """
    icon_url = request.args.get("url")
    if not icon_url:
        return {"error": "Missing 'url' parameter"}, 400

    # Use the call_api helper to get the raw response
    response, status = call_api(icon_url, raw=True)
    if status != 200:
        return {"error": "Failed to fetch icon"}, status

    # Return the image content with proper headers
    return Response(
        response.content,
        status=200,
        content_type=response.headers.get("Content-Type", "image/svg+xml"),
        headers={"Access-Control-Allow-Origin": "*"}
    )
