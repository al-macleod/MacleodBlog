import React from 'react';
import './styles/App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import TweetFeedPage from './pages/TweetFeedPage';
import SearchPage from './pages/SearchPage';
import UserAuthPage from './pages/UserAuthPage';
import RandomFeedPage from './pages/RandomFeedPage';
import LibraryPage from './pages/LibraryPage';
import UserProfilePage from './pages/UserProfilePage';
import UserSettingsPage from './pages/UserSettingsPage';
import WritingStudioPage from './pages/WritingStudioPage';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/random" element={<RandomFeedPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/tweets" element={<TweetFeedPage />} />
            <Route path="/article/:id" element={<ArticlePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/account" element={<UserAuthPage />} />
            <Route path="/profile/:userId" element={<UserProfilePage />} />
            <Route path="/settings" element={<UserSettingsPage />} />
            <Route path="/studio" element={<WritingStudioPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
