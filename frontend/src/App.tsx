import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./ThemeContext";
import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ContactPage from "./pages/ContactPage";
import "./index.css";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </ErrorBoundary>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  );
}
