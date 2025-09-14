// Derived from https://github.com/fast-reflexes/better-react-mathjax
import { useContext, useEffect, useRef } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { MathJaxBaseContext } from '@alea/mathjax';

// This component is not displayed. It is only used as a workaround.
// We use mathml2chtml for actually rendering math but it seems like the required fonts are
// not loaded if no actual typesetting is done. This function typsets into a hidden span.
const MathJaxHack = ({ children }: { children: any }) => {
  const ref = useRef<HTMLElement>(null);
  const mjPromise = useContext(MathJaxBaseContext);
  // whether initial typesetting of this element has been done or not
  const initLoad = useRef(false);

  // mutex to signal when typesetting is ongoing (without it we may have race conditions)
  const typesetting = useRef(false);

  const onTypesetDone = () => {
    if (!initLoad.current) initLoad.current = true;
    typesetting.current = false;
  };

  // const effectToUse = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
  useEffect(() => {
    if (initLoad.current || typesetting.current) return;
    if (ref.current === null) return;
    if (!mjPromise) throw Error('MathJax not loaded, forgot MathJaxContext?');
    typesetting.current = true;
    mjPromise.promise
      .then((mathJax) => {
        mathJax.startup.promise
          .then(() => {
            mathJax['typesetClear']([ref.current]);
            return mathJax['typesetPromise']([ref.current]);
          })
          .then(onTypesetDone)
          .catch((err) => {
            onTypesetDone();
            console.log(
              `TypesettingFailed : ${err?.message || err?.toString()}`
            );
          });
      })
      .catch((err) => {
        onTypesetDone();
        console.log(`TypesettingFailed : ${err?.message || err?.toString()}`);
      });
  });

  // The VSCode plugin uses a webview that doesn't like mathml. This span contains mathml before
  // it is typeset. This component is not even dispalyed, just used as a hack as explained in the
  // component comment. So if it fails, just ignore it using the ErrorBoundary
  return (
    <ErrorBoundary hidden={true}>
      <span style={{ display: 'none' }} ref={ref}>
        {children}
      </span>
    </ErrorBoundary>
  );
};

export default MathJaxHack;
