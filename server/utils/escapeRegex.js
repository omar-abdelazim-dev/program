// Escapes regex metacharacters so user input is always treated as a literal
// string when interpolated into a MongoDB $regex/RegExp — prevents both
// regex injection and catastrophic-backtracking ReDoS from public search input.
export const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
