import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Navbar.css' // Import the CSS file

export default function Navbar() {
  const [groups, setGroups] = useState([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [groupsDropdownOpen, setGroupsDropdownOpen] = useState(false)
  const token = localStorage.getItem('token')
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) return
  
    async function fetchGroups() {
      try {
        const res = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        })
  
        const text = await res.text() 
  
        let data
        try {
          data = JSON.parse(text) 
        } catch {
          throw new Error('Response was not valid JSON: ' + text)
        }
  
        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch groups')
        }
  
        setGroups(data.groups || [])
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

  function toggleMobileMenu() {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  function toggleGroupsDropdown() {
    setGroupsDropdownOpen(!groupsDropdownOpen)
  }

  return (
    <nav className={`navbar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">GroupSync</Link>
        
        <button className="mobile-menu-button" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      <div className="navbar-links">
        <Link to="/" className="navbar-link">Home</Link>
        <Link to="/create-group" className="navbar-link">Create Group</Link>
      </div>

      <div className="navbar-right">
        {groups.length > 0 && (
          <div className={`groups-dropdown ${groupsDropdownOpen ? 'open' : ''}`}>
            <button 
              className="groups-dropdown-button" 
              onClick={toggleGroupsDropdown}
            >
              Your Groups
              <span>▼</span>
            </button>
            <div className="groups-dropdown-content">
              {groups.map((g) => (
                <Link 
                  key={g._id} 
                  to={`/group/${g._id}`} 
                  className="groups-dropdown-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {g.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {token ? (
          <button 
            onClick={handleLogout} 
            className="navbar-button transparent"
          >
            Logout
          </button>
        ) : (
          <>
            <Link 
              to="/login" 
              className="navbar-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
            <Link 
              to="/signup" 
              className="navbar-button"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}