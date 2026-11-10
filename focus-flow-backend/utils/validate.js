// Input checks. Each throws HttpError(400) with a clear message when the input is wrong.
const HttpError = require('./HttpError');

const bad = message => { throw new HttpError(400, message); };

exports.text = (value, label, min, max) => {
  if (typeof value !== 'string') bad(`${label} is required and must be text.`);
  const v = value.trim();
  if (v.length < min || v.length > max) bad(`${label} must be between ${min} and ${max} characters.`);
  return v;
};

exports.email = value => {
  const v = exports.text(value, 'email', 3, 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) bad('email is not a valid email address.');
  return v;
};

exports.password = value => {
  if (typeof value !== 'string' || value.length < 8 || value.length > 72)
    bad('password must be between 8 and 72 characters.');
  return value;
};

exports.price = value => {
  const s = String(value === undefined ? '' : value).trim();
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(s)) bad('price must be a positive number with at most 2 decimals.');
  const n = Number(s);
  if (n <= 0) bad('price must be greater than 0.');
  return n;
};

exports.optionalNumber = (value, label) => {
  if (value === undefined || value === '') return undefined;
  if (!/^\d+(\.\d+)?$/.test(String(value))) bad(`${label} must be a number.`);
  return Number(value);
};

exports.id = value => {
  if (!/^\d{1,10}$/.test(String(value)) || Number(value) < 1) bad('id must be a positive whole number.');
  return Number(value);
};

exports.integerInRange = (value, label, def, min, max) => {
  if (value === undefined || value === '') return def;
  if (!/^\d{1,6}$/.test(String(value))) bad(`${label} must be a whole number.`);
  const n = Number(value);
  if (n < min || n > max) bad(`${label} must be between ${min} and ${max}.`);
  return n;
};