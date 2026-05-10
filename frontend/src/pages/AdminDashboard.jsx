import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

function statusBadge(status) {
  const map = {
    pending: 'bg-slate-700/60 text-slate-200',
    submitted: 'bg-amber-900/40 text-amber-200',
    approved: 'bg-emerald-900/40 text-emerald-200',
    rejected: 'bg-red-900/40 text-red-200',
  };
  return map[String(status || '').toLowerCase()] || 'bg-slate-700 text-slate-200';
}

function formatAht(seconds) {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toFixed(0)}s`;
}

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    minTimeRequired: '',
    selectedUserIds: [],
    tasksPerMember: 1,
  });
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [reviewTask, setReviewTask] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const isAdmin = user?.role?.toLowerCase?.() === 'admin';

  async function fetchDashboardData() {
    setLoading(true);
    setError('');
    try {
      const [quality, allTasks, allUsers] = await Promise.all([
        api.qualityStats(),
        api.tasks(),
        api.users(),
      ]);
      setStats(quality);
      setTasks(allTasks);
      setUsers(allUsers);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [quality, allTasks, allUsers] = await Promise.all([
          api.qualityStats(),
          api.tasks(),
          api.users(),
        ]);
        if (cancelled) return;
        setStats(quality);
        setTasks(allTasks);
        setUsers(allUsers);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!isAdmin) return;
    setCreateError('');
    const title = form.title.trim();
    const minTimeRequired = Number(form.minTimeRequired);
    const tasksPerMember = Number(form.tasksPerMember);
    if (!title) {
      setCreateError('Task title is required.');
      return;
    }
    if (!Array.isArray(form.selectedUserIds) || form.selectedUserIds.length === 0) {
      setCreateError('Please select at least one assignee.');
      return;
    }
    if (Number.isNaN(minTimeRequired) || minTimeRequired < 0) {
      setCreateError('Min time must be a non-negative number.');
      return;
    }
    if (!Number.isInteger(tasksPerMember) || tasksPerMember <= 0) {
      setCreateError('Tasks per member must be a positive integer.');
      return;
    }

    setCreateBusy(true);
    try {
      await api.bulkCreateTasks(
        form.selectedUserIds,
        {
          title,
          minTimeRequired,
        },
        tasksPerMember
      );
      setForm((prev) => ({
        ...prev,
        title: '',
        minTimeRequired: '',
        tasksPerMember: 1,
      }));
      await fetchDashboardData();
    } catch (err) {
      setCreateError(err.message || 'Failed to create task');
    } finally {
      setCreateBusy(false);
    }
  }

  const allSelected = users.length > 0 && form.selectedUserIds.length === users.length;

  function toggleSelectAll(checked) {
    setForm((prev) => ({
      ...prev,
      selectedUserIds: checked ? users.map((u) => u._id) : [],
    }));
  }

  function openReview(task) {
    setReviewTask(task);
    setReviewFeedback(task.adminFeedback || '');
    setReviewError('');
  }

  function closeReview() {
    setReviewTask(null);
    setReviewFeedback('');
    setReviewError('');
  }

  async function handleReview(decision) {
    if (!reviewTask) return;
    setReviewError('');
    if (decision === 'reject' && !reviewFeedback.trim()) {
      setReviewError('Feedback is required when rejecting a task.');
      return;
    }
    setReviewBusy(true);
    try {
      await api.reviewTask(
        reviewTask._id,
        decision,
        decision === 'reject' ? reviewFeedback.trim() : ''
      );
      await fetchDashboardData();
      closeReview();
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#3b0d4d_0%,_#140018_60%)]">
      <header className="border-b border-ethara-border bg-ethara-surface/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-white">
              Ethara AI
            </p>
            <h1 className="font-display text-xl font-bold text-white">Quality command center</h1>
            <p className="text-sm text-ethara-muted">
              Admin · <span className="text-slate-200">{user?.name}</span>
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

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {isAdmin && (
          <section className="glass-panel p-6">
            <h2 className="font-display text-lg font-semibold text-white">Create task</h2>
            <p className="mt-1 text-sm text-ethara-muted">
              Assign a new annotation task to a team member.
            </p>
            <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={handleCreateTask}>
              <label className="block">
                <span className="text-xs font-medium text-ethara-muted">Task Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-ethara-border bg-ethara-bg px-4 py-3 text-sm text-white outline-none ring-white focus:ring-2"
                  placeholder="e.g. Validate OCR output batch 12"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ethara-muted">Min Time Required (seconds)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.minTimeRequired}
                  onChange={(e) => setForm((prev) => ({ ...prev, minTimeRequired: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-ethara-border bg-ethara-bg px-4 py-3 text-sm text-white outline-none ring-white focus:ring-2"
                  placeholder="600"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ethara-muted">Tasks Per Member</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.tasksPerMember}
                  onChange={(e) => setForm((prev) => ({ ...prev, tasksPerMember: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-ethara-border bg-ethara-bg px-4 py-3 text-sm text-white outline-none ring-white focus:ring-2"
                  required
                />
              </label>
              <div className="md:col-span-3">
                <p className="text-xs font-medium text-ethara-muted">Select Assignees</p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setAssigneeDropdownOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-xl border border-ethara-border bg-ethara-bg px-4 py-3 text-left text-sm text-white outline-none ring-white focus:ring-2"
                  >
                    <span>
                      {form.selectedUserIds.length === 0
                        ? 'Select members'
                        : `${form.selectedUserIds.length} member(s) selected`}
                    </span>
                    <span className="text-ethara-muted">{assigneeDropdownOpen ? '▲' : '▼'}</span>
                  </button>

                  {assigneeDropdownOpen && (
                    <div className="mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-ethara-border bg-ethara-surface p-2 shadow-xl">
                      <label className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-100 hover:bg-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="h-4 w-4 rounded border-ethara-border bg-ethara-bg text-white"
                        />
                        <span className="font-medium">Select all</span>
                      </label>
                      <div className="my-1 border-t border-ethara-border" />
                      {users.length === 0 && (
                        <p className="px-2 py-2 text-sm text-ethara-muted">No users available</p>
                      )}
                      {users.map((u) => {
                        const checked = form.selectedUserIds.includes(u._id);
                        return (
                          <label
                            key={u._id}
                            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-white/[0.04]"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  selectedUserIds: e.target.checked
                                    ? [...prev.selectedUserIds, u._id]
                                    : prev.selectedUserIds.filter((id) => id !== u._id),
                                }))
                              }
                              className="h-4 w-4 rounded border-ethara-border bg-ethara-bg text-white"
                            />
                            <span>
                              {u.name} ({u.email})
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={createBusy || users.length === 0 || form.selectedUserIds.length === 0}
                  className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {createBusy ? 'Creating…' : 'Create Bulk Tasks'}
                </button>
                {createError && <p className="mt-3 text-sm text-ethara-danger">{createError}</p>}
              </div>
            </form>
          </section>
        )}

        <section>
          <h2 className="font-display text-lg font-semibold text-white">Quality stats</h2>
          <p className="mt-1 text-sm text-ethara-muted">
            Rejected volume and team average handle time (AHT) across tasks with recorded effort.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="glass-panel p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-ethara-muted">
                Rejected tasks
              </p>
              <p className="mt-3 font-display text-4xl font-bold text-ethara-danger">
                {loading ? '…' : stats?.rejectedCount ?? 0}
              </p>
              <p className="mt-2 text-xs text-ethara-muted">Lifetime rejections in the pipeline.</p>
            </div>
            <div className="glass-panel p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-ethara-muted">
                Team AHT
              </p>
              <p className="mt-3 font-display text-4xl font-bold text-white">
                {loading ? '…' : formatAht(stats?.averageHandleTimeSeconds)}
              </p>
              <p className="mt-2 text-xs text-ethara-muted">
                Mean <code className="text-slate-400">actualTimeSpent</code> where recorded.
              </p>
            </div>
            <div className="glass-panel p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-ethara-muted">
                Tasks with time
              </p>
              <p className="mt-3 font-display text-4xl font-bold text-white">
                {loading ? '…' : stats?.tasksWithTimeRecorded ?? 0}
              </p>
              <p className="mt-2 text-xs text-ethara-muted">Used in the AHT denominator.</p>
            </div>
          </div>
        </section>

        <section className="glass-panel overflow-hidden p-0">
          <div className="border-b border-ethara-border px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-white">All tasks</h2>
            <p className="text-sm text-ethara-muted">Operational visibility across the annotation queue.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-ethara-border bg-ethara-bg/40 text-xs uppercase tracking-wider text-ethara-muted">
                <tr>
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Assignee</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Min (s)</th>
                  <th className="px-6 py-3 font-medium">Actual (s)</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ethara-border">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-ethara-muted">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && tasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-ethara-muted">
                      No tasks yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  tasks.map((t) => (
                    <tr key={t._id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-medium text-white">{t.title}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {t.assignedTo?.name || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs ${statusBadge(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">{t.minTimeRequired}</td>
                      <td className="px-6 py-4 font-mono text-slate-300">{t.actualTimeSpent}</td>
                      <td className="px-6 py-4">
                        {String(t.status || '').toLowerCase() === 'submitted' ? (
                          <button
                            type="button"
                            onClick={() => openReview(t)}
                            className="rounded-lg border border-ethara-accent/60 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ethara-accent/10"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-xs text-ethara-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {reviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="glass-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-semibold text-white">Review submission</h3>
                <p className="mt-1 text-sm text-ethara-muted">{reviewTask.title}</p>
              </div>
              <button
                type="button"
                onClick={closeReview}
                className="rounded-lg border border-ethara-border px-3 py-1 text-sm text-ethara-muted hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-ethara-muted">Proof of work</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-ethara-border bg-ethara-bg/70 p-4 text-sm text-slate-200">
                {reviewTask.proofOfWork || 'No proof of work provided.'}
              </pre>
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-medium uppercase tracking-wider text-ethara-muted">
                Feedback (required for rejection)
              </span>
              <textarea
                rows={4}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                disabled={reviewBusy}
                placeholder="Explain what should be fixed if rejecting this work."
                className="mt-2 w-full rounded-xl border border-ethara-border bg-ethara-bg px-4 py-3 text-sm text-white outline-none ring-white focus:ring-2 disabled:opacity-70"
              />
            </label>

            {reviewError && <p className="mt-3 text-sm text-ethara-danger">{reviewError}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={reviewBusy}
                onClick={() => handleReview('approve')}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {reviewBusy ? 'Saving…' : 'Approve'}
              </button>
              <button
                type="button"
                disabled={reviewBusy}
                onClick={() => handleReview('reject')}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {reviewBusy ? 'Saving…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
