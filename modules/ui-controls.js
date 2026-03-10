export function createUiControlsController(options) {
  const {
    t,
    getCurrentLang,
    pickedPartEl,
    hoverPartEl,
    statusTotalEl,
    statusVisibleEl,
    statusSelectedEl,
    favoritesOnlyBtn,
    toggleFavoriteBtn,
    analysisResult,
    partAnalysisSelect,
  } = options;

  function updateStatusBar(structureEntries, selectedMesh) {
    const total = structureEntries.length;
    const visible = structureEntries.filter((entry) => entry.mesh.visible).length;
    const selectedCount = selectedMesh ? 1 : 0;
    statusTotalEl.textContent = `${t('total')}: ${total}`;
    statusVisibleEl.textContent = `${t('visible')}: ${visible}`;
    statusSelectedEl.textContent = `${t('selectedCount')}: ${selectedCount}`;
  }

  function updateFavoriteControls(selectedMesh, isFavoriteMesh, favoritesOnly) {
    const selectedFavorite = selectedMesh ? isFavoriteMesh(selectedMesh) : false;
    toggleFavoriteBtn.textContent = selectedFavorite ? t('removeFavorite') : t('addFavorite');
    favoritesOnlyBtn.textContent = favoritesOnly ? t('favoritesOnlyOn') : t('favoritesOnlyOff');
    favoritesOnlyBtn.classList.toggle('active', favoritesOnly);
  }

  function getCategoryLabelByValue(value) {
    const map = {
      all: t('allParts'),
      head: t('head'),
      'upper-limb': t('upperLimb'),
      'lower-limb': t('lowerLimb'),
      spine: t('spine'),
      thorax: t('thorax'),
      'internal-organs': t('internalOrgans'),
      'abdomen-pelvis': t('abdomenPelvis'),
      vascular: t('vascular'),
      nervous: t('nervous'),
      other: t('other'),
    };
    return map[value] || value;
  }

  function applyStructureFilter(structureEntries, query, favoritesOnly, isFavoriteMesh) {
    const q = (query || '').toLowerCase().trim();
    structureEntries.forEach((entry) => {
      const textMatch = !q || entry.searchName.includes(q);
      const favMatch = !favoritesOnly || isFavoriteMesh(entry.mesh);
      const visibleInList = textMatch && favMatch;
      entry.item.style.display = visibleInList ? 'flex' : 'none';
    });
  }

  function updatePickedPartName(name) {
    const currentLang = getCurrentLang();
    pickedPartEl.textContent = name ? `${currentLang === 'he' ? 'נבחר' : 'Selected'}: ${name}` : t('selectedNone');
  }

  function updateHoverPartName(name) {
    const currentLang = getCurrentLang();
    hoverPartEl.textContent = name ? `${currentLang === 'he' ? 'ריחוף' : 'Hover'}: ${name}` : t('hoverNone');
  }

  function runPartAnalysis(structureEntries) {
    const category = partAnalysisSelect.value;
    const entries = category === 'all'
      ? structureEntries
      : structureEntries.filter((entry) => entry.category === category);
    const visibleCount = entries.filter((entry) => entry.mesh.visible).length;
    const hiddenCount = entries.length - visibleCount;
    const label = partAnalysisSelect.options[partAnalysisSelect.selectedIndex].text;
    if (getCurrentLang() === 'he') {
      analysisResult.textContent = `ניתוח: ${label} | סה"כ: ${entries.length} | גלוי: ${visibleCount} | מוסתר: ${hiddenCount}`;
      return;
    }
    analysisResult.textContent = `Analysis: ${label} | Total: ${entries.length} | Visible: ${visibleCount} | Hidden: ${hiddenCount}`;
  }

  function isolateCategory(category, structureEntries) {
    structureEntries.forEach((entry) => {
      const show = category === 'all' ? true : entry.category === category;
      entry.mesh.visible = show;
      entry.checkbox.checked = show;
    });
    runPartAnalysis(structureEntries);
  }

  return {
    updateStatusBar,
    updateFavoriteControls,
    getCategoryLabelByValue,
    applyStructureFilter,
    updatePickedPartName,
    updateHoverPartName,
    runPartAnalysis,
    isolateCategory,
  };
}
