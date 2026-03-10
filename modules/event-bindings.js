export function registerEventBindings(options) {
  const {
    windowObj,
    tabButtons,
    elements,
    handlers,
  } = options;

  const {
    canvasEl,
    showAllBtn,
    hideAllBtn,
    invertVisibilityBtn,
    clearSelectionBtn,
    focusSelectedBtn,
    resetViewBtn,
    zoomInBtn,
    zoomOutBtn,
    angleFrontBtn,
    angleSideBtn,
    angleTopBtn,
    toggleFavoriteBtn,
    favoritesOnlyBtn,
    openDetailsBtn,
    langToggleBtn,
    partDetailsDialog,
    xrayToggle,
    xrayOpacity,
    analyzePartBtn,
    partAnalysisSelect,
    isolatePartBtn,
    resetIsolationBtn,
  } = elements;

  canvasEl.addEventListener('click', handlers.onCanvasClick);
  canvasEl.addEventListener('dblclick', handlers.onCanvasDoubleClick);
  canvasEl.addEventListener('mousemove', handlers.onCanvasMove);
  canvasEl.addEventListener('mouseleave', handlers.onCanvasLeave);

  showAllBtn.addEventListener('click', handlers.onShowAll);
  hideAllBtn.addEventListener('click', handlers.onHideAll);
  invertVisibilityBtn.addEventListener('click', handlers.onInvertVisibility);
  clearSelectionBtn.addEventListener('click', handlers.onClearSelection);
  focusSelectedBtn.addEventListener('click', handlers.onFocusSelected);
  resetViewBtn.addEventListener('click', handlers.onResetView);
  zoomInBtn.addEventListener('click', handlers.onZoomIn);
  zoomOutBtn.addEventListener('click', handlers.onZoomOut);
  angleFrontBtn.addEventListener('click', handlers.onAngleFront);
  angleSideBtn.addEventListener('click', handlers.onAngleSide);
  angleTopBtn.addEventListener('click', handlers.onAngleTop);
  toggleFavoriteBtn.addEventListener('click', handlers.onToggleFavorite);
  favoritesOnlyBtn.addEventListener('click', handlers.onToggleFavoritesOnly);
  openDetailsBtn.addEventListener('click', handlers.onOpenDetails);
  langToggleBtn.addEventListener('click', handlers.onToggleLanguage);

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      handlers.onTabClick(btn.getAttribute('data-tab'));
    });
    btn.addEventListener('keydown', (event) => {
      const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' '];
      if (!keys.includes(event.key)) return;
      const index = tabButtons.indexOf(btn);
      if (index === -1) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        btn.click();
        return;
      }

      event.preventDefault();
      let targetIndex = index;
      if (event.key === 'ArrowRight') targetIndex = (index + 1) % tabButtons.length;
      if (event.key === 'ArrowLeft') targetIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      if (event.key === 'Home') targetIndex = 0;
      if (event.key === 'End') targetIndex = tabButtons.length - 1;
      const nextBtn = tabButtons[targetIndex];
      nextBtn.focus();
      nextBtn.click();
    });
  });

  partDetailsDialog.addEventListener('close', handlers.onDialogClose);

  windowObj.addEventListener('keydown', handlers.onWindowKeydown);
  xrayToggle.addEventListener('change', handlers.onXrayToggle);
  xrayOpacity.addEventListener('input', handlers.onXrayOpacityInput);
  analyzePartBtn.addEventListener('click', handlers.onAnalyze);
  partAnalysisSelect.addEventListener('change', handlers.onAnalysisCategoryChange);
  isolatePartBtn.addEventListener('click', handlers.onIsolate);
  resetIsolationBtn.addEventListener('click', handlers.onResetIsolation);
  windowObj.addEventListener('resize', handlers.onResize);
}
