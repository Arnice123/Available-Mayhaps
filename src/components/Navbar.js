import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const [groups, setGroups] = useState([])
  const token = localStorage.getItem('token')
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) return

    async function fetchGroups() {
      try {
        const res = await fetch('/api/users/groups', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (res.ok) {
          setGroups(data.groups)
        } else {
          console.error('Failed to fetch groups:', data.message)
        }
      } catch (err) {
        console.error('Error fetching groups:', err)
      }
    }

    fetchGroups()
  }, [token])

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <nav style={{ padding: '10px', backgroundColor: '#333', color: '#fff' }}>
      <Link to="/" style={{ marginRight: '10px', color: '#fff' }}>Home</Link>
      <Link to="/create-group" style={{ marginRight: '10px', color: '#fff' }}>Create Group</Link>

      {groups.length > 0 && (
        <span style={{ marginRight: '10px' }}>
          Your Groups:
          {groups.map((g) => (
            <Link key={g._id} to={`/group/${g._id}`} style={{ marginLeft: '10px', color: '#fff' }}>
              {g.name}
            </Link>
          ))}
        </span>
      )}

      {token ? (
        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', color: 'white', border: 'none' }}>
          Logout
        </button>
      ) : (
        <>
          <Link to="/login" style={{ marginRight: '10px', color: '#fff' }}>Login</Link>
          <Link to="/signup" style={{ color: '#fff' }}>Signup</Link>
        </>
      )}
    </nav>
  )
}
