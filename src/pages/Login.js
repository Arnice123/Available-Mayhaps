import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        navigate('/create-group');
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">Log In to GroupSync</h1>
      
      {error && <div className="auth-error">{error}</div>}
      
      <form className="auth-form" onSubmit={handleLogin}>
        <div className="auth-form-group">
          <label htmlFor="email" className="auth-label">Email</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        
        <div className="auth-form-group">
          <label htmlFor="password" className="auth-label">Password</label>
          <input
            id="password"
            className="auth-input"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <div className="forgot-password">
            <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>
        </div>
        
        <button 
          type="submit" 
          className="auth-button"
          disabled={loading || !email || !password}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      
      <div className="auth-divider">or</div>
      
      <div className="auth-footer">
        Don't have an account?{' '}
        <Link to="/signup" className="auth-link">Sign Up</Link>
      </div>
    </div>
  );
}