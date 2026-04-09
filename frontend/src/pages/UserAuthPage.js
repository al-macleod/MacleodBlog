import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import api from '../services/api';
import '../styles/UserAuthPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const predefinedInterests = [
  'Technology', 'Design', 'Marketing', 'Business', 'Health', 'Fitness', 'Travel', 'Food', 'Art', 'Music', 'Writing', 'Education'
];

const initialRegisterForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  dateOfBirth: '',
  gender: 'prefer-not-to-say',
  location: '',
  bio: '',
  interests: []
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getPasswordChecks = (password = '') => ({
  minLength: password.length >= 8,
  hasLower: /[a-z]/.test(password),
  hasUpper: /[A-Z]/.test(password),
  hasNumber: /\d/.test(password)
});

const getPasswordStrength = (password = '') => {
  const checks = getPasswordChecks(password);
  const score = Object.values(checks).filter(Boolean).length;

  if (!password) {
    return { score: 0, label: 'Enter a password', tone: 'neutral', checks };
  }

  if (score <= 1) {
    return { score, label: 'Weak', tone: 'weak', checks };
  }

  if (score === 2 || score === 3) {
    return { score, label: 'Medium', tone: 'medium', checks };
  }

  return { score, label: 'Strong', tone: 'strong', checks };
};

function UserAuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetForm, setResetForm] = useState({ token: '', password: '', confirmPassword: '' });

  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const githubEnabled = Boolean(process.env.REACT_APP_GITHUB_CLIENT_ID);

  const registerPasswordStrength = useMemo(() => getPasswordStrength(registerForm.password), [registerForm.password]);
  const resetPasswordStrength = useMemo(() => getPasswordStrength(resetForm.password), [resetForm.password]);
  const registerEmailValid = useMemo(() => (!registerForm.email || emailRegex.test(registerForm.email)), [registerForm.email]);
  const forgotEmailValid = useMemo(() => (!forgotEmail || emailRegex.test(forgotEmail)), [forgotEmail]);
  const registerPasswordsMatch = useMemo(
    () => (!registerForm.confirmPassword || registerForm.password === registerForm.confirmPassword),
    [registerForm.confirmPassword, registerForm.password]
  );
  const resetPasswordsMatch = useMemo(
    () => (!resetForm.confirmPassword || resetForm.password === resetForm.confirmPassword),
    [resetForm.confirmPassword, resetForm.password]
  );

  const loadSession = useCallback(async () => {
    try {
      const response = await api.get('/users/me');
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryMode = params.get('mode');
    const queryToken = params.get('token');
    const oauthResult = params.get('oauth');
    const oauthError = params.get('error');

    if (oauthResult === 'success') {
      loadSession().then(() => {
        setMessage({ type: 'success', text: 'Signed in successfully.' });
      });
      return;
    }

    if (oauthError) {
      setMessage({ type: 'error', text: 'Social sign in failed. Please try again.' });
    }

    if (queryMode === 'reset') {
      setMode('reset');
    }

    if (queryToken) {
      setResetForm((prev) => ({ ...prev, token: queryToken }));
    }
  }, [location.search, loadSession]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/users/login', loginForm);
      setUser(response.data.user);
      setMessage({ type: 'success', text: 'Logged in successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Login failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/users/register', registerForm);
      setUser(response.data.user);
      setRegisterForm(initialRegisterForm);
      setMessage({ type: 'success', text: 'Registration successful.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/users/forgot-password', { email: forgotEmail });
      const devToken = response.data?.resetToken;

      if (devToken) {
        setResetForm((prev) => ({ ...prev, token: devToken }));
        setMode('reset');
        setMessage({
          type: 'success',
          text: `Reset token generated in development mode. Paste or keep the token and set a new password.`
        });
      } else {
        setMessage({ type: 'success', text: response.data?.message || 'If your email exists, reset instructions were sent.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Could not process your reset request.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/users/reset-password', {
        token: resetForm.token,
        password: resetForm.password,
        confirmPassword: resetForm.confirmPassword
      });

      setResetForm({ token: '', password: '', confirmPassword: '' });
      setMode('login');
      setMessage({ type: 'success', text: response.data?.message || 'Password reset successful. Please sign in.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Password reset failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/users/logout');
      setUser(null);
      setLoginForm({ email: '', password: '' });
      setMessage({ type: 'success', text: 'You are now logged out.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Logout failed.' });
    }
  };

  const handleOAuthLogin = (provider) => {
    window.location.href = `${API_BASE}/users/auth/${provider}`;
  };

  const toggleInterest = (interest) => {
    setRegisterForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest]
    }));
  };

  if (user) {
    return (
      <div className="auth-container">
        <div className="auth-card user-profile-card">
          <div className="profile-header">
            <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="profile-avatar" />
            <div className="profile-info">
              <h1>{user.firstName} {user.lastName}</h1>
              <p className="profile-email">{user.email}</p>
              {user.location ? <p className="profile-meta">{user.location}</p> : null}
              <p className="profile-meta">Posts: {user.postsCount || 0}</p>
            </div>
          </div>

          {user.bio ? <p className="profile-bio">{user.bio}</p> : null}

          {Array.isArray(user.interests) && user.interests.length > 0 ? (
            <div className="interests-container">
              <h3>Interests</h3>
              <div className="interests-list">
                {user.interests.map((interest) => <span key={interest} className="interest-tag">{interest}</span>)}
              </div>
            </div>
          ) : null}

          <div className="profile-actions">
            <button type="button" className="btn-primary" onClick={() => navigate('/settings')}>Edit Profile</button>
            <button type="button" className="btn-secondary" onClick={() => navigate(`/profile/${user.id}`)}>View Profile</button>
            <button type="button" className="btn-secondary" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    );
  }

  const socialButtons = (googleEnabled || githubEnabled) ? (
    <div className="social-login-block">
      <div className="social-divider"><span>or</span></div>
      {googleEnabled ? (
        <button type="button" className="btn-social btn-google" onClick={() => handleOAuthLogin('google')}>
          <FaGoogle aria-hidden="true" /> Continue with Google
        </button>
      ) : null}
      {githubEnabled ? (
        <button type="button" className="btn-social btn-github" onClick={() => handleOAuthLogin('github')}>
          <FaGithub aria-hidden="true" /> Continue with GitHub
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-mode-toggle">
          <button type="button" className={`mode-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign In</button>
          <button type="button" className={`mode-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Register</button>
        </div>

        {(mode === 'forgot' || mode === 'reset') ? (
          <button type="button" className="text-link" onClick={() => setMode('login')}>Back to sign in</button>
        ) : null}

        {message.text ? <div className={`${message.type}-message`}>{message.text}</div> : null}

        {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
            <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
            <button type="button" className="text-link" onClick={() => setMode('forgot')}>Forgot your password?</button>
            {socialButtons}
          </form>
        ) : (
          mode === 'register' ? (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-row">
              <input type="text" name="firstName" placeholder="First Name" value={registerForm.firstName} onChange={(event) => setRegisterForm((prev) => ({ ...prev, firstName: event.target.value }))} required />
              <input type="text" name="lastName" placeholder="Last Name" value={registerForm.lastName} onChange={(event) => setRegisterForm((prev) => ({ ...prev, lastName: event.target.value }))} required />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={registerForm.email}
              className={!registerEmailValid ? 'input-invalid' : ''}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            {registerForm.email ? (
              <p className={`inline-hint ${registerEmailValid ? 'valid' : 'error'}`}>
                {registerEmailValid ? 'Email format looks good.' : 'Please enter a valid email address.'}
              </p>
            ) : null}
            <input type="password" name="password" placeholder="Password" minLength={8} value={registerForm.password} onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))} required />
            <div className="password-meter">
              <div className="password-meter-track">
                <div className={`password-meter-fill ${registerPasswordStrength.tone}`} style={{ width: `${(registerPasswordStrength.score / 4) * 100}%` }} />
              </div>
              <span className={`password-meter-label ${registerPasswordStrength.tone}`}>{registerPasswordStrength.label}</span>
            </div>
            <div className="password-rule-grid">
              <span className={registerPasswordStrength.checks.minLength ? 'valid' : 'error'}>8+ characters</span>
              <span className={registerPasswordStrength.checks.hasUpper ? 'valid' : 'error'}>Uppercase letter</span>
              <span className={registerPasswordStrength.checks.hasLower ? 'valid' : 'error'}>Lowercase letter</span>
              <span className={registerPasswordStrength.checks.hasNumber ? 'valid' : 'error'}>Number</span>
            </div>
            <input type="password" name="confirmPassword" placeholder="Confirm Password" minLength={8} value={registerForm.confirmPassword} onChange={(event) => setRegisterForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} required />
            {registerForm.confirmPassword ? (
              <p className={`inline-hint ${registerPasswordsMatch ? 'valid' : 'error'}`}>
                {registerPasswordsMatch ? 'Passwords match.' : 'Passwords do not match yet.'}
              </p>
            ) : null}
            <div className="form-row">
              <input type="tel" name="phone" placeholder="Mobile Number" value={registerForm.phone} onChange={(event) => setRegisterForm((prev) => ({ ...prev, phone: event.target.value }))} required />
              <input type="date" name="dateOfBirth" value={registerForm.dateOfBirth} onChange={(event) => setRegisterForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))} required />
            </div>
            <div className="form-row">
              <select name="gender" value={registerForm.gender} onChange={(event) => setRegisterForm((prev) => ({ ...prev, gender: event.target.value }))} required>
                <option value="prefer-not-to-say">Prefer Not To Say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input type="text" name="location" placeholder="Location" value={registerForm.location} onChange={(event) => setRegisterForm((prev) => ({ ...prev, location: event.target.value }))} required />
            </div>
            <textarea name="bio" placeholder="Bio (optional)" maxLength={500} value={registerForm.bio} onChange={(event) => setRegisterForm((prev) => ({ ...prev, bio: event.target.value }))} />

            <div className="interests-section">
              <label>Interests</label>
              <div className="interests-checkbox-grid">
                {predefinedInterests.map((interest) => (
                  <label key={interest} className="interest-checkbox">
                    <input type="checkbox" checked={registerForm.interests.includes(interest)} onChange={() => toggleInterest(interest)} />
                    <span>{interest}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</button>
            {socialButtons}
          </form>
          ) : mode === 'forgot' ? (
            <form className="auth-form" onSubmit={handleForgotPassword}>
              <input
                type="email"
                name="email"
                placeholder="Enter your account email"
                value={forgotEmail}
                className={!forgotEmailValid ? 'input-invalid' : ''}
                onChange={(event) => setForgotEmail(event.target.value)}
                required
              />
              {forgotEmail ? (
                <p className={`inline-hint ${forgotEmailValid ? 'valid' : 'error'}`}>
                  {forgotEmailValid ? 'Ready to send reset instructions.' : 'Please enter a valid email address.'}
                </p>
              ) : null}
              <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset instructions'}</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <input
                type="text"
                name="token"
                placeholder="Reset token"
                value={resetForm.token}
                onChange={(event) => setResetForm((prev) => ({ ...prev, token: event.target.value }))}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="New password"
                minLength={8}
                value={resetForm.password}
                onChange={(event) => setResetForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <div className="password-meter">
                <div className="password-meter-track">
                  <div className={`password-meter-fill ${resetPasswordStrength.tone}`} style={{ width: `${(resetPasswordStrength.score / 4) * 100}%` }} />
                </div>
                <span className={`password-meter-label ${resetPasswordStrength.tone}`}>{resetPasswordStrength.label}</span>
              </div>
              <div className="password-rule-grid">
                <span className={resetPasswordStrength.checks.minLength ? 'valid' : 'error'}>8+ characters</span>
                <span className={resetPasswordStrength.checks.hasUpper ? 'valid' : 'error'}>Uppercase letter</span>
                <span className={resetPasswordStrength.checks.hasLower ? 'valid' : 'error'}>Lowercase letter</span>
                <span className={resetPasswordStrength.checks.hasNumber ? 'valid' : 'error'}>Number</span>
              </div>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm new password"
                minLength={8}
                value={resetForm.confirmPassword}
                onChange={(event) => setResetForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                required
              />
              {resetForm.confirmPassword ? (
                <p className={`inline-hint ${resetPasswordsMatch ? 'valid' : 'error'}`}>
                  {resetPasswordsMatch ? 'Passwords match.' : 'Passwords do not match yet.'}
                </p>
              ) : null}
              <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset password'}</button>
            </form>
          )
        )}
      </div>
    </div>
  );
}

export default UserAuthPage;
