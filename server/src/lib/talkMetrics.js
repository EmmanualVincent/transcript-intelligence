'use strict';

function inferRole(speakerName, allEmails) {
  if (!speakerName || !allEmails?.length) return null;
  const nameParts = speakerName.toLowerCase().split(/\s+/).filter(p => p.length >= 2);
  for (const email of allEmails) {
    const local = email.split('@')[0].toLowerCase().replace(/[._-]/g, '');
    const matched = nameParts.some(p => local.includes(p.slice(0, 4)));
    if (matched) return email.includes('@aegiscloud.com') ? 'rep' : 'customer';
  }
  return null;
}

function computeCallMetrics(t) {
  const utterances = t.utterances || [];
  const speakerStats = {};

  for (const u of utterances) {
    const sp = u.speaker_name || u.speaker || 'Unknown';
    if (!speakerStats[sp]) {
      speakerStats[sp] = { utteranceCount: 0, totalDuration: 0, sentiments: [], questionCount: 0, longestMonologue: 0 };
    }
    speakerStats[sp].utteranceCount++;
    speakerStats[sp].totalDuration += (u.endTime || 0) - (u.time || 0);
    if (u.sentimentType) speakerStats[sp].sentiments.push(u.sentimentType);
    if (u.sentence && u.sentence.trim().endsWith('?')) speakerStats[sp].questionCount++;
  }

  // Longest uninterrupted monologue per speaker
  let curSpeaker = null, curStreak = 0;
  for (const u of utterances) {
    const sp = u.speaker_name || u.speaker || 'Unknown';
    const dur = (u.endTime || 0) - (u.time || 0);
    if (sp === curSpeaker) {
      curStreak += dur;
    } else {
      if (curSpeaker !== null) {
        speakerStats[curSpeaker].longestMonologue = Math.max(speakerStats[curSpeaker].longestMonologue, curStreak);
      }
      curSpeaker = sp;
      curStreak = dur;
    }
  }
  if (curSpeaker !== null) {
    speakerStats[curSpeaker].longestMonologue = Math.max(speakerStats[curSpeaker].longestMonologue, curStreak);
  }

  // Speaker roles and switch count
  let speakerSwitches = 0, prevSpeaker = null;
  for (const u of utterances) {
    const sp = u.speaker_name || u.speaker || 'Unknown';
    if (prevSpeaker !== null && sp !== prevSpeaker) speakerSwitches++;
    prevSpeaker = sp;
  }

  for (const name of Object.keys(speakerStats)) {
    speakerStats[name].role = inferRole(name, t.allEmails);
  }

  const durationMins = t.duration || 0;
  const totalTalkTime = Object.values(speakerStats).reduce((s, sp) => s + sp.totalDuration, 0);
  const repTalkTime = Object.values(speakerStats).filter(sp => sp.role === 'rep').reduce((s, sp) => s + sp.totalDuration, 0);
  const totalQuestions = Object.values(speakerStats).reduce((s, sp) => s + sp.questionCount, 0);

  return {
    speakerStats,
    speakerSwitches,
    switchesPer5Min: durationMins > 0 ? speakerSwitches / (durationMins / 5) : 0,
    totalQuestions,
    questionRatePerHour: durationMins > 0 ? totalQuestions / (durationMins / 60) : 0,
    repTalkPct: totalTalkTime > 0 ? (repTalkTime / totalTalkTime) * 100 : null,
  };
}

module.exports = { inferRole, computeCallMetrics };
