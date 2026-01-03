App.js                                                                                                                                                                   import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Chart,
  PieController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import WordCloud from "wordcloud";
import "./App.css";

Chart.register(
  PieController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

function App() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 8;
  const [chartType, setChartType] = useState("pie");
  const [chartInstance, setChartInstance] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [sortType, setSortType] = useState("Default");

  useEffect(() => {
    if (data) {
      renderChart();
      renderWordCloud();
    }
    // eslint-disable-next-line
  }, [data, chartType]);

  const analyze = async () => {
    if (!url) {
      alert("Enter product URL");
      return;
    }

    setLoading(true);
    setData(null);
    setCurrentPage(1);

    try {
      const res = await axios.post("http://localhost:5000/api/analyze", {
        url,
      });
      setData(res.data);
    } catch (err) {
      alert("Backend error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (!data) return;

    if (chartInstance) chartInstance.destroy();

    const ctx = document.getElementById("sentimentChart");
    const chart = new Chart(ctx, {
      type: chartType,
      data: {
        labels: ["Positive", "Neutral", "Negative"],
        datasets: [
          {
            data: [data.positive, data.neutral, data.negative],
            backgroundColor: ["#16a34a", "#f59e0b", "#dc2626"],
          },
        ],
      },
      options: {
        responsive: true,
        scales:
          chartType === "bar"
            ? { y: { beginAtZero: true } }
            : {},
      },
    });

    setChartInstance(chart);
  };

  const renderWordCloud = () => {
    if (!data) return;

    const words = data.reviews
      .flatMap((r) => r.review.split(" "))
      .filter((w) => w.length > 3)
      .map((w) => [w, Math.floor(Math.random() * 40) + 10]);

    WordCloud(document.getElementById("wordcloud"), {
      list: words,
      shape: "circle",
    });
  };

  const filteredReviews = () => {
    if (!data) return [];

    let reviews =
      filter === "All"
        ? data.reviews
        : data.reviews.filter((r) => r.sentiment === filter);

    if (keyword) {
      reviews = reviews.filter((r) =>
        r.review.toLowerCase().includes(keyword.toLowerCase())
      );
    }

    if (sortType === "Longest")
      reviews.sort((a, b) => b.review.length - a.review.length);
    if (sortType === "Shortest")
      reviews.sort((a, b) => a.review.length - b.review.length);

    const start = (currentPage - 1) * reviewsPerPage;
    return reviews.slice(start, start + reviewsPerPage);
  };

  const totalPages = () => {
    if (!data) return 1;
    const count =
      filter === "All"
        ? data.reviews.length
        : data.reviews.filter((r) => r.sentiment === filter).length;
    return Math.ceil(count / reviewsPerPage);
  };

  const positivePercent = data
    ? Math.round(
        (data.positive /
          (data.positive + data.neutral + data.negative)) *
          100
      )
    : 0;

  return (
    <div className="app-container">
      <div className="main-box">
        <div className="title">
          <h1>Product Sentiment Analyzer</h1>
          <p>Amazon Review Analysis</p>
        </div>

        <div className="input-area">
          <input
            placeholder="Paste Amazon product URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button onClick={analyze}>Analyze</button>
        </div>

        {loading && <div className="loader"></div>}

        {data && (
          <>
            <div className="score-section">
              <CircularProgressbar
                value={positivePercent}
                text={`${positivePercent}% Positive`}
                styles={buildStyles({
                  pathColor: "#16a34a",
                  textColor: "#111",
                  trailColor: "#e5e7eb",
                })}
              />
            </div>

            <div className="chart-area">
              <canvas id="sentimentChart"></canvas>
            </div>

            <button onClick={() => setChartType(chartType === "pie" ? "bar" : "pie")}>
              Switch to {chartType === "pie" ? "Bar" : "Pie"} Chart
            </button>

            <div className="wordcloud-box">
              <canvas id="wordcloud" width="400" height="300"></canvas>
            </div>

            <div className="filter-sort">
              <input
                placeholder="Search reviews..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <select value={sortType} onChange={(e) => setSortType(e.target.value)}>
                <option value="Default">Default</option>
                <option value="Longest">Longest</option>
                <option value="Shortest">Shortest</option>
              </select>
            </div>

            <div id="tabs">
              {["All", "Positive", "Neutral", "Negative"].map((t) => (
                <span
                  key={t}
                  className={`tab ${filter === t ? "active" : ""}`}
                  onClick={() => {
                    setFilter(t);
                    setCurrentPage(1);
                  }}
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="reviews">
              {filteredReviews().map((r, i) => (
                <div
                  key={i}
                  className={`review ${r.sentiment.toLowerCase()}`}
                >
                  {r.review}
                </div>
              ))}
            </div>

            {totalPages() > 1 && (
              <div className="pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Prev
                </button>
                <span>
                  {currentPage} / {totalPages()}
                </span>
                <button
                  disabled={currentPage === totalPages()}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
