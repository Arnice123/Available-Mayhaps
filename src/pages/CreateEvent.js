import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';


export default function CreateEvent() {
    const { groupId } = useParams();
    const [availability, setAvailability] = useState({})
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const navigate = useNavigate()

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const times = ['12am', '1am','2am', '3am','4am', '5am', '6am', '7am','8am', '9am', '10am', '11am', '12pm', '1pm','2pm', '3pm','4pm', '5pm', '6pm', '7pm','8pm', '9pm', '10pm', '11pm',]

    function toggleCell(day, time) {
        const key = `${day}-${time}`;
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
            availability
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
              message: `${title} has been created, respond as soon as available to you!`
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

                <h2>Select Available Times</h2>
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
                            const isSelected = availability[key];
                            return (
                                <td
                                key={key}
                                onClick={() => toggleCell(day, time)}
                                style={{
                                    padding: '10px',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? 'lightgreen' : 'white',
                                    border: '1px solid #ccc'
                                }}
                                />
                            );
                            })}
                        </tr>
                        ))}
                    </tbody>
                </table>


                <button type='submit'>Create Event</button>
            </form>
        </div>
    )
}