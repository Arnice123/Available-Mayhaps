import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import AvailabilityGrid from '../components/AvailabilityGrid.js';
import './CreateEvent.css';

export default function CreateEvent() {
  const { groupId } = useParams();
  const [availability, setAvailability] = useState({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('8am');
  const [endTime, setEndTime] = useState('5pm');
  const [cooldownActive, setCooldownActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const times = [
    '12am','1am','2am','3am','4am','5am','6am','7am',
    '8am','9am','10am','11am','12pm','1pm','2pm','3pm',
    '4pm','5pm','6pm','7pm','8pm','9pm','10pm','11pm'
  ];
  
  function getFilteredTimes() {
    const startIndex = times.indexOf(startTime);
    const endIndex = times.indexOf(endTime);
    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) return [];
    return times.slice(startIndex, endIndex + 1);
  }
  
  const selectedDates = () => {
    if (!startDate || !endDate) return [];
    try {
      return eachDayOfInterval({
        start: new Date(startDate),
        end: new Date(endDate)
      }).map(d => format(d, 'yyyy-MM-dd'));
    } catch (error) {
      console.error("Date interval error:", error);
      return [];
    }
  };

  function toggleCell(date, time) {
    const key = `${date}-${time}`;
    setAvailability(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      alert('Please enter an event title');
      return;
    }

    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('End date must be after start date');
      return;
    }

    if (cooldownActive || submitting) return; // Prevent double submission
    
    setSubmitting(true);
    setCooldownActive(true);

    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/groups/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId,
          title,
          description,
          availability,
          startDate,
          endDate,
          startTime,
          endTime,
        })
      });

      if (res.ok) {
        alert('Event created successfully!');
        navigate(`/group/${groupId}`);
      } else {
        const data = await res.json();
        alert('Failed to create event: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert('An error occurred while creating the event. Please try again.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setCooldownActive(false), 1000);
    }
  }

  return (
    <div className="create-event-page">
      <header className="create-event-header">
        <h1>Create New Event</h1>
      </header>

      <form className="event-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>Event Details</h2>
          
          <div className="form-group">
            <label className="form-label" htmlFor="event-title">Event Title</label>
            <input 
              id="event-title"
              className="form-input" 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-description">Description</label>
            <textarea 
              id="event-description"
              className="form-textarea" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your event (optional)"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Date & Time</h2>
          
          <div className="date-time-container">
            <div className="date-group">
              <label className="form-label" htmlFor="start-date">Start Date</label>
              <input 
                id="start-date"
                className="form-input" 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="date-group">
              <label className="form-label" htmlFor="end-date">End Date</label>
              <input 
                id="end-date"
                className="form-input" 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="date-time-container">
            <div className="time-group">
              <label className="form-label" htmlFor="start-time">Start Time</label>
              <select 
                id="start-time"
                className="form-select" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
              >
                {times.map(time => <option key={time} value={time}>{time}</option>)}
              </select>
            </div>

            <div className="time-group">
              <label className="form-label" htmlFor="end-time">End Time</label>
              <select 
                id="end-time"
                className="form-select" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
              >
                {times.map(time => <option key={time} value={time}>{time}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section availability-section">
          <h2>Select Available Times</h2>
          <p>Click to mark time slots that should be available for scheduling.</p>
          
          <div className="availability-grid-container">
            {selectedDates().length > 0 ? (
              <AvailabilityGrid
                selectedDates={selectedDates()}
                times={getFilteredTimes()}
                availability={availability}
                setAvailability={setAvailability}
                mode="binary"
              />
            ) : (
              <div className="availability-warning">
                <p>Please select a valid start and end date to view the availability grid.</p>
              </div>
            )}
          </div>
        </div>

        <div className="submit-button-container">
          <button 
            type="submit" 
            className="submit-button"
            disabled={cooldownActive || submitting}
          >
            {submitting ? 'Creating Event...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}