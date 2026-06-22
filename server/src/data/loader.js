'use strict';

const fs = require('fs');
const path = require('path');
const { categorize } = require('../lib/categorize');

// __dirname = server/src/data  →  ../../.. = project root  →  ../../../dataset
const DATASET_PATH = process.env.DATASET_PATH
  ? path.resolve(process.env.DATASET_PATH)
  : path.resolve(__dirname, '../../../dataset');

let _transcripts = null;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadTranscripts() {
  if (_transcripts) return _transcripts;

  const folders = fs
    .readdirSync(DATASET_PATH)
    .filter(f => fs.statSync(path.join(DATASET_PATH, f)).isDirectory());

  _transcripts = [];

  for (const folder of folders) {
    const base = path.join(DATASET_PATH, folder);
    try {
      const info = readJson(path.join(base, 'meeting-info.json'));
      const summary = readJson(path.join(base, 'summary.json'));
      const transcriptFile = readJson(path.join(base, 'transcript.json'));
      const speakerMeta = readJson(path.join(base, 'speaker-meta.json'));

      const { callType, category, customerAccount } = categorize(info, summary);

      _transcripts.push({
        id: folder,
        title: info.title || '',
        startTime: info.startTime || null,
        endTime: info.endTime || null,
        duration: info.duration || 0,
        organizerEmail: info.organizerEmail || info.host || null,
        allEmails: info.allEmails || [],
        invitees: info.invitees || [],
        speakers: Object.values(speakerMeta || {}),

        // derived
        callType,
        category,
        customerAccount,

        // summary fields
        summary: summary.summary || '',
        actionItems: summary.actionItems || [],
        topics: summary.topics || [],
        overallSentiment: summary.overallSentiment || null,
        sentimentScore: summary.sentimentScore || null,
        keyMoments: summary.keyMoments || [],

        // utterances (full transcript)
        utterances: transcriptFile.data || [],
      });
    } catch (err) {
      console.warn(`[loader] skipping ${folder}: ${err.message}`);
    }
  }

  // Sort chronologically
  _transcripts.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  console.log(`[loader] loaded ${_transcripts.length} transcripts from ${DATASET_PATH}`);
  return _transcripts;
}

module.exports = { loadTranscripts };
