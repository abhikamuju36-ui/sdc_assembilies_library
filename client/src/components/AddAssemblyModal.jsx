import { useState, useEffect, useCallback } from 'react';

const PREDEFINED_CATEGORIES = [
  'chassis', 'conveyor', 'cutting', 'die set', 'dispensing', 'escapement', 'feeding',
  'fixture', 'fixture - assembly chassis', 'gripper', 'heating and cooling', 'HMI',
  'indexer', 'insertion', 'inspection', 'labeler', 'laser', 'linear motion', 'marking',
  'packaging', 'pick and place', 'pneumatics', 'power transmission', 'press', 'process',
  'rotary motion', 'safety', 'screw drive', 'structural', 'testing', 'tray handling',
  'tooling', 'verify', 'slide'
];

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5 grow">
      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">
        {label}{required && <span className="text-[var(--accent)] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function AddAssemblyModal({ open, onClose, onAdd }) {
  const [partno,      setPartno]      = useState('');
  const [jobId,       setJobId]       = useState('');
  const [jobName,     setJobName]     = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('');
  const [showAdd,     setShowAdd]     = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [comments,    setComments]    = useState('');
  const [updatedBy,   setUpdatedBy]   = useState('');
  const [modelLink,   setModelLink]   = useState('');
  const [pictureLink, setPictureLink] = useState('');
  const [preference,  setPreference]  = useState('');
  const [sdcStandard, setSdcStandard] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setPartno(''); setJobId(''); setJobName(''); setDescription('');
      setCategory(''); setShowAdd(false); setNewCategory('');
      setComments(''); setUpdatedBy(''); setModelLink(''); setPictureLink('');
      setPreference(''); setSdcStandard(''); setSaving(false); setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!partno.trim()) { setError('Part number is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const finalCategory = showAdd && newCategory.trim() ? newCategory.trim() : category;
      await onAdd({
        partno: partno.trim(),
        job_id: jobId.trim() || null,
        job_name: jobName.trim() || null,
        description: description.trim() || null,
        category: finalCategory || null,
        comments: comments.trim() || null,
        updated_by: updatedBy.trim() || null,
        model_link: modelLink.trim() || null,
        picture_link: pictureLink.trim() || null,
        preference: preference || null,
        sdc_standard: sdcStandard || null,
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [partno, jobId, jobName, description, category, showAdd, newCategory, comments, updatedBy, modelLink, pictureLink, preference, sdcStandard, onAdd, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <div>
            <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter uppercase">
              Add <span className="text-[var(--accent)]">Record</span>
            </h2>
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mt-1 opacity-60">Manual Assembly Entry</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-500 transition-all active:scale-95 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 custom-scrollbar">
          {/* Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[var(--bg-main)] p-6 rounded-3xl border border-[var(--border-color)]">
            <Field label="Part Number" required>
              <input
                autoFocus
                type="text"
                value={partno}
                onChange={(e) => { setPartno(e.target.value); setError(''); }}
                placeholder="e.g. ASM-12345"
                className="sdc-input w-full font-mono-eng"
              />
            </Field>
            <Field label="Job ID">
              <input
                type="text"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="e.g. J-2024-001"
                className="sdc-input w-full font-mono-eng"
              />
            </Field>
            <Field label="Job Name">
              <input
                type="text"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="Project name..."
                className="sdc-input w-full"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Assembly function and purpose..."
                  className="sdc-input w-full resize-none leading-relaxed py-2 h-auto"
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Category */}
            <Field label="Functional Category">
              {!showAdd ? (
                <div className="flex gap-3">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="sdc-input flex-1 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1.2rem center',
                      backgroundSize: '1.2em'
                    }}
                  >
                    <option value="">None / Uncategorized</option>
                    {PREDEFINED_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={() => setShowAdd(true)} className="sdc-btn-outline px-6 whitespace-nowrap">
                    + <span className="ml-1">Custom</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 animate-in slide-in-from-left-4 duration-300">
                  <input
                    autoFocus
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category label..."
                    className="sdc-input flex-1"
                  />
                  <button onClick={() => setShowAdd(false)} className="sdc-btn-outline px-6 text-red-500 border-red-500 hover:bg-red-500">
                    Cancel
                  </button>
                </div>
              )}
            </Field>

            <Field label="Assembly Comments">
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                placeholder="Technical notes, revision history, or special instructions..."
                className="sdc-input w-full resize-none leading-relaxed py-4"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Field label="Updated By">
                <input
                  type="text"
                  value={updatedBy}
                  onChange={(e) => setUpdatedBy(e.target.value)}
                  placeholder="Lead Engineer"
                  className="sdc-input w-full"
                />
              </Field>
              <Field label="System Preference">
                <div className="flex gap-1.5 p-1.5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
                  {['Yes', 'No'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPreference(preference === opt ? '' : opt)}
                      className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all ${preference === opt ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-md border border-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="SDC Standard">
                <div className="flex gap-1.5 p-1.5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
                  {['Yes', 'No'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSdcStandard(sdcStandard === opt ? '' : opt)}
                      className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all ${sdcStandard === opt ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-md border border-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <Field label="CAD Model Link">
                <div className="group relative">
                  <input
                    type="text"
                    value={modelLink}
                    onChange={(e) => setModelLink(e.target.value)}
                    placeholder="https://..."
                    className="sdc-input w-full pl-10"
                  />
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]/40 group-focus-within:text-[var(--accent)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m14.828 9.172 1.101-1.101a4 4 0 115.656 5.656l-4 4a4 4 0 01-5.656 0" />
                  </svg>
                </div>
              </Field>
              <Field label="Visual Image Link">
                <div className="group relative">
                  <input
                    type="text"
                    value={pictureLink}
                    onChange={(e) => setPictureLink(e.target.value)}
                    placeholder="https://..."
                    className="sdc-input w-full pl-10"
                  />
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]/40 group-focus-within:text-[var(--accent)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </Field>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex items-center justify-between">
          <div>
            {error && (
              <p className="text-xs font-bold text-red-500 animate-in fade-in duration-200">{error}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="sdc-btn-outline px-8">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !partno.trim()}
              className="sdc-btn-primary px-10 relative overflow-hidden disabled:opacity-40"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Creating...</span>
                </div>
              ) : (
                'Add Record'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
