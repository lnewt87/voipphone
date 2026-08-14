export type CallState =
  | 'idle'
  | 'incoming'
  | 'dialing'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'error';

export type RecentCall = {
  id: string;
  number: string;
  direction: 'outgoing' | 'incoming';
  startedAt: Date;
  durationSeconds: number;
  result: 'Completed' | 'Missed' | 'Cancelled';
};

export type Contact = {
  id: string;
  name: string;
  company: string;
  number: string;
};
