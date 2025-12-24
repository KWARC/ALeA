import MarkdownIt from 'markdown-it';
import tokensToAST, { AstNode } from './md-utils';
import { TexmathPlugin } from './texmath-plugin';

const MD = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
}).use(TexmathPlugin);

export function parseMarkdown(mdString: string): AstNode[] {
  const tokens = MD.parse(mdString, {});
  return tokensToAST(tokens);
}
