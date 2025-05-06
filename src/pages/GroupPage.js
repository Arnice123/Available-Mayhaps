import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

const TIMES = [
  '12am','1am','2am','3am','4am','5am','6am','7am','8am','9am','10am','11am',
  '12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm','11pm'
];

function getDateList(startDate, endDate) {
  return eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate)
  }).map(d => format(d, 'yyyy-MM-dd'));
}

function getTimeRange(startTime, endTime) {
  const startIndex = TIMES.indexOf(startTime);
  const endIndex = TIMES.indexOf(endTime);
  return startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex
    ? TIMES.slice(startIndex, endIndex + 1)
    : [];
}

export default function GroupPage() {
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [message, setMessage] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [memberAvailability, setMemberAvailability] = useState({});
  const [excluded, setExcluded] = useState([]);

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

    const res = await fetch('/api/groups/excludeMemberFromEvent', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ groupId, eventId: selectedEventId, emailToDelete: email })
    });

    if (res.ok) {
      alert(`Deleted response for ${email}`);
      setGroup((prev) => {
        const updatedEvents = prev.events.map((event) => {
          if (event._id !== selectedEventId) return event;

          const updatedResponses = event.responses.filter(r => r.email !== email);

          return {
            ...event,
            responses: updatedResponses
          };
        });

        return { ...prev, events: updatedEvents };
      });
    } else {
      const data = await res.json();
      alert(`Failed to delete response: ${data.message || 'Unknown error'}`);
    }
  }

  async function handleEventDeletion() {
    const confirmDelete = window.confirm("Are you sure you want to delete this event?");
    if (!confirmDelete) return;
  
    const token = localStorage.getItem('token');
  
    const res = await fetch('/api/groups/deleteEvent', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ groupId, eventId: selectedEventId })
    });
  
    if (res.ok) {
      alert('Event deleted.');
      setGroup(prev => ({
        ...prev,
        events: prev.events.filter(e => e._id !== selectedEventId)
      }));
      setSelectedEventId('');
    } else {
      const data = await res.json();
      alert('Failed to delete event: ' + (data.message || 'Unknown error'));
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
          <li key={idx}>
            {m.email}
            {userEmail === group.organizerEmail && (
              <button onClick={() => handleDeleteMember(m.email)}>X</button>
            )}
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

        const days = getDateList(event.startDate, event.endDate);
        const times = getTimeRange(event.startTime, event.endTime);

        const includedResponses = event.responses.filter(
          r => !excluded.includes(r.email)
        );

        const aggregate = {};
        for (const res of includedResponses) {
          for (const [slot, isAvailable] of Object.entries(res.availability)) {
            if (isAvailable) {
              aggregate[slot] = (aggregate[slot] || 0) + 1;
            }
          }
        }

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

          <div style={{ overflowX: 'auto' }}>
            <table style={{ whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th></th>
                {days.map(day => (
                  <th key={day} style={{ padding: '6px', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => {
                        setMemberAvailability(prev => {
                          const updated = { ...prev };
                          times.forEach(time => {
                            const key = `${day}-${time}`;
                            if (event.availabilityTemplate[key]) {
                              updated[key] = true;
                            }
                          });
                          return updated;
                        });
                      }}
                      style={{
                        background: '#eee',
                        border: '1px solid #ccc',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {format(parseISO(day), 'EEE MMM d')}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
              <tbody>
                {times.map(time => (
                  <tr key={time}>
                    <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>{time}</td>
                    {days.map(day => {
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
                            padding: '6px',
                            whiteSpace: 'nowrap',
                            textAlign: 'center'
                          }}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th></th>
                  {days.map(day => (
                    <th key={day} style={{ padding: '6px', whiteSpace: 'nowrap' }}>
                      {format(parseISO(day), 'EEE MMM d')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {times.map(time => (
                  <tr key={time}>
                    <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>{time}</td>
                    {days.map(day => {
                      const key = `${day}-${time}`;
                      const count = aggregate[key] || 0;
                      const max = includedResponses.length || 1;
                      const backgroundColor = event.availabilityTemplate[key]
                        ? `rgba(0, 200, 0, ${count / max})`
                        : '#f0f0f0';

                      return (
                        <td
                          key={key}
                          style={{
                            backgroundColor,
                            border: '1px solid #ccc',
                            textAlign: 'center',
                            padding: '6px',
                            color: count > max * 0.5 ? 'white' : 'black',
                            whiteSpace: 'nowrap'
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
          
          {userEmail === group.organizerEmail && (<button onClick={handleEventDeletion}>Delete Event</button> )}          
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
