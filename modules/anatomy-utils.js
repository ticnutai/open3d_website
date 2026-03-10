export function formatStructureName(rawName) {
  if (!rawName || !rawName.trim()) {
    return 'Unnamed mesh';
  }
  return rawName
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyBodyPart(name) {
  const n = (name || '').toLowerCase();
  if (/(heart|cardiac|atrium|atria|ventricle|myocard|pericard|lung|lungs|bronch|trachea|kidney|kidneys|renal|ureter|bladder|urinary|liver|hepatic|spleen|pancreas|stomach|intestin|colon)/.test(n)) return 'internal-organs';
  if (/(skull|crani|mandible|maxilla|nasal|vomer|zygomatic|ethmoid|lacrimal|teeth|tooth|brain|eye|orbital)/.test(n)) return 'head';
  if (/(humerus|radius|ulna|carpal|metacarp|phalanx|hand|wrist|forearm|arm|clavicle|scapula|shoulder)/.test(n)) return 'upper-limb';
  if (/(femur|tibia|fibula|patella|foot|ankle|metatars|toe|calcane|talus|thigh|leg|hip)/.test(n)) return 'lower-limb';
  if (/(vertebra|spine|sacrum|coccyx|intervertebral|annulus fibrosus)/.test(n)) return 'spine';
  if (/(rib|sternum|thorax|costal|pectoral|diaphragm)/.test(n)) return 'thorax';
  if (/(pelvis|pelvic|ilium|ischium|pubis|abdomen|abdominal|perineum)/.test(n)) return 'abdomen-pelvis';
  if (/(artery|vein|vascular|aorta)/.test(n)) return 'vascular';
  if (/(nerve|plexus|neural)/.test(n)) return 'nervous';
  return 'other';
}

export function detectSystemByName(name, lang) {
  const n = (name || '').toLowerCase();
  if (/(heart|cardiac|atrium|ventricle|myocard|pericard|lung|lungs|bronch|trachea|kidney|kidneys|renal|ureter|bladder|urinary|liver|hepatic|spleen|pancreas|stomach|intestin|colon)/.test(n)) return lang === 'he' ? 'איברים פנימיים' : 'Internal organs';
  if (/(artery|vein|aorta|vascular)/.test(n)) return lang === 'he' ? 'כלי דם' : 'Vascular';
  if (/(nerve|plexus|neural)/.test(n)) return lang === 'he' ? 'עצבים' : 'Nervous';
  if (/(muscle|tendon|fascia)/.test(n)) return lang === 'he' ? 'שריר/רקמה רכה' : 'Muscular/Soft tissue';
  if (/(bone|vertebra|skull|rib|sternum|mandible|maxilla|phalanx|metacarp|metatars|femur|tibia|fibula|humerus|radius|ulna)/.test(n)) return lang === 'he' ? 'שלד ועצמות' : 'Skeletal';
  if (/(ligament|capsule|disc|cart|meniscus)/.test(n)) return lang === 'he' ? 'מפרקים ורצועות' : 'Joints/Ligaments';
  return lang === 'he' ? 'אנטומיה כללית' : 'General anatomy';
}

export function sanitizeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function detectSideFromName(name) {
  const n = (name || '').toLowerCase();
  if (/(mirrored|\(mirrored\)| left|\bl\b| left\b)/.test(n)) return 'שמאל';
  if (/(\br\b| right|\bright\b|\sr$|\br$)/.test(n)) return 'ימין';
  return 'קו אמצע / לא מוגדר';
}

export function extractSourceLabel(displayName) {
  if (!displayName) return 'לא זמין';
  const idx = displayName.indexOf(':');
  if (idx === -1) return 'מודל בודד';
  return displayName.slice(0, idx).trim();
}

export function getSearchTermFromDisplayName(displayName) {
  let term = displayName || '';
  if (term.includes(':')) {
    term = term.slice(term.indexOf(':') + 1).trim();
  }
  return term.replace('(mirrored)', '').replace('mirrored', '').trim();
}
