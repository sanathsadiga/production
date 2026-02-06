import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validation
      if (!formData.email.trim() || !formData.password.trim()) {
        setError('Please enter email and password');
        setIsLoading(false);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      // Call login API
      const response = await authAPI.login(formData.email, formData.password);
      const userData = response.data;

      // Validate response
      if (!userData) {
        setError('Invalid response from server');
        setIsLoading(false);
        return;
      }

      if (!userData.role || (userData.role !== 'user' && userData.role !== 'admin')) {
        setError('Invalid user role');
        setIsLoading(false);
        return;
      }

      // Store user data
      login(userData);

      // Clear form
      setFormData({
        email: '',
        password: '',
      });

      // Redirect based on role
      if (userData.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (userData.role === 'user') {
        navigate('/user/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle different error types
      if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message === 'Network Error') {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'An error occurred during login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>MMCL Production Dashboard</h1>
          <p className="subtitle">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message" role="alert">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
              disabled={isLoading}
              autoComplete="email"
              aria-label="Email Address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              disabled={isLoading}
              autoComplete="current-password"
              aria-label="Password"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="btn-login"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="test-credentials">
          <p className="credentials-title">
            <strong>Test Credentials:</strong>
          </p>

          <div className="credentials-section">
            <p className="section-title">👤 Regular Users:</p>
            <div className="credential-item">
              <span className="label">Email:</span>
              <span className="value">alvin.pinto@timosofindia.com</span>
            </div>
            <div className="credential-item">
              <span className="label">Password:</span>
              <span className="value">Mmcl@1502</span>
            </div>
          </div>

          <div className="credentials-section">
            <p className="section-title">👨‍💼 Administrator:</p>
            <div className="credential-item">
              <span className="label">Email:</span>
              <span className="value">deepak.saluja@timesofindia.com</span>
            </div>
            <div className="credential-item">
              <span className="label">Password:</span>
              <span className="value">Admin@123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};