import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate  } from 'react-router-dom';

export default function GroupPage() {
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [message, setMessage] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchGroup() {
      const res = await fetch(`/api/groups/get?groupId=${groupId}`);
      const data = await res.json();
      setGroup(data.group);
    }
    if (groupId) fetchGroup();
  }, [groupId]);

  async function handleAddMember() {
    const token = localStorage.getItem('token');
  
    const res = await fetch('/api/groups/addMember', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ groupId, memberEmail: newMemberEmail }),
    });
  
    if (res.ok) {
      setGroup((prevGroup) => ({
        ...prevGroup,
        members: [...prevGroup.members, { email: newMemberEmail }],
      }));
      setNewMemberEmail('');
    } else {
      alert('Failed to add member');
    }
  }
  

  async function handleSendNotification() {
    const token = localStorage.getItem('token');
    await fetch('/api/groups/sendNotification', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ groupId, message }),
    });
    alert('Notification sent!');
    setMessage('');
  }

  async function handleDeleteGroup() {
    const confirmDelete = window.confirm("Are you sure you want to delete this group?");
    if (!confirmDelete) return;
  
    const token = localStorage.getItem('token');
  
    const res = await fetch('/api/groups/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ groupId })
    });
  
    if (res.ok) {
      alert('Group deleted.');
      navigate('/');
    } else {
      const data = await res.json();
      alert('Failed to delete group: ' + (data.message || 'Unknown error'));
    }
  }

  async function handleDeleteMember(emailToDelete) {
    const confirmDelete = window.confirm(`Are you sure you want to delete the user ${emailToDelete}?`);
    if (!confirmDelete) return;
  
    const token = localStorage.getItem('token');
  
    const res = await fetch('/api/groups/deleteMember', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ groupId, emailToDelete })
    });
  
    if (res.ok) {
      alert(`${emailToDelete} removed from group.`);
      setGroup((prevGroup) => ({
        ...prevGroup,
        members: prevGroup.members.filter(m => m.email !== emailToDelete)
      }));
    } else {
      const data = await res.json();
      alert('Failed to delete user: ' + (data.message || 'Unknown error'));
    }
  }  

  async function handleCreateEvent() {
    navigate(`/group/${groupId}/createEvent`);
  }

  const userEmail = useMemo(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
  
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email;
    } catch {
      return null;
    }
  }, []);

  if (!group) return <p>Loading...</p>;

  return (
    <div>
      <h1>Group: {group.name}</h1>
      <h2>Members:</h2>
      <ul>
        {group.members.map((m, idx) => 
          <li key={idx}>{m.email} 
            {userEmail === group.organizerEmail && (<button onClick={() => handleDeleteMember(m.email)}>X</button>)}            
          </li>
        )}
      </ul>

      <h2>Add Member</h2>
      <input placeholder="Email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} />
      <button onClick={handleAddMember}>Add</button>

      <h2>Send Notification</h2>
      <textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={handleSendNotification}>Send</button>

      <h2>Active Events</h2>
      <label>Select an Event:</label>
      <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
        <option value="">-- Choose an Event --</option>
        {group.events.map((event) => (
          <option key={event._id} value={event._id}>
            {event.title}
          </option>
        ))}
      </select>


      {userEmail === group.organizerEmail && (
      <>
        <h2>Create Event</h2>
        <button onClick={handleCreateEvent}>Create Event</button>        

        <h2>Danger Zone</h2>
        <button onClick={handleDeleteGroup} style={{ backgroundColor: 'red', color: 'white' }}>
          Delete Group
        </button>
      </>
    )}
    </div>
  );
}
