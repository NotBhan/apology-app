# Privacy

Plain language, and honest about what is automated and what is not. This page
describes what the application actually does; it is not a legal contract.

## What a letter contains

When someone creates an apology, we store:

- the recipient's first name and the sender's first name;
- the situation the sender chose (and their own words if they chose "anything else");
- the three messages and the optional personal note they wrote;
- the theme, character pack and colour choices;
- any photographs and custom audio they uploaded;
- a random, unguessable link token.

We do not store the recipient's email, phone number, location, or anything about
their device. There are no accounts, no analytics, no advertising and no
third-party trackers.

## How long a link works

Published links are **temporary by design**. The sender chooses a window of
between one and seven days when they publish. There is no way to make a link
permanent.

- The deadline is calculated on the server. A client cannot set or extend it.
- At the exact deadline the link stops opening. The recipient sees the same
  "not available" page as for a link that never existed.
- Photographs and custom audio stop being served at the same moment, so a saved
  image URL does not outlive the letter.

## What happens after expiry

A cleanup job runs on a schedule and permanently deletes:

- the apology document, including both names, the messages and the note;
- the theme, sticker, music and photo metadata;
- every uploaded photograph and custom audio file belonging to that letter;
- the public access token.

**Deletion is asynchronous.** It is not instant at the expiry second. The
practical consequences:

- Access stops immediately; data removal follows on the next cleanup run.
- In normal operation that means within about an hour of expiry.
- If a storage deletion fails, the job is retried on the next run. Files are not
  silently forgotten — the failure is recorded and retried, but in that case
  removal can take longer.

What remains after a successful deletion is a minimal tombstone: an internal id,
a hashed creator key, a timestamp and a file count. It contains no names, no
messages, no media and no recoverable token. It exists so the Manage page can
show that a letter was deleted rather than silently losing it.

## Manual deletion

The creator can delete a letter at any time from Manage. Manual deletion goes
through exactly the same pipeline as expiry: files first, then the record, with
a tombstone afterward. If storage is temporarily unavailable, the deletion is
queued and retried rather than reported as complete.

## Cookies

One httpOnly cookie identifies this browser as the creator, so drafts can be
listed and edited. It contains a random key, not personal information. Clearing
site data removes access to letters created from that browser.

## Recipient responses

The optional response at the end of a letter ("I forgive you", "I need some
time", and so on) is never transmitted or stored. It stays in the recipient's
own browser. There is no endpoint that accepts it.

## Search engines

Every route sets `noindex`, and private links are random rather than guessable,
so a letter cannot be discovered by search or by guessing a URL.

## Retention that remains

- **Tombstones** (id, hashed key, timestamp, counts) are kept so deletion is
  visible in Manage.
- **Operational logs** may record that a cleanup ran and how many records it
  processed. They do not contain letter content.
- **Backups**, where a hosting provider keeps them, follow that provider's
  retention schedule. We do not operate a separate backup of letter content.
