from flask import Flask, render_template, request, jsonify, abort
from jinja2 import TemplateNotFound, TemplateError
import requests
from app.config import DebugConfig as cfg


app = Flask(__name__)


# -------------------------
# Helper functions
# -------------------------


def get_param(name):
    """Get a query parameter, return error JSON if missing."""
    value = request.args.get(name)
    if not value:
        return None, jsonify({"error": f"Missing {name}"}), 400
    return value, None, None


def call_api(url, params):
    """Call an external API safely and return JSON with status code."""
    try:
        r = requests.get(
            url,
            params=params,
            timeout=(cfg.REQUESTS_CONNECT_TIMEOUT, cfg.REQUESTS_RESPONSE_TIMEOUT),
        )
        r.raise_for_status()
        return r.json(), 200
    except requests.RequestException as e:
        return {"error": str(e)}, 500
    except ValueError:
        return {"error": "Invalid response from API"}, 500


# -------------------------
# Routes
# -------------------------


@app.route("/")
def index():
    try:
        return render_template("index.html")
    except (TemplateNotFound, TemplateError):
        abort(404)


@app.route("/weather/current")
def current_weather():
    lat, err, status = get_param("lat")
    if err:
        return err, status
    lng, err, status = get_param("lng")
    if err:
        return err, status

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
    lat, err, status = get_param("lat")
    if err:
        return err, status
    lng, err, status = get_param("lng")
    if err:
        return err, status

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
    lat, err, status = get_param("lat")
    if err:
        return err, status
    lng, err, status = get_param("lng")
    if err:
        return err, status

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
    query, err, status = get_param("query")
    if err:
        return err, status

    url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    params = {"input": query, "key": cfg.GOOGLE_API_KEY}

    data, status = call_api(url, params)
    return jsonify(data), status


@app.route("/place_details")
def place_details():
    place_id, err, status = get_param("place_id")
    if err:
        return err, status

    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "key": cfg.GOOGLE_API_KEY,
        "fields": "geometry,name,formatted_address",
    }

    data, status = call_api(url, params)
    if status != 200:
        return jsonify(data), status

    # Handle Google API status not OK
    if data.get("status") != "OK":
        return jsonify({"error": data.get("status", "Unknown error")}), 400

    result = data.get("result", {})
    response = {
        "name": result.get("name"),
        "address": result.get("formatted_address"),
        "geometry": result.get("geometry"),
    }
    return jsonify(response), 200


# -------------------------
# Run app
# -------------------------

if __name__ == "__main__":
    app.run(host=cfg.HOST, port=cfg.PORT, debug=cfg.DEBUG)
