# Reading Lexicon

A standalone browser app for collecting IELTS vocabulary from reading passages.

## Run

From this folder, run `py -m http.server 8000`, then open `http://localhost:8000`. A local server is needed for Google's OAuth sign-in. There is no build step. Vocabulary and the OAuth Client ID are kept in this browser's local storage; access tokens are kept in memory only.

## Sources

- Upload TXT, Markdown, DOCX, or text-based PDF files.
- Paste a passage directly.
- Read a Google Docs link after signing in with an account that can access the document.

## Google Docs setup with billing disabled

1. Create a Google Cloud project. Do not link a Cloud Billing account or add a payment method.
2. Enable the Google Docs API and create an OAuth consent screen. While testing, add your own Google account as a test user.
3. Create an OAuth Client ID with application type **Web application**. Add `http://localhost:8000` under **Authorized JavaScript origins**.
4. Enter the Client ID in the app's Google Docs tab and paste the Docs link. The app requests the read-only `documents.readonly` OAuth scope.

Google's official open source [browser samples](https://github.com/googleworkspace/browser-samples) provide the OAuth pattern used here. Google lists standard Docs API usage as no additional cost, while noting that over-quota charges are planned for later in 2026. Keeping Cloud Billing unlinked is the safeguard against charges; if the free quota is unavailable or exhausted, Google API access may fail. If Google requires linking billing to continue setup, stop and use DOCX upload or paste text instead.

The app creates a reviewable shortlist of difficult academic words, likely collocations, and phrasal verbs using built-in patterns. Select words or phrases and choose **Find meanings**. Single words use Open Dictionary data sourced from Wiktionary. Phrasal verbs use the English Phrasal Verbs in Action dataset from [tema4p/english-vocabulary](https://github.com/tema4p/english-vocabulary), licensed CC BY-NC 4.0; that content is for non-commercial use and requires attribution. The app fetches these datasets from GitHub only when you request meanings and does not upload your passage. Internet access is required, and some terms may not match; review definitions in context and edit them as needed. The app also includes flip cards for your saved words. Each saved item stores an English meaning and Vietnamese translation, both editable in the saved list and shown on flashcards. Word and exact collocation translations use [thichhoc-dict](https://github.com/thichhoc-org/thichhoc-dict), licensed CC BY-SA 4.0. The app loads the relevant first-letter dictionary shards on demand from GitHub; data is generated and has not been fully human-reviewed. Phrasal verb English/Vietnamese meanings use the [English Vocabulary dataset](https://github.com/tema4p/english-vocabulary), licensed CC BY-NC 4.0 for non-commercial use. Suggestions can include false positives or miss useful items. Scanned PDFs need OCR; DOCX/PDF parsing uses browser libraries loaded from CDNs and needs an internet connection.

Collected vocabulary stays in browser local storage. Reading text is processed in the browser and sent only to Google's Docs API when you choose the Google Docs import flow; it is not sent to an AI service.
