import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import './App.css';

function App() {
  return (
    <>
      <nav style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link to="/">Home</Link>
        <Link to="/about">About SAHS</Link>
      </nav>
      
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      <footer style={{ padding: '2rem', marginTop: 'auto', borderTop: '1px solid var(--border)' }}>
        <p>© 2026 Senoia Area Historical Society</p>
      </footer>
    </>
  );
}

export default App;
