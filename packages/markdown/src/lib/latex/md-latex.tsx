import { MathJaxBaseContext, MathJaxSubscriberProps } from '@alea/mathjax';
import { useContext, useEffect, useState } from 'react';

interface MdLatexProps {
  displayMode?: boolean;
  latex: string;
  equationInput?: string;
}

function getErrorCss(color: string, block?: boolean) {
  return {
    fontWeight: 'bold',
    color: color,
    display: block ? 'block' : undefined,
  };
}

interface RenderedOrError {
  renderedHtml?: any;
  error?: string;
}
async function getRendered(
  mjPromise: MathJaxSubscriberProps,
  latex: string,
  displayMode: boolean
): Promise<RenderedOrError> {
  if (!mjPromise) return { error: 'MathJax missing' };
  const mathJax = await mjPromise.promise;
  await mathJax.startup.promise;
  try {
    if (!mathJax) return { error: 'MathJax missing' };
    return {
      renderedHtml: mathJax['tex2chtml'](latex, {
        em: 12,
        ex: 6,
        display: displayMode,
      }).outerHTML,
    };
    //return [katex.renderToString(latex, { displayMode }), null];
  } catch (err: any) {
    console.log(err.message);
    console.log(mathJax);
    return { error: '!' + latex + '!' };
  }
}

export function MdLatex({ displayMode = false, latex, equationInput }: MdLatexProps) {
  const mjPromise = useContext(MathJaxBaseContext);
  const [{ renderedHtml: rendered, error }, setRenderedOrError] = useState<RenderedOrError>({});
  useEffect(() => {
    if (!mjPromise) return;
    getRendered(mjPromise, latex, displayMode).then(async (v) => {
      setRenderedOrError(v);
      const mathJax2 = await mjPromise.promise;
      mathJax2.startup.document.clear();
      mathJax2.startup.document.updateDocument();
    });
  }, [latex, displayMode]);
  if (!displayMode) {
    return (
      <>
        {rendered && (
          <div
            style={{ display: 'inline-block' }}
            dangerouslySetInnerHTML={{ __html: rendered }}
          ></div>
        )}
        {error && <span style={getErrorCss('blue', true)}>{error}</span>}
      </>
    );
  }
  if (equationInput) {
    return (
      <section className="eqno">
        {rendered && <div dangerouslySetInnerHTML={{ __html: rendered }}></div>}
        {error && <span style={getErrorCss('salmon')}>{error}</span>}
        <span>({equationInput})</span>
      </section>
    );
  }
  return (
    <>
      {rendered && <div dangerouslySetInnerHTML={{ __html: rendered }}></div>}
      {error && <span style={getErrorCss('red')}>{error}</span>}
    </>
  );
}
