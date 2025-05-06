import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate  } from 'react-router-dom';

export default function GroupPage() {
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [message, setMessage] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [memberAvailability, setMemberAvailability] = useState({});
  const [excluded, setExcluded] = useState([]); 
  const [permanentlyExcluded, setPermanentlyExcluded] = useState([]);

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

  async function handleSubmitAvailability() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/groups/submitAvailability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        groupId,
        eventId: selectedEventId,
        availability: memberAvailability
      })
    });
  
    if (res.ok) {
      alert('Availability submitted!');
    } else {
      const data = await res.json();
      alert('Error: ' + (data.message || 'Unknown'));
    }
  }
  
  function toggleExclude(email) {
    setExcluded((prev) =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  }

  async function permanentlyExclude(email) {
    const token = localStorage.getItem('token');
    const eventId = selectedEventId;
  
    const res = await fetch('/api/groups/excludeMemberFromEvent', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ groupId, eventId, emailToExclude: email })
    });
  
    if (res.ok) {
      setPermanentlyExcluded(prev => [...prev, email]);
    } else {
      alert('Failed to permanently exclude user');
    }
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
      
      {selectedEventId && (() => {
        const event = group.events.find(e => e._id === selectedEventId);
        if (!event) return <p>Event not found.</p>;

        const excludedServer = event.excludedEmails || [];

        const includedResponses = event.responses.filter(
          r => !excluded.includes(r.email) && !permanentlyExcluded.includes(r.email) && !excludedServer.includes(r.email)
        );
        
        const aggregate = {};
        
        for (const res of includedResponses) {
          for (const [slot, isAvailable] of Object.entries(res.availability)) {
            if (isAvailable) {
              aggregate[slot] = (aggregate[slot] || 0) + 1;
            }
          }
        }  
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const times = [
          '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am',
          '8am', '9am', '10am', '11am',
          '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm',
          '8pm', '9pm', '10pm', '11pm'
        ];


        const keys = Object.keys(event.availabilityTemplate);
        //const days = [...new Set(keys.map(k => k.split('-')[0]))];
        //const times = [...new Set(keys.map(k => k.split('-')[1]))];

        function toggleCell(day, time) {
          const key = `${day}-${time}`;
          if (!event.availabilityTemplate[key]) return; 
        
          setMemberAvailability(prev => ({
            ...prev,
            [key]: !prev[key]
          }));
        }
        

        return (
          <div>
            <h3>{event.title}</h3>
            <p>{event.description}</p>

            <table>
              <thead>
                <tr><th></th>{times.map(t => <th key={t}>{t}</th>)}</tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day}>
                    <td>{day}</td>
                    {times.map(time => {
                      const key = `${day}-${time}`;
                      const isAvailableSlot = event.availabilityTemplate[key];
                      const isSelected = memberAvailability[key];

                      return (
                        <td
                          key={key}
                          onClick={() => toggleCell(day, time)}
                          style={{
                            backgroundColor: isAvailableSlot
                              ? (isSelected ? 'lightgreen' : 'white')
                              : '#f0f0f0',
                            cursor: isAvailableSlot ? 'pointer' : 'not-allowed',
                            border: '1px solid #ccc',
                            padding: '10px'
                          }}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={handleSubmitAvailability}>Submit Availability</button>

            <h4>Filtered Responses:</h4>
            <ul>
              {event.responses.map((r) => (
                <li key={r.email}>
                  {r.email}
                  <button onClick={() => toggleExclude(r.email)}>
                    {excluded.includes(r.email) ? 'Include' : 'Temporarily Exclude'}
                  </button>
                  {includedResponses.some(res => res.email === r.email) && (
                    <button onClick={() => permanentlyExclude(r.email)}>
                      Permanently Exclude
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <h4>Combined Availability</h4>
            <table>
              <thead>
                <tr>
                  <th></th>
                  {times.map(time => <th key={time}>{time}</th>)}
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day}>
                    <td>{day}</td>
                    {times.map(time => {
                      const key = `${day}-${time}`;
                      const count = aggregate[key] || 0;
                      const max = includedResponses.length || 1;
                      const backgroundColor = `rgba(0, 200, 0, ${count / max})`;

                      return (
                        <td
                          key={key}
                          style={{
                            backgroundColor: event.availabilityTemplate[key] ? backgroundColor : '#f0f0f0',
                            border: '1px solid #ccc',
                            textAlign: 'center',
                            padding: '6px',
                            color: count > max * 0.5 ? 'white' : 'black'
                          }}
                        >
                          {event.availabilityTemplate[key] ? count : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

          </div>          
        );
      })()}

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
