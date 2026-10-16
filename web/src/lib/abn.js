// Australian Business Number helpers. The ABN checksum (ATO published
// algorithm): subtract 1 from the first digit, weight the 11 digits by
// 10,1,3,5,7,9,11,13,15,17,19, and the sum must divide by 89.
const W = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
export const abnDigits = (s) => String(s || "").replace(/\D/g, "");
export function isValidAbn(s) {
  const d = abnDigits(s);
  if (d.length !== 11) return false;
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += (Number(d[i]) - (i === 0 ? 1 : 0)) * W[i];
  return sum % 89 === 0;
}
/** "51824753556" → "51 824 753 556"; anything not 11 digits comes back as typed. */
export function formatAbn(s) {
  const d = abnDigits(s);
  return d.length === 11 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : String(s || "");
}
