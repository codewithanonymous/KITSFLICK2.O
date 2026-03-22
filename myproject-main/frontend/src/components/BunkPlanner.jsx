import { useEffect, useMemo, useState } from 'react';
import { Reveal } from './Animations';

const STORAGE_KEY = 'kitsflick_bunk_planner_v1';

const DEFAULT_FORM = {
  totalClasses: '',
  attendedClasses: '',
  todayTotalClasses: '',
  bunkClasses: '0',
  goalPercentage: '75',
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateAttendance(
  totalClasses,
  attendedClasses,
  todayTotalClasses,
  bunkClasses
) {
  const currentPercentage = (attendedClasses / totalClasses) * 100;

  const classesAttendedToday = todayTotalClasses - bunkClasses;

  const newTotal = totalClasses + todayTotalClasses;
  const newAttended = attendedClasses + classesAttendedToday;

  const newPercentage = (newAttended / newTotal) * 100;

  let required = Math.ceil((0.75 * newTotal - newAttended) / 0.25);
  if (required < 0) required = 0;

  return {
    currentPercentage: currentPercentage.toFixed(2),
    newPercentage: newPercentage.toFixed(2),
    requiredClasses: required
  };
}

function calculateRequiredForGoal(newTotal, newAttended, goalPercentage) {
  const goal = goalPercentage / 100;
  let required = Math.ceil((goal * newTotal - newAttended) / (1 - goal));
  if (required < 0) required = 0;
  return required;
}

function getRiskLabel(newPercentage) {
  if (newPercentage < 65) return { tone: 'danger', text: 'Danger: Attendance below 65%' };
  if (newPercentage < 75) return { tone: 'warning', text: 'Warning: You are at risk' };
  return { tone: 'safe', text: 'Safe attendance' };
}

export default function BunkPlanner() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setForm((current) => ({
        ...current,
        ...parsed,
      }));
    } catch (loadError) {
      console.warn('Failed to load bunk planner state:', loadError);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch (saveError) {
      console.warn('Failed to save bunk planner state:', saveError);
    }
  }, [form]);

  const todayMax = Math.max(0, Math.floor(toNumber(form.todayTotalClasses)));
  const sliderValue = Math.min(Math.max(0, Math.floor(toNumber(form.bunkClasses))), todayMax);

  const risk = useMemo(() => {
    if (!result) return null;
    return getRiskLabel(Number(result.newPercentage));
  }, [result]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleCalculate(event) {
    event.preventDefault();
    setError('');

    const totalClasses = toNumber(form.totalClasses);
    const attendedClasses = toNumber(form.attendedClasses);
    const todayTotalClasses = toNumber(form.todayTotalClasses);
    const bunkClasses = toNumber(form.bunkClasses);
    const goalPercentage = toNumber(form.goalPercentage);

    if (totalClasses <= 0) {
      setError('Total classes must be greater than 0.');
      setResult(null);
      return;
    }

    if (attendedClasses < 0 || todayTotalClasses < 0 || bunkClasses < 0) {
      setError('All class values must be 0 or greater.');
      setResult(null);
      return;
    }

    if (attendedClasses > totalClasses) {
      setError('Validation failed: attendedClasses must be less than or equal to totalClasses.');
      setResult(null);
      return;
    }

    if (bunkClasses > todayTotalClasses) {
      setError('Validation failed: bunkClasses must be less than or equal to todayTotalClasses.');
      setResult(null);
      return;
    }

    const base = calculateAttendance(totalClasses, attendedClasses, todayTotalClasses, bunkClasses);
    const classesAttendedToday = todayTotalClasses - bunkClasses;
    const newTotal = totalClasses + todayTotalClasses;
    const newAttended = attendedClasses + classesAttendedToday;
    const requiredForGoal = calculateRequiredForGoal(newTotal, newAttended, goalPercentage);

    setResult({
      ...base,
      requiredClasses: requiredForGoal,
      goalPercentage,
    });
  }

  return (
    <main className="public-page">
      <section className="public-section">
        <Reveal className="card section-card wide-card">
          <span className="eyebrow">Planner</span>
          <h1>Bunk Planner</h1>
          <p>Plan today’s bunks and instantly see your updated attendance.</p>
        </Reveal>

        <div className="bunk-planner-grid">
          <Reveal className="card section-card">
            <h3>Attendance Inputs</h3>
            <form className="form-stack compact-form" onSubmit={handleCalculate}>
              <label htmlFor="totalClasses">
                Total classes conducted till now
                <input
                  id="totalClasses"
                  type="number"
                  min="0"
                  value={form.totalClasses}
                  onChange={(event) => updateField('totalClasses', event.target.value)}
                  required
                />
              </label>

              <label htmlFor="attendedClasses">
                Classes attended
                <input
                  id="attendedClasses"
                  type="number"
                  min="0"
                  value={form.attendedClasses}
                  onChange={(event) => updateField('attendedClasses', event.target.value)}
                  required
                />
              </label>

              <label htmlFor="todayTotalClasses">
                Total classes today
                <input
                  id="todayTotalClasses"
                  type="number"
                  min="0"
                  value={form.todayTotalClasses}
                  onChange={(event) => {
                    const nextTodayTotal = toNumber(event.target.value);
                    const nextBunk = Math.min(toNumber(form.bunkClasses), Math.max(0, nextTodayTotal));
                    setForm((current) => ({
                      ...current,
                      todayTotalClasses: event.target.value,
                      bunkClasses: String(nextBunk),
                    }));
                  }}
                  required
                />
              </label>

              <label htmlFor="bunkClasses">
                Bunk classes: <strong>{sliderValue}</strong>
                <input
                  id="bunkClasses"
                  type="range"
                  min="0"
                  max={todayMax}
                  value={sliderValue}
                  onChange={(event) => updateField('bunkClasses', event.target.value)}
                />
              </label>

              <label htmlFor="goalPercentage">
                Attendance goal
                <select
                  id="goalPercentage"
                  value={form.goalPercentage}
                  onChange={(event) => updateField('goalPercentage', event.target.value)}
                >
                  <option value="75">75%</option>
                  <option value="80">80%</option>
                  <option value="85">85%</option>
                </select>
              </label>

              <button className="animated-button" type="submit">Calculate</button>
            </form>
            {error ? <p className="message error">{error}</p> : null}
          </Reveal>

          <Reveal className="card section-card">
            <h3>Results</h3>
            {!result ? (
              <p className="muted">Fill the form and click Calculate to view attendance impact.</p>
            ) : (
              <div className="bunk-results">
                <p className="bunk-result-item">Current Attendance: <strong>{result.currentPercentage}%</strong></p>
                <p className="bunk-result-item">New Attendance after bunking: <strong>{result.newPercentage}%</strong></p>
                <p className={`message ${risk?.tone === 'danger' ? 'error' : risk?.tone === 'safe' ? 'success' : ''}`}>
                  {risk?.text}
                </p>
                <p className="bunk-result-item">
                  You need to attend <strong>{result.requiredClasses}</strong> more classes continuously to reach <strong>{result.goalPercentage}%</strong>.
                </p>
              </div>
            )}
          </Reveal>
        </div>
      </section>
    </main>
  );
}
