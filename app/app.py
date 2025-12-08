import json
import logging
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

# -------------------------
# App + Logging
# -------------------------

app = Flask(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# -------------------------
# Cookie Helpers
# -------------------------


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
# Favorites Routes (Safe)
# -------------------------


@app.route("/favorites/get", methods=["GET"])
def favorites_get():
    # Possible exceptions handled: TypeError, ValueError, KeyError, JSON errors
    try:
        favorites = sanitize_favorites(load_cookie(cfg.FAV_COOKIE, default=[]))
        place_id = request.args.get("place_id")

        if place_id:
            fav = next((f for f in favorites if f["place_id"] == place_id), None)
            if not fav:
                return jsonify({"error": "Not found"}), 400
            return jsonify(fav), 200

        return jsonify(favorites), 200

    except (TypeError, ValueError, KeyError, json.JSONDecodeError):
        logger.exception("favorites_get failed")
        return jsonify({"error": "Internal error"}), 500


@app.route("/favorites/set", methods=["POST"])
def favorites_set():
    # Possible exceptions handled: TypeError, ValueError, KeyError, JSON errors
    try:
        place_id = request.args.get("place_id")
        name = request.args.get("name")

        if not place_id or not name:
            return jsonify({"error": "Missing place_id or name"}), 400

        favorites = sanitize_favorites(load_cookie(cfg.FAV_COOKIE, default=[]))

        # update existing
        for fav in favorites:
            if fav["place_id"] == place_id:
                fav["name"] = name
                resp = jsonify({"status": "updated"})
                save_cookie(resp, cfg.FAV_COOKIE, favorites)
                return resp

        if len(favorites) >= cfg.MAX_FAVORITES:
            return jsonify({"error": "Limit reached"}), 409

        favorites.append({"place_id": place_id, "name": name})
        resp = jsonify({"status": "added"})
        save_cookie(resp, cfg.FAV_COOKIE, favorites)
        return resp

    except (TypeError, ValueError, KeyError, json.JSONDecodeError):
        logger.exception("favorites_set failed")
        return jsonify({"error": "Internal error"}), 500


@app.route("/favorites/delete", methods=["POST"])
def favorites_delete():
    # Possible exceptions handled: TypeError, ValueError, KeyError, JSON errors
    try:
        place_id = request.args.get("place_id")
        if not place_id:
            return jsonify({"error": "Missing place_id"}), 400

        favorites = sanitize_favorites(load_cookie(cfg.FAV_COOKIE, default=[]))

        if not any(f["place_id"] == place_id for f in favorites):
            return jsonify({"error": "Not found"}), 400

        favorites = [f for f in favorites if f["place_id"] != place_id]
        resp = jsonify({"status": "deleted"})
        save_cookie(resp, cfg.FAV_COOKIE, favorites)
        return resp

    except (TypeError, ValueError, KeyError, json.JSONDecodeError):
        logger.exception("favorites_delete failed")
        return jsonify({"error": "Internal error"}), 500


@app.route("/favorites/clear", methods=["POST"])
def favorites_clear():
    # Possible exceptions handled: TypeError, ValueError
    try:
        resp = jsonify({"status": "cleared"})
        save_cookie(resp, cfg.FAV_COOKIE, "", max_age=0)
        return resp
    except (TypeError, ValueError):
        logger.exception("favorites_clear failed")
        return jsonify({"error": "Internal error"}), 500


# -------------------------
# Query Param Helper
# -------------------------


def get_param(name):
    val = request.args.get(name)
    if not val:
        return abort(make_response(jsonify({"error": f"Missing {name}"}), 400))
    return val


# -------------------------
# API Caller – Safe
# -------------------------


def call_api(url, params=None, raw=False):
    try:
        r = requests.get(
            url,
            params=params,
            timeout=(cfg.REQUESTS_CONNECT_TIMEOUT, cfg.REQUESTS_RESPONSE_TIMEOUT),
        )
        r.raise_for_status()
        return (r if raw else r.json()), 200

    except requests.Timeout:
        logger.error("Timeout calling API: %s", url)
        return {"error": "External service timed out"}, 504

    except requests.HTTPError:
        logger.error("HTTP error calling API: %s", url)
        return {"error": "External service error"}, 502

    except requests.RequestException:
        logger.error("Request failure calling API: %s", url)
        return {"error": "Service unavailable"}, 502

    except ValueError:
        # JSON decoding or other value errors
        logger.exception("Value error when processing API response: %s", url)
        return {"error": "Invalid response from external service"}, 502


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


@app.route("/weather/current")
def current_weather():
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


# -------------------------
# Places API Routes
# -------------------------


@app.route("/autocomplete")
def autocomplete():
    query = get_param("query")

    url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    params = {"input": query, "key": cfg.GOOGLE_API_KEY}

    data, status = call_api(url, params)
    return jsonify(data), status


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
        return jsonify(data), status

    if not isinstance(data, dict) or data.get("status") != "OK":
        return jsonify({"error": "Lookup failed"}), 400

    result = data.get("result", {})
    response = {
        "name": result.get("name"),
        "address": result.get("formatted_address"),
        "geometry": result.get("geometry"),
    }
    return jsonify(response), 200


# -------------------------
# Icon Proxy (Safe)
# -------------------------


@app.route("/icon")
def icon():
    icon_url = request.args.get("url")
    if not icon_url:
        return jsonify({"error": "Missing url"}), 400

    resp, status = call_api(icon_url, raw=True)
    if status != 200:
        return jsonify({"error": "Failed to fetch icon"}), status

    # resp is a requests.Response when raw=True
    return Response(
        resp.content,
        status=200,
        content_type=resp.headers.get("Content-Type", "image/svg+xml"),
        headers={"Access-Control-Allow-Origin": "*"},
    )
