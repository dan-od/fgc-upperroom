export const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 5) return phone;
  return `${phone.slice(0, 3)}***${phone.slice(-2)}`;
};

export const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return email;
  const atIndex = email.indexOf("@");
  return `${email[0] || ""}***${email.slice(atIndex)}`;
};
