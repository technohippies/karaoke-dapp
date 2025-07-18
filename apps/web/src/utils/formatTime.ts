export function formatDistanceToNow(timestamp: number, includeAgo: boolean = false): string {
  const now = Date.now()
  const diff = now - timestamp
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 5) {
    return 'just now'
  }
  
  let timeString = ''
  if (days > 0) {
    timeString = `${days} day${days > 1 ? 's' : ''}`
  } else if (hours > 0) {
    timeString = `${hours} hour${hours > 1 ? 's' : ''}`
  } else if (minutes > 0) {
    timeString = `${minutes} minute${minutes > 1 ? 's' : ''}`
  } else {
    timeString = `${seconds} second${seconds > 1 ? 's' : ''}`
  }
  
  return includeAgo ? `${timeString} ago` : timeString
}