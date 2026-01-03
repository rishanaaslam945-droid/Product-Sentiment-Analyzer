from flask import Flask, request, jsonify
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from textblob import TextBlob
import pandas as pd
import os
from flask import send_file

import time

app = Flask(__name__)
CORS(app)


# ✅ ROOT ROUTE (THIS FIXES "PAGE NOT FOUND")
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Flask backend is running successfully 🚀"
    })


def scrape_amazon(url):
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )

    driver.get(url)
    time.sleep(5)

    reviews = []
    elements = driver.find_elements(By.CSS_SELECTOR, "span[data-hook='review-body'] span")

    for e in elements[:20]:
        reviews.append(e.text.strip())

    driver.quit()
    return reviews


def get_sentiment(text):
    score = TextBlob(text).sentiment.polarity
    if score > 0.1:
        return "Positive"
    elif score < -0.1:
        return "Negative"
    else:
        return "Neutral"


# ✅ API ROUTE USED BY REACT
@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"error": "URL is required"}), 400

    url = data["url"]

    try:
        reviews = scrape_amazon(url)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    result = []
    pos = neu = neg = 0

    for r in reviews:
        sentiment = get_sentiment(r)
        result.append({
            "review": r,
            "sentiment": sentiment
        })

        if sentiment == "Positive":
            pos += 1
        elif sentiment == "Negative":
            neg += 1
        else:
            neu += 1

    return jsonify({
        "reviews": result,
        "positive": pos,
        "neutral": neu,
        "negative": neg,
        "total": len(result)
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
