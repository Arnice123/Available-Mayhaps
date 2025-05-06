import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();
    const res = await fetch('/api/users?action=signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  
    const data = await res.json();
    console.log('Signup response:', res.status, data);
  
    if (res.ok) {
      navigate('/login');
    } else {
      alert(data.message || 'Signup failed');
    }
  }
  

  return (
    <form onSubmit={handleSignup}>
      <h1>Sign Up</h1>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit">Sign Up</button>
    </form>
  );
}
