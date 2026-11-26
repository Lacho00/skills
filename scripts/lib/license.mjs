// Licence identification for vendored skills. Only licences that allow
// redistribution of an unmodified copy with its notice are accepted.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ALLOWED_LICENSES = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'];

// Upstream paths are case-sensitive (git show), so lowercase names are listed too.
export const LICENSE_FILES = [
  'LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'LICENCE.txt', 'COPYING',
  'license', 'license.md', 'license.txt', 'licence', 'licence.md', 'licence.txt', 'copying',
];

const squash = (text) => text.replace(/\s+/g, ' ');

// Wording that adds restrictions to a permissive text, or belongs to a copyleft licence.
const RESTRICTIVE = /Commons Clause|advertising materials|GNU (?:Lesser |Affero )?General Public|Affero|Server Side Public|Business Source|non-?commercial/i;

// Returns an SPDX id from ALLOWED_LICENSES, or null when the text is not one of
// them (including a permissive text with extra restrictions added).
export function identifyLicense(text) {
  const t = squash(text);
  if (RESTRICTIVE.test(t)) return null;
  if (/Apache License,? Version 2\.0/i.test(t) && /Licensed under the Apache License|TERMS AND CONDITIONS FOR USE/i.test(t)) return 'Apache-2.0';
  if (/Permission is hereby granted, free of charge, to any person obtaining a copy/i.test(t)) return 'MIT';
  if (/Permission to use, copy, modify, and\/or distribute this software for any purpose/i.test(t)) return 'ISC';
  if (/Redistribution and use in source and binary forms, with or without modification, are permitted/i.test(t)) {
    return /Neither the name/i.test(t) ? 'BSD-3-Clause' : 'BSD-2-Clause';
  }
  return null;
}

// First licence file found in `dir`, as { file, text }, or null.
export function findLicenseFile(dir) {
  for (const name of LICENSE_FILES) {
    const file = join(dir, name);
    if (existsSync(file)) return { file: name, text: readFileSync(file, 'utf8') };
  }
  return null;
}
