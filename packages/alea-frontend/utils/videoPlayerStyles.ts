export const applyVideoPlayerStyles = (root: HTMLElement): void => {
  const controlBar = root.querySelector('.vjs-control-bar') as HTMLElement | null;
  if (controlBar) {
    Object.assign(controlBar.style, {
      padding: '8px 12px',
      position: 'absolute',
      bottom: '0',
      left: '0',
      right: '0',
      width: '100%',
      zIndex: '1000',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderRadius: '0 0 8px 8px',
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.2)',
      visibility: 'visible',
      opacity: '1',
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'nowrap',
      height: 'auto',
      minHeight: '40px',
    });
  }

  const controlButtons = root.querySelectorAll('.vjs-control');
  controlButtons.forEach((button) => {
    if (button instanceof HTMLElement) {
      button.style.flexShrink = '0';
    }
  });

  const progressBar = root.querySelector('.vjs-progress-holder') as HTMLElement | null;
  if (progressBar) {
    progressBar.style.marginTop = '0';
  }

  const textTrackDisplay = root.querySelector('.vjs-text-track-display') as HTMLElement | null;
  if (textTrackDisplay) {
    Object.assign(textTrackDisplay.style, {
      insetBlock: '0px',
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '50px',
      margin: '0',
      padding: '0 0 50px 0',
    });
  }
};

