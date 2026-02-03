/**
 * User profile management page.
 */
import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';

const ProfileForm = () => {
  const [profile, setProfile] = useState({
    date_of_birth: '',
    address: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      const data = response.data;
      
      setProfile({
        date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
        address: data.address || '',
        phone: data.phone || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Convert date string to ISO format if provided
      const updateData = {
        ...profile,
        date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString() : null,
      };

      await userAPI.updateProfile(updateData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
      console.error('Update error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {message.text && (
              <div
                className={`px-4 py-3 rounded ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-400 text-green-700'
                    : 'bg-red-50 border border-red-400 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={profile.date_of_birth}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                rows="3"
                value={profile.address}
                onChange={handleChange}
                className="input-field"
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 card bg-blue-50 border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Why we ask for this information</h2>
          <p className="text-sm text-blue-800">
            Your profile information helps us provide a personalized experience and can be used to:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
            <li>Show properties relevant to your location</li>
            <li>Provide age-appropriate investment recommendations</li>
            <li>Contact you about properties you're interested in</li>
          </ul>
          <p className="text-xs text-blue-700 mt-4">
            Your information is kept private and secure. We never share your personal data with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;
