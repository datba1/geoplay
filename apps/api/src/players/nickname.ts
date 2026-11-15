/**
 * Allowed nickname characters: letters (with accents, also as combining marks),
 * digits, spaces, emoji and a few punctuation marks people use in names.
 */
export const NICKNAME_PATTERN = /^[\p{L}\p{M}\p{N}\p{Extended_Pictographic}\u200d\ufe0f _.'\u2019!?&()\-]+$/u;
export const NICKNAME_MESSAGE = 'nickname may only contain letters, numbers, spaces, emoji and _ . \' ! ? & ( ) -';

/** Trims, collapses inner whitespace and normalises Unicode (NFC) before validation. */
export const cleanNickname = (value: unknown) =>
  typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : value;
