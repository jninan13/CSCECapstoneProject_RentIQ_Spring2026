import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ProfileForm = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    first_name: '', last_name: '', email: user?.email || '',
    date_of_birth: '', address: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data } = await userAPI.getProfile();
      setProfile({
        first_name: data.first_name || '', last_name: data.last_name || '',
        email: data.email || user?.email || '',
        date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
        address: data.address || '', phone: data.phone || '',
      });
    } catch (e) { console.error('Failed to load profile:', e); }
  };

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const calculateCompletion = () => {
    const fields = ['first_name', 'last_name', 'email', 'date_of_birth', 'address', 'phone'];
    return Math.round((fields.filter(f => profile[f]?.trim()).length / fields.length) * 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage({ type: '', text: '' });
    try {
      await userAPI.updateProfile({ ...profile, date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString() : null });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally { setLoading(false); }
  };

  const completion = calculateCompletion();
  const initial = profile.first_name ? profile.first_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Account Settings</h1>
        <p className="text-sm text-gray-500 mb-6">Manage your personal profile and preferences</p>

        {/* Profile header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-blue-600">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {profile.first_name || profile.last_name ? `${profile.first_name} ${profile.last_name}`.trim() : 'User'}
            </p>
            <p className="text-sm text-gray-500 truncate">{profile.email || 'No email provided'}</p>
          </div>
          {completion < 100 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400 mb-1">{completion}% complete</p>
              <div className="w-24 bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${completion}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {message.text && (
              <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" id="first_name" value={profile.first_name} onChange={handleChange} placeholder="John" />
              <Field label="Last Name" id="last_name" value={profile.last_name} onChange={handleChange} placeholder="Doe" />
              <Field label="Email Address" id="email" type="email" value={profile.email} onChange={handleChange} placeholder="john@example.com" span2 />
              <Field label="Home Address" id="address" value={profile.address} onChange={handleChange} placeholder="123 Main St, City, State" span2 />
              <Field label="Phone Number" id="phone" type="tel" value={profile.phone} onChange={handleChange} placeholder="(555) 123-4567" />
              <Field label="Date of Birth" id="date_of_birth" type="date" value={profile.date_of_birth} onChange={handleChange} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" className="btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6 flex gap-3 items-start">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-blue-800 font-medium">Why we ask for this information</p>
            <p className="text-xs text-blue-700 mt-1">Your profile helps us provide personalized property recommendations. Your data is kept private and secure.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, id, type = 'text', value, onChange, placeholder, span2 }) => (
  <div className={span2 ? 'sm:col-span-2' : ''}>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input type={type} id={id} name={id} value={value} onChange={onChange} className="input-field" placeholder={placeholder} />
  </div>
);

export default ProfileForm;
