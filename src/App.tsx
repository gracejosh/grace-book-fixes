import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Navbar from '@/components/Navbar';
import ScrollToTop from '@/components/ScrollToTop';
import AdPopup from '@/components/AdPopup';
import Home from '@/pages/Home';
import Posts from '@/pages/Posts';
import Books from '@/pages/Books';
import Courses from '@/pages/Courses';
import Quiz from '@/pages/Quiz';
import Chat from '@/pages/Chat';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import About from '@/pages/About';
import Flyers from '@/pages/Flyers';
import Blogs from '@/pages/Blogs';
import Settings from '@/pages/Settings';
import Live from '@/pages/Live';
import Notebook from '@/pages/Notebook';
import Bible from '@/pages/Bible';
import Donate from '@/pages/Donate';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
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
                  <main className="flex-1 pt-14 pb-16">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/posts" element={<Posts />} />
                      <Route path="/books" element={<Books />} />
                      <Route path="/courses" element={<Courses />} />
                      <Route path="/quiz" element={<Quiz />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/flyers" element={<Flyers />} />
                      <Route path="/blogs" element={<Blogs />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/live" element={<Live />} />
                      <Route path="/notebook" element={<Notebook />} />
                      <Route path="/bible" element={<Bible />} />
                      <Route path="/donate" element={<Donate />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <AdPopup />
                </div>
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
