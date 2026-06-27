import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Quiz from "./pages/Quiz.jsx";
import Results from "./pages/Results.jsx";
import Privacy from "./pages/Privacy.jsx";
import Terms from "./pages/Terms.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<Landing />} />
      <Route path="/quiz"    element={<Quiz />} />
      <Route path="/results" element={<Results />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms"   element={<Terms />} />
    </Routes>
  );
}
