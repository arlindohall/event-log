import React, {useState} from 'react';
import dayjs from 'dayjs';
import RelativeTime from 'dayjs/plugin/relativeTime';
import './App.css';
import { format } from 'path';

const EVENTS = 'events';

dayjs.extend(RelativeTime)

type Event = {
  date: string;
};

function useToggle(): [boolean, () => void] {
  const [toggle, setToggle] = useState(false);
  return [toggle, () => setToggle(!toggle)];
}

function Event({date, absolute}: {date: string, absolute: boolean}) {
  return (<div>
    {absolute ? dayjs(date).format('MMMM D, YYYY (h:m A)') : dayjs(date).fromNow()}
  </div>);
}

function App() {
  const [events, setEvents] = useState(JSON.parse(localStorage.getItem(EVENTS) || '[]'))
  const [absolute, toggleAbsolute] = useToggle();

  const updateEvent = () => {
    const newEvent = {date: dayjs().format()};
    const updated = [newEvent, ...events];
    localStorage.setItem(EVENTS, JSON.stringify(updated));
    setEvents(updated);
  }

  const deleteEvents = () => {
    if (!window.confirm('Are you sure you want to delete all events?')) {
      return;
    }

    if (events.length > 5) {
      const updated = events.slice(0, 5);
      localStorage.setItem(EVENTS, JSON.stringify(updated));
      setEvents(updated);
    } else {
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
      <div onClick={toggleAbsolute}>
        <ul>
          {events.map((event: Event) => (<li><Event date={event.date} absolute={absolute}/></li>))}
        </ul>
      </div>
      <div onClick={deleteEvents} style={{textAlign: "center"}}>
        <button>Delete All Events</button>
      </div>
    </div>
  );
}

export default App;
