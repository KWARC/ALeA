// Derived from https://github.com/goessner/markdown-it-texmath/blob/master/texmath.js

import MarkdownIt from 'markdown-it';

// Spec to be followed:
// https://pandoc.org/MANUAL.html#math-input
// Anything between two $ characters will be treated as TeX math. The opening $ must have a
// non-space character immediately to its right, while the closing $ must have a non-space
// character immediately to its left, and must not be followed immediately by a digit.
// Thus, $20,000 and $30,000 won’t parse as math. If for some reason you need to enclose text
//  in literal $ characters, backslash-escape them and they won’t be treated as math delimiters.
//
// For display math, use $$ delimiters. (In this case, the delimiters may be separated from the formula by whitespace.)

// Pandoc's parser https://github.com/jgm/pandoc/blob/master/src/Text/Pandoc/Parsing.hs
// GeneralizedSchanuelsLemma
export function TexmathPlugin(md: MarkdownIt, _options: any) {
  for (const rule of TexmathPlugin.rules.inline) {
    md.inline.ruler.before('escape', rule.name, TexmathPlugin.inline(rule));
  }
}

function cleanupContent(content: string) {
  return content.replace(/([^\\])\\\n/g, '$1\n');
}

TexmathPlugin.inline = (rule: any) =>
  function (state: any, silent: boolean) {
    const pos = state.pos;
    const str = state.src;
    const pre =
      str.startsWith(rule.tag, (rule.rex.lastIndex = pos)) &&
      (!rule.pre || rule.pre(str, pos)); // valid pre-condition ...
    const match = pre && rule.rex.exec(str);
    const lastPos = match && rule.rex.lastIndex - 1;

    if (match && (!rule.post || rule.post(str, lastPos))) {
      // match && valid post-condition
      if (!silent) {
        const token = state.push(rule.name, 'math', 0);
        token.content = cleanupContent(match[1]);
        token.markup = rule.tag;

        // equation number
        if (rule.name === 'math_block_eqno')
          token.info = match[match.length - 1];
      }
      state.pos = rule.rex.lastIndex;
    }
    rule.rex.lastIndex = 0;
    return match;
  };

TexmathPlugin.$_pre = (str: string, beg: number) => {
  const prv = beg > 0 ? str[beg - 1].charCodeAt(0) : false;
  return (
    !prv ||
    (prv !== 0x5c && // no backslash,
      (prv < 0x30 || prv > 0x39))
  ); // no decimal digit .. before opening '$'
};
TexmathPlugin.$_post = (str: string, end: number) => {
  const nxt = str[end + 1] && str[end + 1].charCodeAt(0);
  return !nxt || nxt < 0x30 || nxt > 0x39; // no decimal digit .. after closing '$'
};

TexmathPlugin.rules = {
  inline: [
    {
      name: 'math_block_eqno',
      rex: /^\s*\$\$([^$]+?)\$\$\s*?\(([^)\s]+?)\)$/gmy,
      tag: '$$',
    },
    {
      name: 'math_block',
      rex: /\$\$(\S|\S[^]*?[^\s\\])\$\$/gy,
      tag: '$$',
      pre: TexmathPlugin.$_pre,
      post: TexmathPlugin.$_post,
    },
    {
      name: 'math_inline',
      rex: /\$(\S|\S[^]*?[^\s\\])\$/gy,
      tag: '$',
      pre: TexmathPlugin.$_pre,
      post: TexmathPlugin.$_post,
    },
  ],
};
