import { HashRouter, Routes, Route, Link } from "react-router-dom";
import PopupPage from "./Popup";
import HomePage from "./HomePage";

// Use HashRouter for browser extensions
function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<PopupPage />} />
                <Route path="/home" element={<HomePage />} />
            </Routes>
        </HashRouter>

    );
}

export default App;