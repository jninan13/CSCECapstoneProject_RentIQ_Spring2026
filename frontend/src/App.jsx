import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Navbar from './components/Layout/Navbar';
import PrivateRoute from './components/Layout/PrivateRoute';

import About from './components/About/About';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import OAuthSuccess from './components/Auth/OAuthSuccess';
import PropertyList from './components/Properties/PropertyList';
import PropertyDetail from './components/Properties/PropertyDetail';
import PropertyCompare from './components/Properties/PropertyCompare';
import FavoritesList from './components/Favorites/FavoritesList';
import ProfileForm from './components/Profile/ProfileForm';
import ChatBot from './components/Chat/ChatBot';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <ChatBot />

            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/about" element={<About />} />
              <Route path="/oauth-success" element={<OAuthSuccess />} />

              <Route path="/properties" element={<PrivateRoute><PropertyList /></PrivateRoute>} />
              <Route path="/properties/compare" element={<PrivateRoute><PropertyCompare /></PrivateRoute>} />
              <Route path="/properties/:id" element={<PrivateRoute><PropertyDetail /></PrivateRoute>} />
              <Route path="/favorites" element={<PrivateRoute><FavoritesList /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><ProfileForm /></PrivateRoute>} />

              <Route path="/" element={<Navigate to="/properties" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
