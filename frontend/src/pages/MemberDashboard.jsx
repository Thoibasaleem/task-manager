import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LiveTimer, formatSeconds } from '../components/LiveTimer.jsx';

function statusBadge(status) {
  const map = {
    pending: 'bg-slate-700/60 text-slate-200',
    submitted: 'bg-amber-900/40 text-amber-200',
    approved: 'bg-emerald-900/40 text-emerald-200',
    rejected: 'bg-red-900/40 text-red-200',
  };
  return map[String(status || '').toLowerCase()] || 'bg-slate-700 text-slate-200';
}

export function MemberDashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [proofOfWork, setProofOfWork] = useState('');
  const [todayProgress, setTodayProgress] = useState({ submittedToday: 0, assignedTotal: 0 });

  const loadTasks = useCallback(async () => {
    setLoadingList(true);
    try {
      const [data, progress] = await Promise.all([api.tasks(), api.todayProgress()]);
      setTasks(data);
      setTodayProgress(progress);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (selectedId && tasks.length > 0 && !tasks.find((t) => t._id === selectedId)) {
      setSelectedId(null);
      setDetail(null);
    }
  }, [tasks, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const t = await api.task(selectedId);
        if (!cancelled) {
          setDetail(t);
          setProofOfWork(t.proofOfWork || '');
        }
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const minRequired = detail?.minTimeRequired ?? 0;
  const status = String(detail?.status || '').toLowerCase();
  const timerActive = Boolean(selectedId && detail && status === 'pending');
  const progressPercent =
    todayProgress.assignedTotal > 0
      ? Math.min(100, Math.round((todayProgress.submittedToday / todayProgress.assignedTotal) * 100))
      : 0;
  const canSubmit =
    detail &&
    status === 'pending' &&
    liveSeconds >= minRequired &&
    proofOfWork.trim().length > 0 &&
    minRequired >= 0;

  async function handleSubmit() {
    if (!detail || !canSubmit) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const rounded = Math.round(liveSeconds * 1000) / 1000;
      await api.submitTask(detail._id, rounded, proofOfWork.trim());
      await loadTasks();
      const updated = await api.task(detail._id);
      setDetail(updated);
      setProofOfWork(updated.proofOfWork || '');
      setSelectedId(updated._id);
    } catch (err) {
      setSubmitError(err.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#3b0d4d_0%,_#140018_60%)]">
      <header className="border-b border-ethara-border bg-ethara-surface/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-ethara-accent">
              Ethara AI
            </p>
            <h1 className="font-display text-xl font-bold text-white">My assignments</h1>
            <p className="text-sm text-ethara-muted">
              Signed in as <span className="text-slate-200">{user?.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-ethara-border px-4 py-2 text-sm text-ethara-muted transition hover:border-slate-500 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="glass-panel p-6">
          <h2 className="font-display text-lg font-semibold text-white">Assigned tasks</h2>
          <p className="mt-1 text-sm text-ethara-muted">Select a task to start the live timer.</p>
          <div className="mt-4 rounded-xl border border-ethara-border bg-ethara-bg/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ethara-muted">Today's Progress</span>
              <span className="font-semibold text-white">
                {todayProgress.submittedToday} / {todayProgress.assignedTotal} tasks
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ethara-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {loadingList && (
              <p className="text-sm text-ethara-muted">Loading tasks…</p>
            )}
            {!loadingList && tasks.length === 0 && (
              <p className="text-sm text-ethara-muted">No tasks assigned yet.</p>
            )}
            {tasks.map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => setSelectedId(t._id)}
                className={`flex w-full flex-col rounded-xl border px-4 py-3 text-left transition ${
                  selectedId === t._id
                    ? 'border-ethara-accent bg-fuchsia-950/30'
                    : 'border-ethara-border hover:border-slate-500'
                }`}
              >
                <span className="font-medium text-white">{t.title}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-ethara-muted">
                  <span className={`rounded-full px-2 py-0.5 ${statusBadge(t.status)}`}>{t.status}</span>
                  <span>Min: {t.minTimeRequired}s</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-panel flex min-h-[420px] flex-col p-6">
          {!selectedId && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-ethara-muted">Choose a task from the list to open the workspace.</p>
            </div>
          )}
          {selectedId && loadingDetail && (
            <p className="text-sm text-ethara-muted">Opening task…</p>
          )}
          {detail && !loadingDetail && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ethara-border pb-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">{detail.title}</h2>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-300">
                    {detail.description || 'No description provided.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-ethara-muted">
                    <span className={`rounded-full px-2 py-1 ${statusBadge(detail.status)}`}>
                      {detail.status}
                    </span>
                    <span>Minimum time: {detail.minTimeRequired}s</span>
                    {detail.actualTimeSpent > 0 && (
                      <span>Last recorded: {detail.actualTimeSpent}s</span>
                    )}
                  </div>
                  {detail.adminFeedback && (
                    <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-300">
                        Admin feedback
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-red-100">
                        {detail.adminFeedback}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 grid gap-8">
                <LiveTimer
                  key={selectedId}
                  active={timerActive}
                  onTick={setLiveSeconds}
                />
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wider text-ethara-muted">
                    Proof of work
                  </span>
                  <textarea
                    rows={8}
                    value={proofOfWork}
                    disabled={status !== 'pending' || submitting}
                    onChange={(e) => setProofOfWork(e.target.value)}
                    placeholder="Paste prompts, image URLs, steps taken, and any useful context."
                    className="mt-2 w-full rounded-xl border border-ethara-border bg-ethara-bg px-4 py-3 text-sm text-white outline-none ring-ethara-accent focus:ring-2 disabled:opacity-70"
                  />
                </label>
                <div className="flex flex-col justify-end gap-3 rounded-xl border border-ethara-border bg-ethara-bg/60 p-4">
                  <div className="text-xs text-ethara-muted">
                    Submit sends your elapsed time for review. Required minimum:{' '}
                    <span className="font-semibold text-white">{formatSeconds(minRequired)}</span>
                  </div>
                  <div className="text-sm text-slate-300">
                    Elapsed:{' '}
                    <span className="font-mono text-white">{formatSeconds(liveSeconds)}</span>
                    {liveSeconds < minRequired && status === 'pending' && (
                      <span className="ml-2 text-ethara-warn">
                        ({formatSeconds(Math.max(0, minRequired - liveSeconds))} remaining)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!canSubmit || submitting || status !== 'pending'}
                    onClick={handleSubmit}
                    className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {status !== 'pending'
                      ? 'Already submitted'
                      : submitting
                        ? 'Submitting…'
                        : 'Submit'}
                  </button>
                  {submitError && (
                    <p className="text-sm text-ethara-danger">{submitError}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
