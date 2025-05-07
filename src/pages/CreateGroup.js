import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateGroup.css';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleCreateGroup(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to create a group');
        navigate('/login');
        return;
      }
      
      const res = await fetch('/api/groups/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        navigate(`/group/${data.groupId}`);
      } else {
        setError(data.message || 'Failed to create group');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error creating group:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-group-container">
      <h1 className="create-group-title">Create New Group</h1>
      
      <form className="create-group-form" onSubmit={handleCreateGroup}>
        <div className="form-group">
          <label htmlFor="group-name" className="form-label">Group Name</label>
          <input 
            id="group-name"
            className="form-input"
            placeholder="Enter a name for your group"
            value={name} 
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
            maxLength={50}
          />
          <div className="form-description">
            Choose a name that will help members identify your group's purpose.
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={loading || name.trim().length < 3}
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </div>
  );
}