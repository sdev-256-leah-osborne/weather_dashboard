from flask import Flask, render_template, request, jsonify
from config import DebugConfig as cfg
import requests
import os


app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html", google_api_key=cfg.GOOGLE_API_KEY)


@app.route("/weather/current")
def current_weather():
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    if not lat or not lng:
        return jsonify({"error": "Missing coordinates"}), 400

    url = "https://weather.googleapis.com/v1/currentConditions:lookup"
    params = {
        "key": cfg.GOOGLE_API_KEY,
        "location.latitude": lat,
        "location.longitude": lng,
    }

    try:
        r = requests.get(url, params=params)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500


@app.route("/weather/daily")
def daily_weather():
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    if not lat or not lng:
        return jsonify({"error": "Missing coordinates"}), 400

    url = "https://weather.googleapis.com/v1/forecast/days:lookup"
    params = {
        "key": cfg.GOOGLE_API_KEY,
        "location.latitude": lat,
        "location.longitude": lng,
    }

    try:
        r = requests.get(url, params=params)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500


@app.route("/weather/hourly")
def hourly_weather():
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    if not lat or not lng:
        return jsonify({"error": "Missing coordinates"}), 400

    url = "https://weather.googleapis.com/v1/forecast/hours:lookup"
    params = {
        "key": cfg.GOOGLE_API_KEY,
        "location.latitude": lat,
        "location.longitude": lng,
    }

    try:
        r = requests.get(url, params=params)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500


@app.route("/autocomplete", methods=["GET"])
def autocomplete():
    query = request.args.get("query")
    if not query:
        return jsonify({"error": "Missing query"}), 400

    # Call Google Places Autocomplete API
    url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    params = {
        "input": query,
        "key": cfg.GOOGLE_API_KEY,
    }

    try:
        r = requests.get(url, params=params)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500


@app.route("/place_details")
def place_details():
    place_id = request.args.get("place_id")
    if not place_id:
        return jsonify({"error": "Missing place_id"}), 400

    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "key": cfg.GOOGLE_API_KEY,
        "fields": "geometry,name,formatted_address",  # request only needed fields
    }

    try:
        r = requests.get(url, params=params)
        r.raise_for_status()
        data = r.json()

        if data.get("status") != "OK":
            return jsonify({"error": data.get("status", "Unknown error")}), 400

        result = data.get("result", {})
        response = {
            "name": result.get("name"),
            "address": result.get("formatted_address"),
            "geometry": result.get("geometry"),
        }

        return jsonify(response)
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host=cfg.HOST, port=cfg.PORT, debug=cfg.DEBUG)
