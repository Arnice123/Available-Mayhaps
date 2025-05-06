import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays, eachDayOfInterval } from 'date-fns';

export default function CreateEvent() {
  const { groupId } = useParams();
  const [availability, setAvailability] = useState({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('8am');
  const [endTime, setEndTime] = useState('5pm');

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
    return eachDayOfInterval({
      start: new Date(startDate),
      end: new Date(endDate)
    }).map(d => format(d, 'yyyy-MM-dd'));
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

    const token = localStorage.getItem('token');

    const res = await fetch('/api/groups/createEvent', {
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
      alert('Event created and members have been emailed!');
      await fetch('/api/groups/sendNotification', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupId,
          message: `Event: ${title} has been created in your Available Mayhaps, respond as soon as available to you!`
        }),
      });

      alert('Notification sent!');
      navigate(`/group/${groupId}`);
    } else {
      const data = await res.json();
      alert('Failed to create event: ' + (data.message || 'Unknown error'));
    }
  }

  return (
    <div>
      <h1>Create Event for Group</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Event Title:
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label>
          Description:
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label>
          Start Date:
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>

        <label>
          End Date:
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>

        <label>
          Start Time:
          <select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
            {times.map(time => <option key={time} value={time}>{time}</option>)}
          </select>
        </label>

        <label>
          End Time:
          <select value={endTime} onChange={(e) => setEndTime(e.target.value)}>
            {times.map(time => <option key={time} value={time}>{time}</option>)}
          </select>
        </label>


        <h2>Select Available Times</h2>
        {selectedDates().length > 0 ? (
          <table>
            <thead>
              <tr>
                <th></th>
                {selectedDates().map(date => (
                <th key={date} style={{ whiteSpace: 'nowrap', padding: '10px' }}>
                {format(parseISO(date), 'EEE MMM d')}
              </th>              
              ))}
              </tr>
            </thead>
            <tbody>
              {getFilteredTimes().map(time => (
                <tr key={time}>
                  <td>{time}</td>
                  {selectedDates().map(date => {
                    const key = `${date}-${time}`;
                    const isSelected = availability[key];
                    return (
                      <td
                        key={key}
                        onClick={() => toggleCell(date, time)}
                        style={{
                          padding: '10px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'lightgreen' : 'white',
                          border: '1px solid #ccc',
                          whiteSpace: 'nowrap'
                        }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Please select a valid start and end date.</p>
        )}

        <button type="submit">Create Event</button>
      </form>
    </div>
  );
}
