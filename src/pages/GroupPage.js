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
  const [cooldownActive, setCooldownActive] = useState(false);
  const [selectedResponseType, setSelectedResponseType] = useState(1); // 1: perfect, 2: ok, 3: possible

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchGroup() {
      const res = await fetch(`/api/groups/group?groupId=${groupId}`);
      const data = await res.json();
      setGroup(data.group);
    }
    if (groupId) fetchGroup();
  }, [groupId]);

  async function handleAddMember() {
    const token = localStorage.getItem('token');

    const res = await fetch('/api/groups/member', {
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
    if (cooldownActive) return;
    setCooldownActive(true);

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

    setTimeout(() => setCooldownActive(false), 1000);
  }

  async function handleDeleteGroup() {
    const confirmDelete = window.confirm("Are you sure you want to delete this group?");
    if (!confirmDelete) return;

    const token = localStorage.getItem('token');

    const res = await fetch('/api/groups/group', {
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

    const res = await fetch('/api/groups/member', {
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

    const res = await fetch('/api/groups/event', {
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
  
    const res = await fetch('/api/groups/event', {
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
        
          setMemberAvailability(prev => {
            const current = prev[key] || 0;
            if (current === selectedResponseType) {
              return { ...prev, [key]: 0 };
            }
            return { ...prev, [key]: selectedResponseType };
          });
        }
              

        return (
          <div>
          <h3>{event.title}</h3>
          <p>{event.description}</p>

          <div style={{ marginBottom: '10px' }}>
            <span>Select response type: </span>
            <button onClick={() => setSelectedResponseType(1)} style={{ backgroundColor: selectedResponseType === 1 ? 'lightgreen' : 'white' }}>
              Perfect Time
            </button>
            <button onClick={() => setSelectedResponseType(2)} style={{ backgroundColor: selectedResponseType === 2 ? 'khaki' : 'white' }}>
              OK Time
            </button>
            <button onClick={() => setSelectedResponseType(3)} style={{ backgroundColor: selectedResponseType === 3 ? 'lightcoral' : 'white' }}>
              Possible, Not Ideal
            </button>
          </div>


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
                      let bgColor = '#f0f0f0';
                      if (isAvailableSlot) {
                        switch (memberAvailability[key]) {
                          case 1: bgColor = 'lightgreen'; break;
                          case 2: bgColor = 'khaki'; break;
                          case 3: bgColor = 'lightcoral'; break;
                          default: bgColor = 'white'; break;
                        }
                      }
                      return (
                        <td
                          key={key}
                          onClick={() => toggleCell(day, time)}
                          style={{
                            backgroundColor: bgColor,
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
                      const rawScore = aggregate[key] || 0;
                      const maxScore = includedResponses.length * 3 || 1; // 3 = max per user
                      const intensity = rawScore / maxScore;

                      const backgroundColor = event.availabilityTemplate[key]
                        ? `rgba(0, 128, 0, ${intensity})`
                        : '#f0f0f0';

                      return (
                        <td
                          key={key}
                          style={{
                            backgroundColor,
                            border: '1px solid #ccc',
                            textAlign: 'center',
                            padding: '6px',
                            color: intensity > 0.5 ? 'white' : 'black',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {event.availabilityTemplate[key] ? rawScore : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '10px' }}>
            <strong>Legend:</strong>
            <div><span style={{ background: 'rgba(0,128,0,1)', padding: '2px 10px' }}></span> = All users marked "Perfect Time"</div>
            <div><span style={{ background: 'rgba(0,128,0,0.66)', padding: '2px 10px' }}></span> = Some marked "Perfect"/"OK"</div>
            <div><span style={{ background: 'rgba(0,128,0,0.33)', padding: '2px 10px' }}></span> = Mostly "Possible, Not Ideal"</div>
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
