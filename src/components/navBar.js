import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <nav style={{ padding: '10px', backgroundColor: '#333', color: '#fff' }}>
      <Link to="/create-group" style={{ marginRight: '10px', color: '#fff' }}>Create Group</Link>
      {token ? (
        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', color: 'white', border: 'none' }}>Logout</button>
      ) : (
        <>
          <Link to="/login" style={{ marginRight: '10px', color: '#fff' }}>Login</Link>
          <Link to="/signup" style={{ color: '#fff' }}>Signup</Link>
        </>
      )}
    </nav>
  );
}
