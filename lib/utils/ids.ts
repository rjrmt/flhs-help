export function generateTicketId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TICKET-${year}-${random}`;
}

export function generateDetentionId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `DET-${year}-${random}`;
}

