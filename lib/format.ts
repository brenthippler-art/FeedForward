const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatTime(iso: string) {
  return timeFormat.format(new Date(iso));
}