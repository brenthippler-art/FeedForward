const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatTime(iso: string) {
  return timeFormat.format(new Date(iso));
}

const pickupDateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

export function formatPickupDateTime(iso: string) {
  return pickupDateFormat.format(new Date(iso));
}
