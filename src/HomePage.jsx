import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Footer from "./Footer";

function HomePage() {
    const [data, setData] = useState({
        activeTabs: {},
        closedTabs: {},
        visitCount: {},
        siteData: {},
        focusedTabData: {},
    });

    // Categories for grouping websites (modify as necessary)
    const categories = {
        "Social Media": ["facebook.com", "twitter.com", "instagram.com"],
        "Shopping": ["amazon.com", "ebay.com", "etsy.com"],
        "News": ["bbc.com", "cnn.com", "nytimes.com"],
        "Productivity": ["notion.so", "trello.com", "slack.com"],
        "Entertainment": ["youtube.com", "netflix.com", "spotify.com"],
        "Other": [],
    };

    useEffect(() => {
        // Function to fetch data from chrome.storage.local
        const fetchData = () => {
            chrome.storage.local.get(
                ["activeTabs", "closedTabs", "visitCount", "siteData", "focusedTabData"],
                (result) => {
                    setData({
                        activeTabs: result.activeTabs || {},
                        closedTabs: result.closedTabs || {},
                        visitCount: result.visitCount || {},
                        siteData: result.siteData || {},
                        focusedTabData: result.focusedTabData || {},
                    });
                }
            );
        };

        // Fetch data initially
        fetchData();

        // Set interval to fetch data every second
        const interval = setInterval(fetchData, 1000);

        // Clear interval on component unmount
        return () => clearInterval(interval);
    }, []);

    // Sort visit count and time spent on websites
    const sortedVisitCount = Object.entries(data.visitCount).sort((a, b) => b[1] - a[1]);
    const sortedTimeSpent = Object.entries(data.siteData).sort(
        (a, b) => b[1].time - a[1].time
    );

    // Function to categorize websites
    const categorizeWebsites = () => {
        const categorized = Object.entries(data.siteData).reduce((acc, [site, { time }]) => {
            // Check which category the site belongs to
            let foundCategory = "Other";
            for (const [category, websites] of Object.entries(categories)) {
                if (websites.some((website) => site.includes(website))) {
                    foundCategory = category;
                    break;
                }
            }
            if (!acc[foundCategory]) {
                acc[foundCategory] = [];
            }
            acc[foundCategory].push({ site, time });
            return acc;
        }, {});

        // Sort each category by time spent
        for (const category in categorized) {
            categorized[category] = categorized[category].sort((a, b) => b.time - a.time);
        }

        return categorized;
    };

    const categorizedWebsites = categorizeWebsites();

    function formatTime(time) {
        const hours = Math.floor(time / 1000 / 60 / 60);
        const minutes = Math.floor((time / 1000 / 60) % 60);
        const seconds = Math.floor((time / 1000) % 60);
        return `${hours > 0 ? hours + " hr " : ""}${minutes} min ${seconds} sec`;
    }

    const updateStats = () => {
        chrome.storage.local.get(
            ["activeTabs", "closedTabs", "visitCount", "siteData", "focusedTabData"],
            (result) => {
                setData({
                    activeTabs: result.activeTabs || {},
                    closedTabs: result.closedTabs || {},
                    visitCount: result.visitCount || {},
                    siteData: result.siteData || {},
                    focusedTabData: result.focusedTabData || {},
                });
            }
        );
    };
    
    return (
        <div className="container p-4" style={{backgroundColor: "#f8f9fa"}}>
            <h1>Website Usage Details</h1>

            {/* Most Visited Websites Section */}
            <section>
                <h2>Most Visited Websites</h2>
                <ul className="list-group mb-4">
                    {sortedVisitCount.map(([site, count]) => (
                        <li key={site} className="list-group-item d-flex justify-content-between">
                            {site} <span className="badge bg-warning">{count} times</span>
                            <span className="badge bg-info">
                                {formatTime(data.siteData[site]?.time || 0)}
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            <hr />

            {/* Category-wise Websites */}
            <section>
                <h2>Category-wise Websites</h2>
                {Object.entries(categorizedWebsites).map(([category, websites]) => (
                    <div key={category}>
                        <h5>{category}</h5>
                        <ul className="list-group mb-4">
                            {websites.map(({ site, time }) => (
                                <li key={site} className="list-group-item d-flex justify-content-between">
                                    {site} <span className="badge bg-warning">{formatTime(time)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>

            <hr />

            {/* Tips to Limit Time Spent */}
            <section>
                <h2>Tips to Limit Time Spent</h2>
                <ul className=" mb-4">
                    <li className="">Set time limits for distracting websites using browser extensions.</li>
                    <li className="">Track your browsing habits regularly to become more aware.</li>
                    <li className="">Consider blocking certain websites during work hours.</li>
                    <li className="">Create a list of productive sites and set goals for how much time to spend on them.</li>
                </ul>
            </section>

            <hr />

            <Footer />
            {/* Additional Ideas
            <section>
                <h2>Suggestions for Managing Digital Well-being</h2>
                <ul className="list-group mb-4">
                    <li className="list-group-item">Use browser extensions that track your time to help you stay on top of your habits.</li>
                    <li className="list-group-item">Set daily limits for social media usage.</li>
                    <li className="list-group-item">Consider turning off push notifications from less important apps or websites.</li>
                </ul>
            </section> */}
        </div>
    );
}

export default HomePage;
