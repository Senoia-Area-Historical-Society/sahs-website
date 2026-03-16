import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Museum from './pages/Museum';
import LocationAndHours from './pages/LocationAndHours';
import CarmichaelHouse from './pages/CarmichaelHouse';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import HistoricalPlaces from './pages/HistoricalPlaces';
import HistoricalPlaceDetail from './pages/HistoricalPlaceDetail';
import Media from './pages/Media';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-cream selection:bg-tan selection:text-white">
      <Header />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about-sahs" element={<About />} />
          <Route path="/museum" element={<Museum />} />
          <Route path="/location-and-hours" element={<LocationAndHours />} />
          <Route path="/carmichael-house" element={<CarmichaelHouse />} />
          <Route path="/contact-sahs" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          
          {/* Dynamic Content Views */}
          <Route path="/news" element={<News />} />
          <Route path="/news/:slug" element={<NewsDetail />} />
          <Route path="/historic-structures-and-places" element={<HistoricalPlaces />} />
          <Route path="/historic-structures-and-places/:slug" element={<HistoricalPlaceDetail />} />
          <Route path="/media" element={<Media />} />
          
          {/* Status Pages */}
          <Route path="/401" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
