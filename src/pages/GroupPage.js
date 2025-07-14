import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, eachDayOfInterval, parseISO, addDays } from 'date-fns';

import AvailabilityGrid from '../components/AvailabilityGrid.js';
import './GroupPage.css';

const TIMES = [
  '12am','1am','2am','3am','4am','5am','6am','7am','8am','9am','10am','11am',
  '12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm','11pm'
];

function getDateList(startDate, endDate) {
  const dates = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate)
  });
  
  // Add 1 day to each date before formatting
  return dates.map(d => format(addDays(d, 1), 'yyyy-MM-dd'));
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchGroup() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/groups/group?groupId=${groupId}`);
        const data = await res.json();
        setGroup(data.group);
      } catch (error) {
        console.error("Failed to fetch group:", error);
      } finally {
        setIsLoading(false);
      }
    }
    if (groupId) fetchGroup();
  }, [groupId]);

  async function handleAddMember() {
    if (!newMemberEmail.trim()) {
      alert('Please enter an email address');
      return;
    }
    
    const token = localStorage.getItem('token');
  
    try {
      const res = await fetch('/api/groups/member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ groupId, memberEmail: newMemberEmail }),
      });
    
      if (res.ok) {
        const updated = await fetch(`/api/groups/group?groupId=${groupId}`);
        const data = await updated.json();
        setGroup(data.group);
        setNewMemberEmail('');
      } else {
        const errorData = await res.json();
        alert('Failed to add member: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error("Error adding member:", error);
      alert('Failed to add member. Please try again.');
    }
  }
  
  async function handleSendNotification() {
    if (cooldownActive || !message.trim()) return;
    setCooldownActive(true);

    const token = localStorage.getItem('token');
    try {
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
    } catch (error) {
      console.error("Error sending notification:", error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setTimeout(() => setCooldownActive(false), 1000);
    }
  }

  async function handleDeleteGroup() {
    const confirmDelete = window.confirm("Are you sure you want to delete this group?");
    if (!confirmDelete) return;

    const token = localStorage.getItem('token');

    try {
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
    } catch (error) {
      console.error("Error deleting group:", error);
      alert('Failed to delete group. Please try again.');
    }
  }

  async function handleDeleteMember(emailToDelete) {
    const confirmDelete = window.confirm(`Are you sure you want to delete the user ${emailToDelete}?`);
    if (!confirmDelete) return;

    const token = localStorage.getItem('token');

    try {
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
    } catch (error) {
      console.error("Error deleting member:", error);
      alert('Failed to delete member. Please try again.');
    }
  }

  async function handleCreateEvent() {
    navigate(`/group/${groupId}/createEvent`);
  }

  async function handleSubmitAvailability() {
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('/api/groups/submitAvailability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId,
          eventId: selectedEventId,
          availability: memberAvailability,
          note: message.trim() || null
        })
      });

      if (res.ok) {
        alert('Availability submitted!');
        setMessage('');    
        window.location.reload();
      } else {
        const data = await res.json();
        alert('Error: ' + (data.message || 'Unknown'));
      }
    } catch (error) {
      console.error("Error submitting availability:", error);
      alert('Failed to submit availability. Please try again.');
    }
  }

  function toggleExclude(email) {
    setExcluded((prev) =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  }

  async function permanentlyExclude(email) {
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/groups/event', {
        method: 'PATCH',
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
    } catch (error) {
      console.error("Error excluding response:", error);
      alert('Failed to exclude response. Please try again.');
    }
  }

  async function handleEventDeletion() {
    const confirmDelete = window.confirm("Are you sure you want to delete this event?");
    if (!confirmDelete) return;
  
    const token = localStorage.getItem('token');
  
    try {
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
    } catch (error) {
      console.error("Error deleting event:", error);
      alert('Failed to delete event. Please try again.');
    }
  }
  

  const userInfo = useMemo(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
  
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { email: payload.email, username: payload.username };
    } catch {
      return null;
    }
  }, []);
  
  const userEmail = userInfo?.email;
  
  if (isLoading) return <div className="loading">Loading group information...</div>;
  if (!group) return <div className="loading">Group not found</div>;

  const isOrganizer = userEmail === group.organizerEmail;

  return (
    <div className="group-page">
      <header className="group-header">
        <h1>{group.name}</h1>
      </header>

      <div className="section">
        <div className="section-header">
          <h2>Members</h2>
        </div>
        <ul className="members-list">
          {group.members.map((m, idx) => (
            <li key={idx} className="member-item">
              <span>{m.username || m.email}</span>
              {isOrganizer && (
                <button 
                  className="member-delete" 
                  onClick={() => handleDeleteMember(m.email)}
                  title="Remove member"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="add-member">
          <input 
            placeholder="Email" 
            value={newMemberEmail} 
            onChange={(e) => setNewMemberEmail(e.target.value)} 
          />
          <button className="btn btn-primary" onClick={handleAddMember}>Add Member</button>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Events</h2>
        </div>
        
        <div className="event-selector">
          <label>Select an Event:</label>
          <select 
            value={selectedEventId} 
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">-- Choose an Event --</option>
            {[...group.events]
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
            .map((event) => (
              <option key={event._id} value={event._id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

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
              if (isAvailable > 0) {
                aggregate[slot] = (aggregate[slot] || 0) + isAvailable;
              }
            }
          }             
          

          return (
            <div>
              <div className="event-details">
                <h3 className="event-title">{event.title}</h3>
                <p className="event-description">{event.description}</p>
              </div>

              <div className="response-type">
                <button 
                  className={`response-btn ${selectedResponseType === 1 ? 'active-perfect' : ''}`}
                  onClick={() => setSelectedResponseType(1)}
                >
                  Perfect Time
                </button>
                <button 
                  className={`response-btn ${selectedResponseType === 2 ? 'active-ok' : ''}`}
                  onClick={() => setSelectedResponseType(2)}
                >
                  OK Time
                </button>
                <button 
                  className={`response-btn ${selectedResponseType === 3 ? 'active-possible' : ''}`}
                  onClick={() => setSelectedResponseType(3)}
                >
                  Possible, Not Ideal
                </button>
              </div>

              <AvailabilityGrid
                selectedDates={days}
                times={times}
                availability={memberAvailability}
                setAvailability={setMemberAvailability}
                availabilityTemplate={event.availabilityTemplate}
                mode="level"
                selectedResponseType={selectedResponseType}
              />

              <div className="notification-area">
                <h4>Add a note with your availability (optional)</h4>
                <textarea 
                  placeholder="Message for the group" 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                />
                <div style={{ marginTop: '10px' }}>
                  <button className="btn btn-success" onClick={handleSubmitAvailability}>
                    Submit Availability
                  </button>
                </div>
              </div>

              <div className="responses-section">
                <h4>Member Responses:</h4>
                <ul className="responses-list">
                  {event.responses.map((r) => (
                    <li key={r.email} className="response-item">
                      <div className="response-info">
                        <strong>{r.username || r.email}</strong>
                        {r.note && <p className="response-note">"{r.note}"</p>}
                      </div>
                      <div className="response-actions">
                        <button 
                          className="btn btn-sm"
                          onClick={() => toggleExclude(r.email)}
                        >
                          {excluded.includes(r.email) ? 'Include' : 'Temporarily Exclude'}
                        </button>
                        {includedResponses.some(res => res.email === r.email) && (
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => permanentlyExclude(r.email)}
                          >
                            Permanently Exclude
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="combined-availability">
                <h4>Combined Availability</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="availability-table">
                    <thead>
                      <tr>
                        <th></th>
                        {days.map(day => (
                          <th key={day}>
                            {format(parseISO(day), 'EEE MMM d', { timeZone: 'UTC' })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {times.map(time => (
                        <tr key={time}>
                          <td>{time}</td>
                          {days.map(day => {
                            const key = `${day}-${time}`;
                            const rawScore = aggregate[key] || 0;
                            const count = includedResponses.reduce((acc, res) => {
                              const level = res.availability?.[key];
                              return level > 0 ? acc + 1 : acc;
                            }, 0);
                            
                            // Add penalty for people who didn't respond (treat as "can't do")
                            const nonResponders = includedResponses.length - count;
                            const penaltyScore = nonResponders * 4;
                            const totalScore = rawScore + penaltyScore;
                            
                            const maxPossibleScore = includedResponses.length * 4; 
                            const minPossibleScore = includedResponses.length * 1;
                            const intensity = totalScore > 0 
                              ? (maxPossibleScore - totalScore) / (maxPossibleScore - minPossibleScore)
                              : 0;

                            const isAvailableSlot = event.availabilityTemplate[key];
                            const backgroundColor = isAvailableSlot
                              ? `rgba(0, 128, 0, ${intensity})`
                              : '#f0f0f0';

                            return (
                              <td
                                key={key}
                                onClick={() => setSelectedSlot(key === selectedSlot ? null : key)}
                                style={{
                                  backgroundColor,
                                  color: intensity > 0.5 ? 'white' : 'black',
                                  cursor: isAvailableSlot ? 'pointer' : 'default',
                                  border: selectedSlot === key ? '2px solid #3498db' : ''
                                }}
                                title={`Score: ${rawScore}, Respondents: ${count}`}
                              >
                                {isAvailableSlot ? count : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {selectedSlot && (
                    <div className="slot-details">
                      <h5>Responses for {selectedSlot}</h5>
                      <ul>
                        {includedResponses
                          .filter(res => res.availability?.[selectedSlot] > 0)
                          .map(res => (
                            <li key={res.email}>
                              <strong>{res.username || res.email}</strong>:{" "}
                              {res.availability[selectedSlot] === 1
                                ? 'Perfect'
                                : res.availability[selectedSlot] === 2
                                ? 'OK'
                                : 'Possible'}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>


                <div className="availability-legend">
                  <strong>Legend:</strong>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'rgba(0,128,0,1)' }}></span>
                    All users marked "Perfect Time"
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'rgba(0,128,0,0.66)' }}></span>
                    Some marked "Perfect"/"OK"
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'rgba(0,128,0,0.33)' }}></span>
                    Mostly "Possible, Not Ideal"
                  </div>
                </div>
                
                {isOrganizer && (
                  <div style={{ marginTop: '20px' }}>
                    <button className="btn btn-danger" onClick={handleEventDeletion}>
                      Delete Event
                    </button>
                  </div>
                )}
              </div>
            </div>          
          );
        })()}

        {(
          <div style={{ marginTop: '20px' }}>
            <button className="btn btn-primary" onClick={handleCreateEvent}>
              Create New Event
            </button>
          </div>
        )}
      </div>

      {isOrganizer && (
        <div className="danger-zone">
          <h2>Danger Zone</h2>
          <p>Permanently delete this group and all associated events.</p>
          <button 
            className="btn btn-danger" 
            onClick={handleDeleteGroup}
          >
            Delete Group
          </button>
        </div>
      )}
    </div>
  );
}