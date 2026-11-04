export type IconName =
  | 'overview'
  | 'cases'
  | 'contacts'
  | 'hearings'
  | 'documents'
  | 'activity';

const PATHS: Record<IconName, string> = {
  overview: 'M4 19V9m5 10V5m5 14v-7m5 7V3',
  cases: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  contacts:
    'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m13-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 11v-1a4 4 0 0 0-3-3.87M16 7a3 3 0 0 1 0 6',
  hearings:
    'M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  documents:
    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5',
  activity: 'M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};

export function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
