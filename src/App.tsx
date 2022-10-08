import React, {useState} from 'react';
import './App.css';

const EVENTS = 'events';

type Event = {
  date: string;
};

function App() {
  const [events, setEvents] = useState(JSON.parse(localStorage.getItem(EVENTS) || '[]'))

  const updateEvent = () => {
    const newEvent = {date: new Date().getTime()};
    const updated = [...events, newEvent];
    localStorage.setItem(EVENTS, JSON.stringify(updated));
    setEvents(updated);
  }

  const deleteEvents = () => {
    if (window.confirm('Are you sure you want to delete all events?')) {
      localStorage.removeItem(EVENTS);
      setEvents([]);
    }
  };

  return (
    <div>
      <div>
        <h1>Event log</h1>
      </div>
      <div onClick={updateEvent} style={{textAlign: "center"}}>
        <button>Record Event</button>
      </div>
      <div>
        <ul>
          {events.map((event: Event) => (<li>{new Date(event.date).toString()}</li>))}
        </ul>
      </div>
      <div onClick={deleteEvents} style={{textAlign: "center"}}>
        <button>Delete All Events</button>
      </div>
    </div>
  );
}

export default App;
