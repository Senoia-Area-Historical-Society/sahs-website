#!/usr/bin/env node
// Guards against firebase.json listing a Firestore database this app doesn't own.
//
// Incident: archive-app's firebase.json listed "(default)" (this website's database)
// alongside its own "sahs-archives" named database. Every archive-app deploy silently
// pushed archive-app's rules/indexes to the website's database too, wiping out the
// website's public-read rules for posts/galleries/bookings/etc.
//
// This repo (sahs-website) only ever owns the default database.
const ALLOWED_DATABASES = ['(default)'];

const fs = require('fs');
const path = require('path');

const firebaseJsonPath = path.join(__dirname, '..', 'firebase.json');
const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));

const firestoreConfig = firebaseJson.firestore;
const entries = Array.isArray(firestoreConfig)
  ? firestoreConfig
  : firestoreConfig
  ? [firestoreConfig]
  : [];

const targeted = entries.map((entry) => entry.database || '(default)');
const violations = targeted.filter((database) => !ALLOWED_DATABASES.includes(database));

if (violations.length > 0) {
  console.error(
    `firebase.json lists Firestore database(s) this app does not own: ${violations.join(', ')}\n` +
      `Allowed for this repo: ${ALLOWED_DATABASES.join(', ')}\n` +
      `A stray database entry here will silently deploy this app's rules/indexes to another ` +
      `app's database on every CI deploy. Remove it before merging.`
  );
  process.exit(1);
}

console.log(`OK — firebase.json only targets allowed database(s): ${targeted.join(', ') || '(none)'}`);
