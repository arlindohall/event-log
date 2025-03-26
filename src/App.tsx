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
  date: string;
  topic: string;

  constructor(fields: EventFields) {
    this.date = fields.date ?? dayjs().format();
    this.topic = fields.topic;
  }

  id() {
    return `${this.topic ?? "default"}--${this.date}`;
  }
}

class Application {
  static for(string: string): Application {
    const fields = JSON.parse(string);
    fields.events = fields.events.map((event: any) => new EventRecord(event));

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
      events: this.events as { date: string; topic: string }[],
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
  let application: Application;
  try {
    application = Application.for(appState);
  } catch (exception) {
    console.error(exception);
    application = DEFAULT_APP;
  }
  debug({ application });

  const saveState = (app: Application) => {
    const string = app.toJson();
    debug({ application });
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
    backupJson: application.toJson(),
  };
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
    backupJson,
  } = useApplication();

  // TOPICS
  const [text, setText] = useState("My Topic");

  const onText = (event: any) => setText(event.target.value.trim());
  const onClick = () => addTopic(text);
  const topicsWithId = topics
    .filter((name) => name !== DEFAULT_TOPIC)
    .map((name) => [name, "topic-" + name.toLowerCase()]);

  debug({ topic });

  return (
    <div className="page">
      <header>
        <h1>Event log</h1>
      </header>
      <main className="content">
        <section className="segment body">
          <h2>{topic}</h2>
          <h3>New event</h3>
          <div onClick={addEvent}>
            <button>Record Event</button>
          </div>
          <h3>Event list</h3>
          <div onClick={toggleAbsoluteDate}>
            <ul>
              {events.map((event: EventRecord) => (
                <li key={event.id()}>
                  {absoluteDate
                    ? dayjs(event.date).format("MMMM D, YYYY (h:mm A)")
                    : dayjs(event.date).fromNow()}
                  {topic === DEFAULT_TOPIC ? (
                    <span className="padding-left-1">{event.topic}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>
              Delete events
              <span className="padding-left-1">
                <img
                  src="https://unpkg.com/@primer/octicons@13.0.0/build/svg/question-16.svg"
                  alt="Help icon"
                  title="Clicking 'Delete Events' deletes all events if there are 5 or fewer, otherwise it deletes all but the 5 latest events"
                />
              </span>
            </h3>
            <div onClick={clearHistory}>
              <button>Delete Events</button>
            </div>
            <h3>
              Delete all history
              <span className="padding-left-1">
                <img
                  src="https://unpkg.com/@primer/octicons@13.0.0/build/svg/question-16.svg"
                  alt="Help icon"
                  title="Clicking 'Clear History' deletes all events and topics"
                />
              </span>
            </h3>
            <div onClick={clearApplication}>
              <button>Clear History</button>
            </div>
          </div>
        </section>
        <section className="segment sidebar">
          <label htmlFor="TopicList">
            <h2>Topics</h2>
          </label>
          <h3>Selection</h3>
          <div onClick={() => setTopic(DEFAULT_TOPIC)}>
            <button>{DEFAULT_TOPIC}</button>
          </div>
          <div>
            {topicsWithId.map(([name, id]) => (
              <div onClick={() => setTopic(name)}>
                <button>{name}</button>
              </div>
            ))}
          </div>
          <h3>Create topics</h3>
          <div>
            <span>
              <label htmlFor="NewTopic">Add a new topic:</label>
            </span>
            <span>
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
            <span className="padding-left-1">
              <button onClick={onClick}>Submit</button>
            </span>
          </div>
          <h3>Delete current topic</h3>
          <span>
            <button onClick={deleteTopic}>Delete</button>
          </span>
          <h3>Download</h3>
          <a
            download="backup.json"
            href={`data:application/json,${backupJson}`}
          >
            <button>Download</button>
          </a>
        </section>
      </main>
    </div>
  );
}

export default App;
