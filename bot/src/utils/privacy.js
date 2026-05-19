export const maskPhone = (phone) => {
  if (!phone) return '[redacted]'
  const s = String(phone)
  return s.slice(0, 3) + '***' + s.slice(-2)
}
