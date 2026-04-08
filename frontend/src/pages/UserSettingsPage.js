import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/UserSettingsPage.css';

const UserSettingsPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    bio: '',
    interests: [],
    website: '',
    location: '',
    phone: '',
    socialHandles: {
      twitter: '',
      linkedin: '',
      github: '',
      instagram: ''
    }
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const predefinedInterests = [
    'Technology', 'Design', 'Marketing', 'Business', 'Health',
    'Fitness', 'Travel', 'Food', 'Art', 'Music', 'Writing', 'Education'
  ];

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get('/users/me');
        const profile = response.data.user;
        
        setFormData({
          bio: profile.bio || '',
          interests: profile.interests || [],
          website: profile.website || '',
          location: profile.location || '',
          phone: profile.phone || '',
          socialHandles: profile.socialHandles || {
            twitter: '',
            linkedin: '',
            github: '',
            instagram: ''
          }
        });
        setLoading(false);
      } catch (error) {
        if (error.response?.status === 401) {
          navigate('/account');
          return;
        }

        console.error('Failed to load profile:', error);
        setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to load profile' });
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      socialHandles: {
        ...prev.socialHandles,
        [name]: value
      }
    }));
  };

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put('/users/profile', formData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="user-settings-page"><div className="loader">Loading...</div></div>;
  }

  return (
    <div className="user-settings-page">
      <div className="settings-container">
        <h1>Edit Profile</h1>

        {message.text && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleTextChange}
              placeholder="Tell us about yourself"
              maxLength="500"
              rows="4"
            />
            <span className="char-count">{formData.bio.length}/500</span>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              name="location"
              value={formData.location}
              onChange={handleTextChange}
              placeholder="Your location"
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="url"
              name="website"
              value={formData.website}
              onChange={handleTextChange}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleTextChange}
              placeholder="Your phone number"
            />
          </div>

          <div className="form-group">
            <label>Interests</label>
            <div className="interests-grid">
              {predefinedInterests.map(interest => (
                <label key={interest} className="interest-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={() => handleInterestToggle(interest)}
                  />
                  <span>{interest}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="social-handles">
            <h3>Social Media</h3>
            
            <div className="form-group">
              <label htmlFor="twitter">Twitter</label>
              <div className="social-input">
                <span>twitter.com/</span>
                <input
                  id="twitter"
                  type="text"
                  name="twitter"
                  value={formData.socialHandles.twitter}
                  onChange={handleSocialChange}
                  placeholder="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="linkedin">LinkedIn</label>
              <div className="social-input">
                <span>linkedin.com/in/</span>
                <input
                  id="linkedin"
                  type="text"
                  name="linkedin"
                  value={formData.socialHandles.linkedin}
                  onChange={handleSocialChange}
                  placeholder="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="github">GitHub</label>
              <div className="social-input">
                <span>github.com/</span>
                <input
                  id="github"
                  type="text"
                  name="github"
                  value={formData.socialHandles.github}
                  onChange={handleSocialChange}
                  placeholder="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="instagram">Instagram</label>
              <div className="social-input">
                <span>instagram.com/</span>
                <input
                  id="instagram"
                  type="text"
                  name="instagram"
                  value={formData.socialHandles.instagram}
                  onChange={handleSocialChange}
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserSettingsPage;
