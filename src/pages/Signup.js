import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css'

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [cooldownActive, setCooldownActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();

    if (cooldownActive || submitting) return; // Prevent double submission
    
    setSubmitting(true);
    setCooldownActive(true);


    const res = await fetch('/api/users?action=signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });

    const data = await res.json();
    console.log('Signup response:', res.status, data);

    if (res.ok) {
      navigate('/login');
    } else {
      alert(data.message || 'Signup failed');
    }

    setSubmitting(false);
    setTimeout(() => setCooldownActive(false), 1000);
  }

  return (
    <>
      <div className="auth-container signup">
        <h1 className="auth-title">Sign Up</h1>
        <form className="auth-form" onSubmit={handleSignup}>
          <div className="auth-form-group">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              placeholder="your@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-label">Name</label>
            <input
              className="auth-input"
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <button className="auth-button" type="submit">
            Sign Up
          </button>
        </form>
      </div>
    </>
  );
}
