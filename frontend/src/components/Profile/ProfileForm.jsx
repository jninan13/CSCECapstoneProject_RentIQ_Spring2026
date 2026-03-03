/**
 * User profile management page.
 */
import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ProfileForm = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: user?.email || '',
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
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || user?.email || '',
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

  const calculateCompletion = () => {
    const fields = ['first_name', 'last_name', 'email', 'date_of_birth', 'address', 'phone'];
    const filledFields = fields.filter(field => profile[field] && profile[field].trim() !== '');
    return Math.round((filledFields.length / fields.length) * 100);
  };

  const completionPercentage = calculateCompletion();
  const displayName = profile.first_name || profile.last_name
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : 'User';
  const displayEmail = profile.email || 'No email provided';
  const initial = profile.first_name ? profile.first_name.charAt(0).toUpperCase() : 'U';

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
            Account Settings
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Manage your personal profile and preferences
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-colors duration-300 border border-gray-100 dark:border-gray-700">

          <div className="grid grid-cols-1 md:grid-cols-3">

            {/* Left Sidebar - Profile Summary */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-700 dark:to-primary-900 p-8 text-white flex flex-col items-center justify-center border-r border-transparent md:border-r-gray-200 dark:md:border-r-gray-700 transition-colors">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border-4 border-white/30 shadow-inner overflow-hidden mb-4 transition-transform transform group-hover:scale-105 duration-300">
                  <span className="text-5xl font-bold text-white drop-shadow-md">
                    {initial}
                  </span>
                </div>
              </div>
              <h2 className="text-2xl font-semibold mb-1">{displayName}</h2>
              <p className="text-primary-100 text-sm mb-6">{displayEmail}</p>

              {completionPercentage < 100 && (
                <div className="w-full mt-auto pt-6 border-t border-white/20">
                  <div className="text-sm font-medium text-primary-100 mb-2">Profile Completion</div>
                  <div className="w-full bg-white/20 rounded-full h-2.5 mb-1 shadow-inner">
                    <div
                      className="bg-white h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.7)] transition-all duration-500 ease-out"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-right text-primary-100">{completionPercentage}% Complete</div>
                </div>
              )}
            </div>

            {/* Right Side - Form */}
            <div className="p-8 md:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
                  Personal Information
                </h3>

                {message.text && (
                  <div
                    className={`px-4 py-3 rounded-lg flex items-center space-x-3 transition-all duration-300 ${message.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                      }`}
                  >
                    {message.type === 'success' ? (
                      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                    ) : (
                      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                    )}
                    <span className="font-medium">{message.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={profile.first_name}
                        onChange={handleChange}
                        className="pl-10 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors py-2.5"
                        placeholder="John"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={profile.last_name}
                        onChange={handleChange}
                        className="pl-10 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors py-2.5"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profile.email}
                        onChange={handleChange}
                        className="pl-10 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors py-2.5"
                        placeholder="john.doe@example.com"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="address" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Home Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={profile.address}
                        onChange={handleChange}
                        className="pl-10 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors py-2.5"
                        placeholder="123 Main St, City, State 12345"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={profile.phone}
                        onChange={handleChange}
                        className="pl-10 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors py-2.5"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="date_of_birth" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        id="date_of_birth"
                        name="date_of_birth"
                        value={profile.date_of_birth}
                        onChange={handleChange}
                        className="block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors py-2.5 px-3"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-4">
                  <button
                    type="button"
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-6 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary-600 border border-transparent rounded-lg shadow-md py-2.5 px-6 font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center transition-colors">
          <div className="bg-primary-100 dark:bg-primary-800/60 p-3 rounded-full shrink-0">
            <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-300 mb-1">Why we ask for this information</h2>
            <p className="text-sm text-primary-800 dark:text-primary-200/80 mb-2">
              Your profile information helps us provide a personalized experience. We use this to show properties relevant to your location and provide age-appropriate investment recommendations.
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-400/80 flex items-center">
              <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              Your information is kept private and secure. We never share your personal data with third parties.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileForm;
