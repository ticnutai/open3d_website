import {
  classifyBodyPart,
  detectSystemByName,
  sanitizeHtml,
  detectSideFromName,
  extractSourceLabel,
  getSearchTermFromDisplayName,
  formatStructureName,
} from './anatomy-utils.js';
import { fetchJsonWithRetry } from './network.js';

function toLocalizedCategory(category, lang) {
  const map = {
    he: {
      head: 'ראש',
      'upper-limb': 'גפה עליונה',
      'lower-limb': 'גפה תחתונה',
      spine: 'עמוד שדרה',
      thorax: 'בית חזה',
      'internal-organs': 'איברים פנימיים',
      'abdomen-pelvis': 'בטן ואגן',
      vascular: 'מערכת כלי דם',
      nervous: 'מערכת עצבים',
      other: 'כללי/אחר',
    },
    en: {
      head: 'Head',
      'upper-limb': 'Upper limb',
      'lower-limb': 'Lower limb',
      spine: 'Spine',
      thorax: 'Thorax',
      'internal-organs': 'Internal organs',
      'abdomen-pelvis': 'Abdomen/Pelvis',
      vascular: 'Vascular system',
      nervous: 'Nervous system',
      other: 'Other/General',
    },
  };
  return map[lang][category] || map.en.other;
}

function getSearchTermForMesh(mesh) {
  const displayName = mesh.userData.listName || formatStructureName(mesh.name);
  return getSearchTermFromDisplayName(displayName);
}

function buildPartDetails(mesh, lang) {
  const displayName = mesh.userData.listName || formatStructureName(mesh.name);
  const category = classifyBodyPart(displayName);
  const source = extractSourceLabel(displayName);
  const side = detectSideFromName(displayName);
  const system = detectSystemByName(displayName, lang);
  const visibility = mesh.visible ? 'גלוי' : 'מוסתר';
  const meshNameRaw = mesh.name || 'Unnamed mesh';

  return {
    displayName,
    category,
    source,
    side,
    system,
    visibility,
    meshNameRaw,
  };
}

async function fetchWikipediaSummaryByLang(query, langCode) {
  const suffix = langCode === 'he' ? ' אנטומיה' : ' anatomy';
  const searchUrl = `https://${langCode}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + suffix)}&srlimit=1&format=json&origin=*`;
  const searchData = await fetchJsonWithRetry(searchUrl, { timeoutMs: 4500, retries: 1 });
  const topHit = searchData?.query?.search?.[0];
  const pageTitle = topHit?.title;
  if (!pageTitle) return null;

  const summaryUrl = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
  const summary = await fetchJsonWithRetry(summaryUrl, { timeoutMs: 4500, retries: 1 });
  const text = (summary?.extract || '').trim();
  if (!text) return null;

  return {
    title: summary?.title || pageTitle,
    text,
    sourceUrl: summary?.content_urls?.desktop?.page || `https://${langCode}.wikipedia.org/wiki/${encodeURIComponent(pageTitle).replaceAll('%20', '_')}`,
    sourceLabel: langCode === 'he' ? 'ויקיפדיה (עברית)' : 'Wikipedia (English)',
  };
}

async function resolveMedicalSummary(term, preferHebrew) {
  const candidates = resolveMedicalSummaryCandidates(term);
  const langs = preferHebrew ? ['he'] : ['en', 'he'];

  for (const lang of langs) {
    for (const candidate of candidates) {
      try {
        const summary = await fetchWikipediaSummaryByLang(candidate, lang);
        if (summary) return summary;
      } catch {
        // Try next candidate/source.
      }
    }
  }

  return null;
}

function buildMedicalSummaryHtml(summary, lang) {
  if (!summary) return '';
  const cleanText = String(summary.text || '').trim();
  if (!cleanText) return '';

  if (lang !== 'he') {
    return `${sanitizeHtml(cleanText)}<br /><a href="${sanitizeHtml(summary.sourceUrl)}" target="_blank" rel="noopener">${sanitizeHtml(summary.title)} - ${sanitizeHtml(summary.sourceLabel)}</a>`;
  }

  // Present Hebrew medical text as short bullets for clearer reading.
  const segments = cleanText
    .split(/\.(?:\s+|$)/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 12)
    .slice(0, 4);

  if (!segments.length) {
    return `${sanitizeHtml(cleanText)}<br /><a href="${sanitizeHtml(summary.sourceUrl)}" target="_blank" rel="noopener">${sanitizeHtml(summary.title)} - ${sanitizeHtml(summary.sourceLabel)}</a>`;
  }

  const bullets = segments
    .map((part) => `<li>${sanitizeHtml(part)}.</li>`)
    .join('');
  return `<ul class="medical-bullets">${bullets}</ul><a href="${sanitizeHtml(summary.sourceUrl)}" target="_blank" rel="noopener">${sanitizeHtml(summary.title)} - ${sanitizeHtml(summary.sourceLabel)}</a>`;
}

function resolveMedicalSummaryCandidates(term) {
  const normalized = (term || '').trim();
  if (!normalized) return [];

  const cleaned = normalized
    .replace(/^[^:]+:\s*/u, '')
    .replace(/^\(mirrored\)\s*/iu, '')
    .trim();

  const withoutUnderscores = cleaned.replaceAll('_', ' ');
  const variants = [normalized, cleaned, withoutUnderscores]
    .map((v) => v.trim())
    .filter((v) => v.length > 1);

  return Array.from(new Set(variants));
}

function getClinicalInsightBlocks(details, lang) {
  const systemKey = String(details.system || '').toLowerCase();
  const categoryKey = String(details.category || '').toLowerCase();

  const he = {
    defaults: {
      function: 'האיבר תומך במבנה, תנועה או בקרה פיזיולוגית בהתאם למיקומו האנטומי.',
      clinical: 'בהערכה קלינית מתייחסים לכאב מקומי, הגבלת תנועה, ודפוסי הקרנה רלוונטיים.',
      diagnostics: 'כלים שכיחים: בדיקה גופנית, אולטרסאונד/CT/MRI לפי הצורך, והקשר לתסמינים.',
    },
    nervous: {
      function: 'רכיב במערכת עצבים המעורב בהולכה, אינטגרציה או בקרה מוטורית/תחושתית.',
      clinical: 'חשוב במצבי נוירולוגיה כגון חולשה, נימול, פגיעה עצבית או כאב נוירופתי.',
      diagnostics: 'בדיקות נפוצות: בדיקה נוירולוגית, MRI, ולעיתים EMG/NCV.',
    },
    vascular: {
      function: 'חלק ממסלול זרימת הדם, אספקת חמצן ופינוי תוצרי מטבוליזם.',
      clinical: 'רלוונטי במחלות כלי דם, פקקת, איסכמיה או דימום.',
      diagnostics: 'בדיקות נפוצות: דופלר, CT אנגיו, אולטרסאונד כלי דם.',
    },
    head: {
      function: 'מרכיב באזור הראש התומך בהגנה, חישה, לעיסה או הולכה עצבית.',
      clinical: 'חשוב בטראומה, סינוסיטיס, כאבי ראש, הפרעות ראייה/שמיעה ולסת.',
      diagnostics: 'בדיקות נפוצות: CT ראש/פנים, MRI, בדיקת ENT/נוירולוגיה לפי צורך.',
    },
    thorax: {
      function: 'מעורב בהגנה על לב/ריאות ובמכניקת נשימה.',
      clinical: 'רלוונטי בכאב חזה, טראומה, בעיות נשימה או פתולוגיה לבבית/ריאתית.',
      diagnostics: 'בדיקות נפוצות: צילום חזה, CT חזה, אקו/תפקודי נשימה.',
    },
  };

  const en = {
    defaults: {
      function: 'This structure supports anatomy, motion, or physiologic control based on its location.',
      clinical: 'Clinical assessment focuses on local pain, mobility limits, and related referral patterns.',
      diagnostics: 'Common tools: physical exam, ultrasound/CT/MRI as indicated, with symptom correlation.',
    },
    nervous: {
      function: 'Part of the nervous system involved in signaling, integration, or motor/sensory control.',
      clinical: 'Relevant in weakness, paresthesia, nerve injury, or neuropathic pain syndromes.',
      diagnostics: 'Common tests: neurologic exam, MRI, and in selected cases EMG/NCV.',
    },
    vascular: {
      function: 'Component of blood flow pathways for oxygen delivery and metabolic waste clearance.',
      clinical: 'Relevant in vascular disease, thrombosis, ischemia, or bleeding scenarios.',
      diagnostics: 'Common tests: Doppler, CT angiography, and vascular ultrasound.',
    },
    head: {
      function: 'Head-region structure supporting protection, sensing, chewing, or neural pathways.',
      clinical: 'Relevant in trauma, sinus disease, headache, vision/hearing issues, and jaw disorders.',
      diagnostics: 'Common tests: head/facial CT, MRI, and targeted ENT/neurology evaluation.',
    },
    thorax: {
      function: 'Involved in heart/lung protection and respiratory mechanics.',
      clinical: 'Relevant in chest pain, trauma, dyspnea, and cardio-pulmonary pathology.',
      diagnostics: 'Common tests: chest X-ray, chest CT, echo, and pulmonary function tests.',
    },
  };

  const dict = lang === 'he' ? he : en;
  const bySystem = dict[systemKey] || dict[categoryKey] || dict.defaults;

  return {
    function: bySystem.function,
    clinical: bySystem.clinical,
    diagnostics: bySystem.diagnostics,
  };
}

function getHebrewSystemTemplate(details, term) {
  const systemKey = String(details.system || '').toLowerCase();
  const categoryKey = String(details.category || '').toLowerCase();

  const templates = {
    heart: {
      title: 'תבנית קלינית: לב וכלי דם מרכזיים',
      bullets: [
        'תפקיד עיקרי: הזרמת דם מחומצן לרקמות ושמירה על תפוקת לב תקינה.',
        'תסמינים שכיחים להערכה: כאב חזה, קוצר נשימה, פלפיטציות, עייפות חריגה.',
        'בדיקות מקובלות: אק"ג, אקו לב, טרופונין, ולעיתים CT אנגיו לפי צורך קליני.',
      ],
    },
    respiratory: {
      title: 'תבנית קלינית: מערכת הנשימה',
      bullets: [
        'תפקיד עיקרי: חילוף גזים ושמירה על סטורציה תקינה.',
        'תסמינים שכיחים להערכה: שיעול, צפצופים, קוצר נשימה, כאב פלואוריטי.',
        'בדיקות מקובלות: סטורציה, תפקודי ריאה, צילום חזה, ולעיתים CT חזה.',
      ],
    },
    vascular: {
      title: 'תבנית קלינית: מערכת הדם',
      bullets: [
        'תפקיד עיקרי: אספקת חמצן וחומרי מזון ופינוי תוצרים מטבוליים.',
        'סימנים שכיחים: בצקת, שינוי צבע עור, כאב במאמץ, קור בגפה.',
        'בדיקות מקובלות: דופלר כלי דם, ABI, CT אנגיו/US לפי האזור הנבדק.',
      ],
    },
    lymphatic: {
      title: 'תבנית קלינית: מערכת הלימפה',
      bullets: [
        'תפקיד עיקרי: ניקוז נוזלים, בקרה חיסונית וסינון פתוגנים.',
        'סימנים שכיחים: לימפאדנופתיה, בצקות לימפטיות, רגישות מקומית.',
        'בדיקות מקובלות: בדיקה גופנית מכוונת, US קשריות, ולעיתים CT/PET לפי אינדיקציה.',
      ],
    },
    urinary: {
      title: 'תבנית קלינית: מערכת השתן',
      bullets: [
        'תפקיד עיקרי: סינון דם, ויסות נוזלים/אלקטרוליטים והפרשת פסולת.',
        'תסמינים שכיחים: כאב מותני, דיסאוריה, המטוריה, שינוי בתדירות/נפח השתנה.',
        'בדיקות מקובלות: שתן כללית, קריאטינין/eGFR, US כליות ודרכי שתן.',
      ],
    },
    head: {
      title: 'תבנית קלינית: ראש וגולגולת',
      bullets: [
        'תפקיד עיקרי: הגנה על המוח ואיברי החישה ושמירה על אנטומיה תפקודית של הפנים.',
        'תסמינים שכיחים: כאבי ראש, טראומה, סחרחורת, הפרעות ראייה/שמיעה.',
        'בדיקות מקובלות: בדיקה נוירולוגית/ENT, CT ראש, MRI לפי ממצאים.',
      ],
    },
    nervous: {
      title: 'תבנית קלינית: מערכת העצבים',
      bullets: [
        'תפקיד עיקרי: הולכה עצבית, בקרה מוטורית-תחושתית ואינטגרציה קוגניטיבית.',
        'תסמינים שכיחים: חולשה, נימול, ירידה תחושתית, כאב נוירופתי.',
        'בדיקות מקובלות: בדיקה נוירולוגית, MRI, EMG/NCV במידת הצורך.',
      ],
    },
  };

  const fallback = {
    title: `תבנית קלינית: ${term}`,
    bullets: [
      'תפקיד עיקרי: שמירה על מבנה ותפקוד פיזיולוגי בהתאם לאזור האנטומי.',
      'בהערכה קלינית חשוב לשלב תסמינים, בדיקה גופנית וממצאי הדמיה רלוונטיים.',
      'בדיקות שכיחות: בדיקה קלינית, אולטרסאונד/CT/MRI לפי הנחיה רפואית.',
    ],
  };

  return templates[systemKey] || templates[categoryKey] || fallback;
}

export function createDetailsDialogController(options) {
  const {
    dialog,
    titleEl,
    openXyzBtn,
    openXyzLockBtn,
    openXyzUnlockBtn,
    tabButtons,
    tabPanels,
    tabPanelInfo,
    tabPanelAnimations,
    tabPanelImages,
    tabPanelVideos,
    getCurrentLang,
    t,
    setAnimationMode,
    setCameraAutoRotate,
    getAvailableModelClips,
    playModelClip,
    stopModelClip,
    onOpenXyzTool,
    onOpenXyzLockTool,
    onOpenXyzUnlockTool,
  } = options;

  let detailRequestId = 0;
  let cachedAnimationCatalog = null;
  let currentMesh = null;

  if (openXyzBtn) {
    openXyzBtn.addEventListener('click', () => {
      if (!currentMesh || typeof onOpenXyzTool !== 'function') return;
      onOpenXyzTool(currentMesh);
    });
  }

  if (openXyzLockBtn) {
    openXyzLockBtn.addEventListener('click', () => {
      if (!currentMesh || typeof onOpenXyzLockTool !== 'function') return;
      onOpenXyzLockTool(currentMesh);
    });
  }

  if (openXyzUnlockBtn) {
    openXyzUnlockBtn.addEventListener('click', () => {
      if (!currentMesh || typeof onOpenXyzUnlockTool !== 'function') return;
      onOpenXyzUnlockTool(currentMesh);
    });
  }

  function isHebrew() {
    return getCurrentLang() === 'he';
  }

  function setTabMessage(panel, message, asError = false) {
    panel.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = message;
    if (asError) {
      p.className = 'tab-message-error';
    }
    panel.appendChild(p);
  }

  async function loadAnimationCatalog() {
    if (cachedAnimationCatalog) return cachedAnimationCatalog;
    try {
      const response = await fetch(`media/animations/catalog.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return null;
      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      cachedAnimationCatalog = { ...data, items };
      return cachedAnimationCatalog;
    } catch {
      return null;
    }
  }

  function renderAnimationCards(items) {
    if (!items.length) return '';
    return items.map((item) => {
      const label = isHebrew()
        ? (item?.labels?.he || item?.labels?.en || item?.key || 'Animation')
        : (item?.labels?.en || item?.labels?.he || item?.key || 'Animation');
      const sourceLabel = isHebrew() ? 'מקור' : 'Source';
      const licenseLabel = isHebrew() ? 'רישיון' : 'License';
      const authorLabel = isHebrew() ? 'יוצר' : 'Author';
      const providerLabel = isHebrew() ? 'ספק' : 'Provider';
      const qualityLabel = isHebrew() ? 'איכות' : 'Quality';
      const openSourceText = isHebrew() ? 'פתח מקור' : 'Open source';
      const q = item?.quality || {};
      const qualityText = (q.width && q.height)
        ? `${q.width}x${q.height}, ${(Math.max(0, Number(q.bytes) || 0) / 1024).toFixed(0)} KB`
        : `${(Math.max(0, Number(q.bytes) || 0) / 1024).toFixed(0)} KB`;
      return `
        <article class="video-card">
          <div class="video-card-title">${sanitizeHtml(label)}</div>
          <video controls preload="metadata" playsinline>
            <source src="${sanitizeHtml(item.file)}" type="${sanitizeHtml(item.mime || 'video/webm')}" />
          </video>
          <div class="video-card-meta">
            <span>${providerLabel}: ${sanitizeHtml(item?.source?.provider || 'Unknown')}</span>
            <span>${qualityLabel}: ${sanitizeHtml(qualityText)}</span>
            <span>${licenseLabel}: ${sanitizeHtml(item?.source?.license || 'Unknown')}</span>
            <span>${authorLabel}: ${sanitizeHtml(item?.source?.author || 'Unknown')}</span>
            <a href="${sanitizeHtml(item?.source?.page || '#')}" target="_blank" rel="noopener">${sourceLabel}: ${openSourceText}</a>
          </div>
        </article>
      `;
    }).join('');
  }

  async function fillInfoTab(mesh, requestId) {
    const lang = getCurrentLang();
    const details = buildPartDetails(mesh, lang);
    const categoryLabel = toLocalizedCategory(details.category, lang);
    const term = getSearchTermForMesh(mesh);
    const wikiHeSearch = `https://he.wikipedia.org/w/index.php?search=${encodeURIComponent(term + ' אנטומיה')}`;
    const wikiRefuaSearch = `https://www.wikirefua.org.il/w/index.php?search=${encodeURIComponent(term)}`;
    const pubmedSearch = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term + ' anatomy')}`;
    const medlineSearch = `https://medlineplus.gov/search/?query=${encodeURIComponent(term)}`;
    const ncbiBooksSearch = `https://www.ncbi.nlm.nih.gov/books/?term=${encodeURIComponent(term + ' anatomy')}`;
    const labels = lang === 'he'
      ? {
          organName: 'שם האיבר', category: 'קטגוריה אנטומית', system: 'מערכת משויכת',
          side: 'צד בגוף', source: 'מקור במודל', visibility: 'מצב תצוגה', tech: 'מזהה טכני',
          context: 'הקשר לימודי', contextValue: 'מבנה חשוב להבנת יחסים מרחביים ותפקוד קליני.',
          medicalSummaryTitle: 'סיכום רפואי ממקור חי:',
          loadingSummary: 'טוען מידע רפואי אמיתי...',
          fallbackSummary: 'לא נמצא כרגע סיכום חי לאיבר זה. ניתן להשתמש בקישורי המקור מטה.',
          illustrationTitle: 'המחשה לימודית:',
          illustrationText: 'מומלץ לצפות באיבר בשלושה מצבים: רגיל, רנטגן שקוף, ובידוד קטגוריה',
          openSourceTitle: 'מקורות רפואיים מומלצים:',
          sourceHint: 'מומלץ להתחיל מויקיפדיה בעברית ומויקירפואה, ולהמשיך לפאבמד למחקרים.',
          functionTitle: 'תפקוד עיקרי',
          clinicalTitle: 'משמעות קלינית',
          diagnosticsTitle: 'בדיקות נפוצות',
          secondarySummaryTitle: 'מקור משלים:',
          medlineLabel: 'מדליין פלוס',
          pubmedLabel: 'פאבמד',
          ncbiLabel: 'ספריית NCBI',
          open3dLabel: 'מודל תלת־ממדי פתוח',
          zanatomyLabel: 'זי-אנטומי',
          amiLabel: 'ערכת AMI לדימות רפואי',
        }
      : {
          organName: 'Part name', category: 'Anatomical category', system: 'Associated system',
          side: 'Body side', source: 'Model source', visibility: 'Visibility state', tech: 'Technical id',
          context: 'Learning context', contextValue: 'A key structure for understanding spatial relations and clinical function.',
          medicalSummaryTitle: 'Live medical summary:',
          loadingSummary: 'Loading real medical information...',
          fallbackSummary: 'No live summary found for this part right now. Please use the source links below.',
          illustrationTitle: 'Learning visualization:',
          illustrationText: 'Recommended workflow: normal view, transparent XRAY, and category isolation',
          openSourceTitle: 'Recommended medical sources:',
          sourceHint: 'Start with Hebrew/English encyclopedic sources, then continue to PubMed for research evidence.',
              functionTitle: 'Primary Function',
              clinicalTitle: 'Clinical Relevance',
              diagnosticsTitle: 'Common Diagnostics',
              secondarySummaryTitle: 'Supplementary source:',
              medlineLabel: 'MedlinePlus',
              pubmedLabel: 'PubMed',
              ncbiLabel: 'NCBI Bookshelf',
              open3dLabel: 'Open3DModel',
              zanatomyLabel: 'Z-Anatomy',
              amiLabel: 'AMI Toolkit',
        };

            const insights = getClinicalInsightBlocks(details, lang);
    const heTemplate = lang === 'he' ? getHebrewSystemTemplate(details, term) : null;
    const heTemplateHtml = heTemplate
      ? `
      <div class="clinical-card clinical-template-card">
        <div class="clinical-title">${sanitizeHtml(heTemplate.title)}</div>
        <ul class="medical-bullets">
          ${heTemplate.bullets.map((bullet) => `<li>${sanitizeHtml(bullet)}</li>`).join('')}
        </ul>
      </div>`
      : '';

    tabPanelInfo.innerHTML = `
      <div class="info-grid">
        <div class="info-card"><div class="label">${labels.organName}</div><div class="value">${sanitizeHtml(details.displayName)}</div></div>
        <div class="info-card"><div class="label">${labels.category}</div><div class="value">${sanitizeHtml(categoryLabel)}</div></div>
        <div class="info-card"><div class="label">${labels.system}</div><div class="value">${sanitizeHtml(details.system)}</div></div>
        <div class="info-card"><div class="label">${labels.side}</div><div class="value">${sanitizeHtml(details.side)}</div></div>
        <div class="info-card"><div class="label">${labels.source}</div><div class="value">${sanitizeHtml(details.source)}</div></div>
        <div class="info-card"><div class="label">${labels.visibility}</div><div class="value">${sanitizeHtml(details.visibility)}</div></div>
        <div class="info-card"><div class="label">${labels.tech}</div><div class="value">${sanitizeHtml(details.meshNameRaw)}</div></div>
        <div class="info-card"><div class="label">${labels.context}</div><div class="value">${labels.contextValue}</div></div>
      </div>

      <div class="clinical-grid">
        <div class="clinical-card">
          <div class="clinical-title">${labels.functionTitle}</div>
          <div class="clinical-text">${sanitizeHtml(insights.function)}</div>
        </div>
        <div class="clinical-card">
          <div class="clinical-title">${labels.clinicalTitle}</div>
          <div class="clinical-text">${sanitizeHtml(insights.clinical)}</div>
        </div>
        <div class="clinical-card">
          <div class="clinical-title">${labels.diagnosticsTitle}</div>
          <div class="clinical-text">${sanitizeHtml(insights.diagnostics)}</div>
        </div>
        ${heTemplateHtml}
      </div>

      <div class="illustration-box">
        <strong>${labels.medicalSummaryTitle}</strong>
        <div id="medicalSummaryText">${labels.loadingSummary}</div>
        <div id="medicalSummarySecondary"></div>
        <br /><br />
        <strong>${labels.illustrationTitle}</strong>
        ${labels.illustrationText} (${sanitizeHtml(categoryLabel)}).
        <br /><br />
        <strong>${labels.openSourceTitle}</strong>
        <a href="${wikiHeSearch}" target="_blank" rel="noopener">ויקיפדיה רפואית (עברית)</a>,
        <a href="${wikiRefuaSearch}" target="_blank" rel="noopener">ויקירפואה</a>,
        <a href="${medlineSearch}" target="_blank" rel="noopener">${labels.medlineLabel}</a>,
        <a href="${pubmedSearch}" target="_blank" rel="noopener">${labels.pubmedLabel}</a>,
        <a href="${ncbiBooksSearch}" target="_blank" rel="noopener">${labels.ncbiLabel}</a>,
        <a href="https://anatomytool.org/open3dmodel" target="_blank" rel="noopener">${labels.open3dLabel}</a>,
        <a href="https://www.z-anatomy.com/" target="_blank" rel="noopener">${labels.zanatomyLabel}</a>,
        <a href="https://github.com/FNNDSC/ami" target="_blank" rel="noopener">${labels.amiLabel}</a>
        <br /><br />
        ${labels.sourceHint}
      </div>
    `;

    const summaryTarget = tabPanelInfo.querySelector('#medicalSummaryText');
    if (!summaryTarget) return;

    const summary = await resolveMedicalSummary(term, lang === 'he');
    if (requestId !== detailRequestId) return;

    if (!summary) {
      summaryTarget.textContent = labels.fallbackSummary;
      return;
    }

    summaryTarget.innerHTML = buildMedicalSummaryHtml(summary, lang);

    const secondaryTarget = tabPanelInfo.querySelector('#medicalSummarySecondary');
    if (!secondaryTarget) return;
    if (lang === 'he') {
      secondaryTarget.innerHTML = '';
      return;
    }
    const secondary = await resolveMedicalSummary(term, !(lang === 'he'));
    if (requestId !== detailRequestId || !secondary) return;
    if (secondary.sourceUrl === summary.sourceUrl) return;

    secondaryTarget.innerHTML = `<br /><strong>${labels.secondarySummaryTitle}</strong> <a href="${sanitizeHtml(secondary.sourceUrl)}" target="_blank" rel="noopener">${sanitizeHtml(secondary.title)} - ${sanitizeHtml(secondary.sourceLabel)}</a>`;
  }

  function fillAnimationsTab(mesh) {
    const text = isHebrew()
      ? {
          pulse: 'פעימת דגש', bob: 'תנועת ציפה', spin: 'סיבוב מצלמה סביב האיבר',
          isolate: 'בידוד האיבר בלבד', stop: 'עצור אנימציה',
          hint: 'האנימציות משפיעות על האיבר הנבחר בלבד ומאפשרות ניתוח חזותי מהיר של גבולות וצירים.',
          interactiveTitle: 'אנימציות אינטראקטיביות:',
          clipsTitle: 'קליפים אמיתיים מתוך קובץ המודל:',
          noClips: 'למודל הנוכחי אין קליפים אמיתיים מוטמעים (GLB Animation Clips). ניתן להשתמש באנימציות האינטראקטיביות או לעבור למודל אחר.',
          playClipPrefix: 'נגן קליפ',
          stopClip: 'עצור קליפ אמיתי',
          resources: 'מקורות להרחבת אנימציות (קוד פתוח):',
          threeJsQuestions: 'פורום שאלות three.js',
          githubAnatomy: 'מאגרי אנטומיה ב-GitHub',
          amiToolkit: 'ערכת AMI לדימות רפואי',
        }
      : {
          pulse: 'Pulse highlight', bob: 'Floating motion', spin: 'Orbit camera around part',
          isolate: 'Isolate selected part', stop: 'Stop animation',
          hint: 'Animations affect only the selected part and support fast visual analysis of boundaries and axes.',
          interactiveTitle: 'Interactive animations:',
          clipsTitle: 'Real clips embedded in the current model:',
          noClips: 'This model has no embedded GLB animation clips. You can use interactive animations or switch to another model.',
          playClipPrefix: 'Play clip',
          stopClip: 'Stop real clip',
          resources: 'Open-source animation resources:',
          threeJsQuestions: 'three.js Questions',
          githubAnatomy: 'GitHub anatomy + three.js',
          amiToolkit: 'AMI (Medical Imaging)',
        };

    const clips = typeof getAvailableModelClips === 'function'
      ? (getAvailableModelClips() || [])
      : [];

    const clipButtonsHtml = clips.length
      ? clips
        .slice(0, 10)
        .map((clipName, idx) => {
          const cleanName = String(clipName || '').trim() || `${text.playClipPrefix} ${idx + 1}`;
          return `<button type="button" data-clip-index="${idx}">${sanitizeHtml(cleanName)}</button>`;
        })
        .join('')
      : `<p>${text.noClips}</p>`;

    tabPanelAnimations.innerHTML = `
      <p><strong>${text.interactiveTitle}</strong></p>
      <div class="anim-actions">
        <button type="button" data-anim="pulse">${text.pulse}</button>
        <button type="button" data-anim="bob">${text.bob}</button>
        <button type="button" data-anim="spin-camera">${text.spin}</button>
        <button type="button" data-anim="isolate">${text.isolate}</button>
        <button type="button" data-anim="none">${text.stop}</button>
      </div>
      <p>${text.hint}</p>
      <p><strong>${text.clipsTitle}</strong></p>
      <div class="anim-actions" id="realClipActions">
        ${clipButtonsHtml}
        <button type="button" data-clip-stop="1">${text.stopClip}</button>
      </div>
      <div class="illustration-box">
        <strong>${text.resources}</strong>
        <a href="https://discourse.threejs.org/c/questions/6" target="_blank" rel="noopener">${text.threeJsQuestions}</a>,
        <a href="https://github.com/search?q=anatomy+three.js&type=repositories" target="_blank" rel="noopener">${text.githubAnatomy}</a>,
        <a href="https://github.com/FNNDSC/ami" target="_blank" rel="noopener">${text.amiToolkit}</a>
      </div>
    `;

    const animButtons = Array.from(tabPanelAnimations.querySelectorAll('button[data-anim]'));
    animButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-anim');
        if (mode === 'spin-camera') {
          setCameraAutoRotate(true, 2.5);
          return;
        }
        setCameraAutoRotate(false, 0);
        setAnimationMode(mode);
      });
    });

    const clipButtons = Array.from(tabPanelAnimations.querySelectorAll('button[data-clip-index]'));
    clipButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number.parseInt(btn.getAttribute('data-clip-index') || '', 10);
        if (!Number.isInteger(index) || index < 0) return;
        setCameraAutoRotate(false, 0);
        setAnimationMode('none');
        if (typeof playModelClip === 'function') {
          playModelClip(index);
        }
      });
    });

    const stopClipBtn = tabPanelAnimations.querySelector('button[data-clip-stop]');
    if (stopClipBtn) {
      stopClipBtn.addEventListener('click', () => {
        if (typeof stopModelClip === 'function') {
          stopModelClip();
        }
      });
    }
  }

  async function fillImagesTab(mesh, requestId) {
    const term = getSearchTermForMesh(mesh);
    setTabMessage(tabPanelImages, isHebrew() ? 'טוען תמונות ריאליסטיות...' : 'Loading realistic images...');

    try {
      const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term + ' anatomy')}&gsrlimit=8&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=420&exintro=1&explaintext=1&format=json&origin=*`;
      const data = await fetchJsonWithRetry(apiUrl, { timeoutMs: 5500, retries: 1 });
      if (requestId !== detailRequestId) return;
      const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
      const withThumb = pages.filter((p) => p.thumbnail?.source);

      if (!withThumb.length) {
        setTabMessage(
          tabPanelImages,
          `${isHebrew() ? 'לא נמצאו תמונות זמינות כרגע עבור' : 'No images found currently for'} ${term}.`
        );
        return;
      }

      const cards = withThumb.slice(0, 6).map((p) => {
        const title = sanitizeHtml(p.title || term);
        const href = `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title || term).replaceAll('%20', '_')}`;
        return `
          <div class="gallery-item">
            <img src="${sanitizeHtml(p.thumbnail.source)}" alt="${title}" loading="lazy" />
            <a href="${href}" target="_blank" rel="noopener">${title}</a>
          </div>
        `;
      }).join('');

      const extra = isHebrew()
        ? '<div class="illustration-box"><strong>מקורות תמונה מקצועיים:</strong> Wikimedia Commons, Wikipedia רפואי, Open3DModel shots.</div>'
        : '<div class="illustration-box"><strong>Professional image sources:</strong> Wikimedia Commons, medical Wikipedia, Open3DModel shots.</div>';
      tabPanelImages.innerHTML = `<div class="gallery-grid">${cards}</div>${extra}`;
    } catch {
      setTabMessage(
        tabPanelImages,
        `${isHebrew() ? 'שגיאה בטעינת תמונות. חפש ידנית לפי:' : 'Image loading error. Try manual search for:'} ${term}.`,
        true
      );
    }
  }

  async function fillVideosTab(mesh) {
    const term = getSearchTermForMesh(mesh);
    const systemKey = String(detectSystemByName(term, 'en') || '').toLowerCase();
    const catalog = await loadAnimationCatalog();
    const allLocalItems = Array.isArray(catalog?.items) ? catalog.items : [];
    const matchedLocalItems = allLocalItems.filter((item) => {
      const key = String(item?.key || '').toLowerCase();
      if (!key) return false;
      if (!systemKey || systemKey === 'other') return true;
      return key === systemKey;
    });

    const links = [
      { label: isHebrew() ? 'YouTube - אנטומיה מפורטת' : 'YouTube - detailed anatomy', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(term + ' anatomy detailed')}` },
      { label: isHebrew() ? 'YouTube - הדמיה תלת מימדית' : 'YouTube - 3D anatomy', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(term + ' 3D anatomy')}` },
      { label: isHebrew() ? 'Vimeo - רפואי/אנטומיה' : 'Vimeo - medical/anatomy', url: `https://vimeo.com/search?q=${encodeURIComponent(term + ' anatomy')}` },
      { label: isHebrew() ? 'Khan Academy - תכנים קשורים' : 'Khan Academy - related content', url: `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(term + ' anatomy')}` },
      { label: isHebrew() ? 'Open3DModel - דוגמאות וידאו רשמיות' : 'Open3DModel - official video examples', url: 'https://anatomytool.org/open3dmodel' },
      { label: isHebrew() ? 'three.js Forum - דיונים מקצועיים' : 'three.js Forum - professional discussions', url: 'https://discourse.threejs.org/' },
    ];

    tabPanelVideos.innerHTML = `
      <p><strong>${isHebrew() ? 'ספריית אנימציות רפואיות מקומית (דינמית):' : 'Local dynamic medical animation library:'}</strong></p>
      <div class="video-grid">
        ${renderAnimationCards(matchedLocalItems.length ? matchedLocalItems : allLocalItems)}
      </div>
      <p>${isHebrew() ? 'מקורות מומלצים ללמידה על האיבר' : 'Recommended learning sources for'} <strong>${sanitizeHtml(term)}</strong>:</p>
      <div class="video-list">
        ${links.map((item) => `<a class="video-link" href="${item.url}" target="_blank" rel="noopener">${sanitizeHtml(item.label)}</a>`).join('')}
      </div>
    `;
  }

  function activateDialogTab(tabName) {
    tabButtons.forEach((btn) => {
      const active = btn.getAttribute('data-tab') === tabName;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    });
    tabPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.getAttribute('data-panel') === tabName);
    });
  }

  function openMeshDetails(mesh) {
    if (!mesh) return;
    currentMesh = mesh;
    detailRequestId += 1;
    const requestId = detailRequestId;
    const details = buildPartDetails(mesh, getCurrentLang());
    titleEl.textContent = `${t('detailsTitlePrefix')}: ${details.displayName}`;
    fillInfoTab(mesh, requestId);
    fillAnimationsTab(mesh);
    fillImagesTab(mesh, requestId);
    fillVideosTab(mesh);
    activateDialogTab('info');
    const isModal = typeof dialog.matches === 'function' && dialog.matches(':modal');
    if (isModal) {
      dialog.close();
    }
    if (!dialog.open) {
      dialog.show();
    }
    const activeTabBtn = tabButtons.find((btn) => btn.classList.contains('active'));
    if (activeTabBtn) activeTabBtn.focus();
  }

  return {
    openMeshDetails,
    activateDialogTab,
  };
}
