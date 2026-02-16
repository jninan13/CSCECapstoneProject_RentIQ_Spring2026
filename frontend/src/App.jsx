/**
 * Main App component with routing.
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout
import Navbar from './components/Layout/Navbar';
import PrivateRoute from './components/Layout/PrivateRoute';

//About
import About from './components/About/About';

// Auth
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// Properties
import PropertyList from './components/Properties/PropertyList';
import PropertyDetail from './components/Properties/PropertyDetail';

// Favorites
import FavoritesList from './components/Favorites/FavoritesList';

// Profile
import ProfileForm from './components/Profile/ProfileForm';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<About />} />

            
            {/* Protected routes */}
            <Route
              path="/properties"
              element={
                <PrivateRoute>
                  <PropertyList />
                </PrivateRoute>
              }
            />
            <Route
              path="/properties/:id"
              element={
                <PrivateRoute>
                  <PropertyDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <PrivateRoute>
                  <FavoritesList />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfileForm />
                </PrivateRoute>
              }
            />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/properties" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
