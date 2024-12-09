import React, { useState, useEffect } from "react";
import "./popup.css";
import Footer from "./Footer";

const Popup = () => {
    const [totals, setTotals] = useState([]);
    const [closedTotals, setClosedTotals] = useState([]);
    const [visitCounts, setVisitCounts] = useState({}); // To store visit counts
    const [count, setCount] = useState(0);
    const [countActive, setCountActive] = useState(0);
    const [activeTabs, setActiveTabs] = useState([]);

    const handleRedirect = () => {
        // Open the home page in a new tab
        chrome.tabs.create({ url: chrome.runtime.getURL("index.html#/home") });
    };

    useEffect(() => {
        // Fetch siteData, closedTabs and visitCount from storage
        const fetchData = () => {
            chrome.storage.local.get(["siteData", "closedTabs", "visitCount", "focusedTabData"], (data) => {
                const siteData = data.siteData || {};
                const closedTabs = data.closedTabs || {};
                const visitCount = data.visitCount || {};
                const focusedTabData = data.focusedTabData || {};

                // if new website is opened, update count
                setCount(Object.keys(siteData).length + Object.keys(closedTabs).length);
                setCountActive(Object.keys(siteData).length);

                // siteData for display
                const allData = Object.entries({ ...siteData })
                    .map(([hostname, { time, name }]) => ({ hostname: name, time }))
                    .sort((a, b) => b.time - a.time); // Sort by time (high to low)

                setTotals(allData);

                // Separate closed websites for different section display
                const closedData = Object.entries(closedTabs)
                    .map(([hostname, { time, name }]) => ({ hostname: name, time }))
                    .sort((a, b) => b.time - a.time);

                setClosedTotals(closedData);

                // Active tabs top 3
                const activeTabs = Object.entries({ ...focusedTabData })
                    .map(([hostname, { time, name }]) => ({ hostname: name, time }))
                    .sort((a, b) => b.time - a.time)
                    .slice(0, 3);

                setActiveTabs(activeTabs);



                // Visit count for display  
                setVisitCounts(visitCount);
            });
        };

        // Fetch data periodically
        fetchData();
        const interval = setInterval(fetchData, 1000);

        return () => clearInterval(interval);
    }, []);
    // console.log(activeTabs);    
    // Convert time to hours, minutes, and seconds
    const formatTime = (time) => {
        const hours = Math.floor(time / 1000 / 60 / 60);
        const minutes = Math.floor((time / 1000 / 60) % 60);
        const seconds = Math.floor((time / 1000) % 60);
        return `${hours > 0 ? hours + " hr " : ""}${minutes} min ${seconds} sec`;
    };

    return (
        <div className="popup-container">
            <h1>Browser Activity Tracker</h1>

            {/* All Websites */}
            <div className="site-list">
                <h2>Background Active Websites</h2>
                {totals.map(({ hostname, time }, index) => (
                    <div key={index} className="site-item">
                        {hostname === "newtab" ? null : (
                            <span>{hostname}</span>
                        )}
                        {hostname === "newtab" ? null : (
                            <span>{formatTime(time)}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* Most active section */}
            {/* <div className="most-active-section">
                <h2>Most Active Websites</h2>
                {activeTabs.map(({ hostname, time }, index) => (
                    console.log(hostname),
                    <div key={index} className="site-item">
                        {formatTime(time) === "NaN min NaN sec" ? null : (
                            <>
                            <span>{hostname}</span>
                            <span>{formatTime(time)}</span>
                            </>
                        )}
                    </div>
                ))}
            </div> */}


            {/* Visit Count Section */}
            <div className="visit-count-section">
                <h2>Visit Count</h2>
                {/* sort by count */}
                {Object.entries(visitCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([hostname, count], index) => (
                        <div key={index} className="site-item">
                            <span>{hostname}</span>
                            {count == 1 ? <span>{count} time</span> : <span>{count} times</span>}
                        </div>
                    ))}
            </div>

            {/* Closed Websites */}
            {/* only if there are closed websites then display or else nothing */}
            {closedTotals.length > 0 && (
                <div className="site-list">
                    <h2>Closed Websites</h2>
                    {closedTotals.map(({ hostname, time }, index) => (
                        <div key={index} className="site-item">
                            {hostname === "newtab" ? null : (
                                <span>{hostname}</span>
                            )}
                            {hostname === "newtab" ? null : (
                                <span>{formatTime(time)}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Stats */}
            <hr />
            <div>
                <h1>Stats</h1>
                {/* Count of number of websites */}
                <div className="site-count">
                    <h2>Websites Visited: <span>{count}</span></h2>
                </div>

                {/* Count of number of active websites */}
                <div className="site-count">
                    <h2>Active Websites: <span>{countActive}</span></h2>
                </div>
            </div>

            {/* goto homepage */}
            <div className="text-center">
                <button className="btn btn-dark"  onClick={handleRedirect}>home</button>
            </div>
            <br />
            <Footer />
        </div>
    );
};

export default Popup;
