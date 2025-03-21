import React, { useState } from "react";
import dayjs from "dayjs";
import RelativeTime from "dayjs/plugin/relativeTime";
import "./App.css";

const APPLICATION = "event-log";
const DEFAULT_TOPIC = "Default topic";
const DEBUGGING = true;

function debug(obj: any) {
  if (!DEBUGGING) return;

  console.log(obj);
}

dayjs.extend(RelativeTime);

type EventFields = {
  topic: string;
  date?: string;
};

type ApplicationFields = {
  topic?: string;
  topics?: string[];
  events: EventRecord[];
  absoluteDate?: boolean;
};

class EventRecord {
  static for({ events }: { events: string[] }): EventRecord[];
  static for({ event }: { event: string }): EventRecord;
  static for({ events, event }: { events?: string[]; event?: string }) {
    if (event) return new EventRecord(JSON.parse(event));
    if (events)
      return events.map((event: string) => EventRecord.for({ event }));

    throw new Error("Invalid input to Event Record");
  }

  date: string;
  topic: string;

  constructor(fields: EventFields) {
    this.date = fields.date ?? dayjs().format();
    this.topic = fields.topic;
  }

  id() {
    return `${this.topic ?? "default"}--${this.date}`;
  }

  toJson() {
    return JSON.stringify({
      date: this.date,
      topic: this.topic,
    });
  }
}

class Application {
  static for(string: string): Application {
    const fields = JSON.parse(string);
    fields.events = EventRecord.for({ events: fields.events });

    debug({ eventsInAppFor: fields.events });
    return new Application(fields);
  }

  topic: string;
  topics: string[];
  absoluteDate: boolean;
  events: EventRecord[];

  constructor(fields: ApplicationFields) {
    this.topic = fields.topic ?? DEFAULT_TOPIC;
    this.topics = fields.topics ?? [DEFAULT_TOPIC];
    this.absoluteDate = fields.absoluteDate ?? false;
    this.events = fields.events;
  }

  eventsToShow() {
    if (this.topic === DEFAULT_TOPIC) return this.events;

    return this.eventsOnTopic();
  }

  withTopic(topic: string) {
    return new Application({ ...this, topic });
  }

  withNewTopic(topic: string) {
    return new Application({ ...this, topic, topics: [...this.topics, topic] });
  }

  withoutTopic() {
    return new Application({
      ...this,
      topic: DEFAULT_TOPIC,
      topics: this.topics.filter((topic) => topic !== this.topic),
    });
  }

  withNewEvent() {
    const newEvent = new EventRecord({ topic: this.topic });
    if (this.events.find((event) => event.id() === newEvent.id())) return this;

    return new Application({
      ...this,
      events: [newEvent, ...this.events],
    });
  }

  withToggleAbsoluteDate() {
    return new Application({
      ...this,
      absoluteDate: !this.absoluteDate,
    });
  }

  hasTopicAlready(name: string) {
    return this.topics
      .map((it) => it.toLowerCase())
      .includes(name.toLowerCase());
  }

  deleteEvents() {
    const onTopicEvents = this.eventsOnTopic();
    if (onTopicEvents.length > 5) {
      return new Application({
        ...this,
        events: [...this.eventsNotOnTopic(), ...onTopicEvents.slice(0, 5)].sort(
          (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
        ),
      });
    } else {
      return new Application({
        ...this,
        events: this.eventsNotOnTopic(),
      });
    }
  }

  toJson() {
    return JSON.stringify({
      topic: this.topic,
      topics: this.topics,
      events: this.events.map((event) => event.toJson()),
      absoluteDate: this.absoluteDate,
    });
  }

  private eventsOnTopic() {
    return this.events.filter((event) => event.topic === this.topic);
  }

  private eventsNotOnTopic() {
    return this.events.filter((event) => event.topic !== this.topic);
  }
}

const DEFAULT_APP = new Application({ events: [] });
const APPLICATION_AT_STARTUP = (() => {
  const storedApp = localStorage.getItem(APPLICATION);
  return Application.for(storedApp ?? DEFAULT_APP.toJson()).toJson();
})();

const ensure = (action: () => void) => {
  if (!window.confirm("Are you sure you want to delete all events?")) {
    return;
  }

  action();
};

function useApplication() {
  const [appState, setAppState] = useState(APPLICATION_AT_STARTUP);
  const application = Application.for(appState);
  debug({ application });

  const saveState = (app: Application) => {
    const string = app.toJson();
    localStorage.setItem(APPLICATION, string);
    setAppState(string);
  };

  const setTopic = (topic: string) => saveState(application.withTopic(topic));
  const addTopic = (topic: string) => {
    if (application.hasTopicAlready(topic)) {
      alert("You already have a topic called " + topic);
      return;
    }

    saveState(application.withNewTopic(topic));
  };
  const deleteTopic = () => {
    if (application.topic === DEFAULT_TOPIC) {
      alert("You cannot delete the default topic");
      return;
    }

    ensure(() => saveState(application.withoutTopic()));
  };
  const addEvent = () => saveState(application.withNewEvent());

  const toggleAbsoluteDate = () =>
    saveState(application.withToggleAbsoluteDate());

  const clearApplication = () => ensure(() => saveState(DEFAULT_APP));
  const clearHistory = () =>
    ensure(() => saveState(application.deleteEvents()));

  return {
    setTopic,
    addTopic,
    deleteTopic,
    addEvent,
    toggleAbsoluteDate,
    clearApplication,
    clearHistory,
    absoluteDate: application.absoluteDate,
    events: application.eventsToShow(),
    topic: application.topic,
    topics: application.topics,
  };
}

function Event({
  event,
  topic,
  absolute,
}: {
  event: EventRecord;
  topic: string;
  absolute: boolean;
}) {
  return (
    <div>
      {absolute
        ? dayjs(event.date).format("MMMM D, YYYY (h:mm A)")
        : dayjs(event.date).fromNow()}
      {topic === DEFAULT_TOPIC ? (
        <span className="padding-text">{event.topic}</span>
      ) : null}
    </div>
  );
}

function App() {
  const {
    setTopic,
    addTopic,
    deleteTopic,
    topic,
    topics,
    addEvent,
    clearHistory,
    clearApplication,
    events,
    toggleAbsoluteDate,
    absoluteDate,
  } = useApplication();

  return (
    <div>
      <section className="center-heading">
        <RecordEventHeader topic={topic} addEvent={addEvent} />
      </section>
      <section>
        <h3 className="center-heading">Event list</h3>
        <EventList
          events={events}
          absoluteDate={absoluteDate}
          toggleAbsoluteDate={toggleAbsoluteDate}
          topic={topic}
        />
        <ClearHistory
          clearHistory={clearHistory}
          clearApplication={clearApplication}
        />
      </section>
      <section className="center-heading">
        <Topics
          topic={topic}
          setTopic={setTopic}
          addTopic={addTopic}
          topics={topics}
          deleteTopic={deleteTopic}
        />
      </section>
    </div>
  );
}

function RecordEventHeader({
  topic,
  addEvent,
}: {
  topic: string;
  addEvent: () => void;
}) {
  return (
    <>
      <h1>Event log: ({topic})</h1>
      <h3>New event</h3>
      <div onClick={addEvent} className="center-button">
        <button>Record Event</button>
      </div>
    </>
  );
}

function EventList({
  events,
  absoluteDate,
  topic,
  toggleAbsoluteDate,
}: {
  events: EventRecord[];
  absoluteDate: boolean;
  topic: string;
  toggleAbsoluteDate: () => void;
}) {
  return (
    <div onClick={toggleAbsoluteDate}>
      <ul>
        {events.map((event: EventRecord) => (
          <li key={event.id()}>
            <Event event={event} absolute={absoluteDate} topic={topic} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClearHistory({
  clearHistory,
  clearApplication,
}: {
  clearHistory: () => void;
  clearApplication: () => void;
}) {
  return (
    <div className="center-button">
      <h3>Deletion</h3>
      <span onClick={clearHistory} className="padding-button">
        <button>Delete Events</button>
      </span>
      <span onClick={clearApplication} className="padding-button">
        <button>Clear All History And Topics</button>
      </span>
    </div>
  );
}

function Topics({
  topic,
  topics,
  addTopic,
  setTopic,
  deleteTopic,
}: {
  topic: string;
  topics: string[];
  addTopic: (topic: string) => void;
  setTopic: (topic: string) => void;
  deleteTopic: () => void;
}) {
  return (
    <>
      <label htmlFor="TopicList">
        <h2>Topics</h2>
      </label>
      <TopicsDropdown
        topic={topic}
        topics={topics}
        setTopic={setTopic}
        deleteTopic={deleteTopic}
      />
      <div className="padding-section">
        <TopicInput addTopic={addTopic} />
      </div>
    </>
  );
}

function TopicsDropdown({
  topic,
  topics,
  setTopic,
  deleteTopic,
}: {
  topic: string;
  topics: string[];
  setTopic: (name: string) => void;
  deleteTopic: () => void;
}) {
  const topicsWithId = topics
    .filter((name) => name !== DEFAULT_TOPIC)
    .map((name) => [name, "topic-" + name.toLowerCase()]);

  debug({ topic });

  return (
    <>
      <h3>Selection</h3>
      <div
        className="padding-vertical-button"
        onClick={() => setTopic(DEFAULT_TOPIC)}
      >
        <button>{DEFAULT_TOPIC}</button>
      </div>
      <div className="button-section">
        {topicsWithId.map(([name, id]) => (
          <span
            onClick={() => setTopic(name)}
            className="padding-vertical-button padding-button"
          >
            <button>{name}</button>
          </span>
        ))}
      </div>
      <h3>Create and delete topics</h3>
      <span className="padding-button">
        <button onClick={deleteTopic}>Delete Current Topic</button>
      </span>
    </>
  );
}

function TopicInput({ addTopic }: { addTopic: (name: string) => void }) {
  const [text, setText] = useState("My Topic");

  const onText = (event: any) => setText(event.target.value.trim());
  const onClick = () => addTopic(text);

  return (
    <>
      <span className="padding-button">
        <label htmlFor="NewTopic">Add a new topic:</label>
      </span>
      <span className="padding-button">
        <input
          onChange={onText}
          type="text"
          id="NewTopic"
          name="NewTopic"
          required
          minLength={2}
          maxLength={32}
          size={32}
          placeholder="My Topic"
        ></input>
      </span>
      <span className="padding-button">
        <button onClick={onClick}>Submit</button>
      </span>
    </>
  );
}

export default App;
