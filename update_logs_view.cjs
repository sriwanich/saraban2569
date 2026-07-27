const fs = require('fs');
let content = fs.readFileSync('src/components/views/LogsView.tsx', 'utf8');

// 1. Update imports
content = content.replace(
  "  Globe, X, ChevronLeft, ChevronRight, Filter, ShieldAlert, CheckCircle2",
  "  Globe, X, ChevronLeft, ChevronRight, Filter, ShieldAlert, CheckCircle2, FileEdit, Send, Sparkles"
);

// 2. Add draft cases to getActionBadge before default:
const defaultCase = `      default:
        return (`;

const draftCases = `      case 'CREATE_DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
            <FileEdit className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> บันทึกร่างเอกสาร
          </span>
        );
      case 'UPDATE_DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25">
            <FileEdit className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" /> แก้ไขร่างเอกสาร
          </span>
        );
      case 'DELETE_DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
            <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" /> ลบร่างเอกสาร
          </span>
        );
      case 'SEND_DRAFT_TO_SIGN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25">
            <Send className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" /> เสนอร่างลงนาม
          </span>
        );
      case 'AI_SCAN_DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/25">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-600 dark:text-purple-400" /> สแกน AI ร่างเอกสาร
          </span>
        );
      default:
        return (`;

if (content.includes(defaultCase)) {
  content = content.replace(defaultCase, draftCases);
  console.log('Added draft action badges');
}

// 3. Update filteredLogs filter logic
const oldFilterLogic = `    if (selectedFilter === 'LOGIN') {
      return log.action === 'LOGIN_SUCCESS' || log.action === 'LOGIN_FAILED';
    } else if (selectedFilter === 'DOCS') {
      return log.action.includes('DOCUMENT') || log.action.includes('TRACKING');
    } else if (selectedFilter === 'SETTINGS') {
      return log.action.includes('SETTINGS') || log.action.includes('USER');
    }`;

const newFilterLogic = `    if (selectedFilter === 'LOGIN') {
      return log.action === 'LOGIN_SUCCESS' || log.action === 'LOGIN_FAILED';
    } else if (selectedFilter === 'DOCS') {
      return log.action.includes('DOCUMENT') || log.action.includes('TRACKING') || log.action.includes('DRAFT');
    } else if (selectedFilter === 'DRAFT') {
      return log.action.includes('DRAFT');
    } else if (selectedFilter === 'SETTINGS') {
      return log.action.includes('SETTINGS') || log.action.includes('USER');
    }`;

if (content.includes(oldFilterLogic)) {
  content = content.replace(oldFilterLogic, newFilterLogic);
  console.log('Updated filter logic');
}

// 4. Update Quick Stats Grid to 5 columns with Draft stats
const oldStatsGrid = `<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">`;
const newStatsGrid = `<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">`;

if (content.includes(oldStatsGrid)) {
  content = content.replace(oldStatsGrid, newStatsGrid);
  console.log('Updated stats grid cols');
}

const docsCardEnd = `        <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] shadow-xs hover:border-blue-500/30 transition-colors flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-secondary)] truncate">งานเอกสาร</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono tracking-tight">
              {logs.filter(l => l.action.includes('DOCUMENT') || l.action.includes('TRACKING')).length}
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>`;

const docsAndDraftCard = `        <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] shadow-xs hover:border-blue-500/30 transition-colors flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-secondary)] truncate">งานเอกสาร</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono tracking-tight">
              {logs.filter(l => l.action.includes('DOCUMENT') || l.action.includes('TRACKING')).length}
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
        <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] shadow-xs hover:border-amber-500/30 transition-colors flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-secondary)] truncate">ร่างเอกสาร</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono tracking-tight">
              {logs.filter(l => l.action.includes('DRAFT')).length}
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
            <FileEdit className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>`;

if (content.includes(docsCardEnd)) {
  content = content.replace(docsCardEnd, docsAndDraftCard);
  console.log('Added Draft stat card');
}

// 5. Add Draft filter button
const docsFilterBtn = `<button
              onClick={() => setSelectedFilter('DOCS')}
              className={\`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer \${
                selectedFilter === 'DOCS'
                  ? 'bg-[var(--primary-color)] text-white shadow-xs'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
              }\`}
            >
              งานเอกสาร
            </button>`;

const docsAndDraftFilterBtns = `<button
              onClick={() => setSelectedFilter('DOCS')}
              className={\`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer \${
                selectedFilter === 'DOCS'
                  ? 'bg-[var(--primary-color)] text-white shadow-xs'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
              }\`}
            >
              งานเอกสาร
            </button>
            <button
              onClick={() => setSelectedFilter('DRAFT')}
              className={\`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer \${
                selectedFilter === 'DRAFT'
                  ? 'bg-[var(--primary-color)] text-white shadow-xs'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
              }\`}
            >
              ร่างเอกสาร
            </button>`;

if (content.includes(docsFilterBtn)) {
  content = content.replace(docsFilterBtn, docsAndDraftFilterBtns);
  console.log('Added Draft filter button');
}

fs.writeFileSync('src/components/views/LogsView.tsx', content);
