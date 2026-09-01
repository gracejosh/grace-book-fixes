import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import PopupAds from '@/components/PopupAds';
import Home from '@/pages/Home';
import Verses from '@/pages/Verses';
import Books from '@/pages/Books';
import Courses from '@/pages/Courses';
import Quiz from '@/pages/Quiz';
import Chat from '@/pages/Chat';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import About from '@/pages/About';
import Flyers from '@/pages/Flyers';
import Posts from '@/pages/Posts';
import Blog from '@/pages/Blog';
import Settings from '@/pages/Settings';
import Notebook from '@/pages/Notebook';
import NotFound from '@/pages/NotFound';

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <BrowserRouter>
                <ScrollToTop />
                <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <main className="flex-1 pb-16 lg:pb-0">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/verses" element={<Verses />} />
                      <Route path="/books" element={<Books />} />
                      <Route path="/courses" element={<Courses />} />
                      <Route path="/quiz" element={<Quiz />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/flyers" element={<Flyers />} />
                      <Route path="/posts" element={<Posts />} />
                      <Route path="/blog" element={<Blog />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/notebook" element={<Notebook />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <Footer />
                </div>
                <PopupAds />
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
