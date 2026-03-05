import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header, Footer, ScrollToTop } from './components/layout'

// Pages
import Home from './pages/Home/Home'
import About from './pages/About/About'
import Team from './pages/Team/Team'
import Events from './pages/Events/Events'
import Media from './pages/Media/Media'
import Blog from './pages/Blog/Blog'
import Contact from './pages/Contact/Contact'
import Testimonies from './pages/Testimonies/Testimonies'

function App() {
  return (
    <BrowserRouter basename="/fgc-testing/">
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/team" element={<Team />} />
        <Route path="/events" element={<Events />} />
        <Route path="/media" element={<Media />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/testimonies" element={<Testimonies />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}

export default App
