import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { MdLatex } from './latex/md-latex';
import { inlineChild, nodeToTable } from './md-block';
import { AstNode } from './parser/md-utils';

/*
// For converting a link to our own website to a router link.
function gethref2(url: string) {
  const match = url.match(
    /^([^:/?#]+:)?(?:\/\/([^/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/
  );
  if (!match) return null;
  if (
    typeof match[1] === 'string' &&
    match[1].length > 0 &&
    match[1].toLowerCase() !== Window?.location.protocol
  ) {
    return null;
  }
  if (
    typeof match[2] === 'string' &&
    match[2].length > 0 &&
    match[2].replace(
      new RegExp(
        ':(' + { 'http:': 80, 'https:': 443 }[Window?.location.protocol] + ')?$'
      ),
      ''
    ) !== Window?.location.host
  ) {
    return null;
  }
  if (match.length < 4) return null;
  // TODO: Handle special characters in href better ";" "'"
  const link = match.slice(3).join('');
  return link.startsWith('/') ? link : '/' + link;
}

function isExternalLink(node: AstNode) {
  return !gethref(node);
}
function gethref(node: AstNode) {
  return gethref2(getHref(node));
}
*/

function _T(value: string) {
  return value || '';
}

function getHref(node: AstNode) {
  return node.attributes['href'];
}

function showExternalIcon(node: AstNode) {
  return (
    /*isExternalLink(node) &&*/
    !(node.children.length === 1 && node.children[0].type === 'image')
  );
}
function nodeToElement(node: AstNode) {
  switch (node.type) {
    /* Emphasis */
    case 'em':
      return <em key={node.key}>{inlineChild(node)}</em>;
    case 'inline':
      return (
        <span key={node.key} style={{ display: 'inline' }}>
          {inlineChild(node)}
        </span>
      );
    case 'html_inline':
      return <span key={node.key}>{inlineChild(node)}</span>;

    /* Strong */
    case 'strong':
      return <strong key={node.key}>{inlineChild(node)}</strong>;
    case 'softbreak':
      return <span key={node.key}>&nbsp;</span>;

    /* Delete */
    case 'delete':
      return <del key={node.key}>{inlineChild(node)}</del>;

    /* Inlide Code */
    case 'code_inline':
      return <code key={node.key}>{_T(node.content)}</code>;

    /* Sub-script Super-script plugin */
    case 'sub':
      return <sub key={node.key}>{inlineChild(node)}</sub>;

    /* Super-script Super-script plugin */
    case 'sup':
      return <sup key={node.key}>{inlineChild(node)}</sup>;
    case 's':
      return <s key={node.key}>{inlineChild(node)}</s>;
    case 'text':
      return <span key={node.key}>{_T(node.content)}</span>;

    /* Line break */
    case 'hardbreak':
      return <br />;

    /* Link */
    case 'link':
      return (
        <a key={node.key} href={getHref(node)} target="_blank" rel="noreferrer">
          <span style={{ marginRight: '3px' }}>{inlineChild(node)}</span>
          {showExternalIcon(node) && (
            <OpenInNewIcon sx={{ verticalAlign: 'text-bottom' }} fontSize="inherit" />
          )}
        </a>
      );
    /* if !isExternalLink (
        <Link key={node.key} href={getHref(node)}>
          <a>{inlineChild(node)}</a>
        </Link>
      );*/

    /* Image */
    case 'image':
      return (
        <img
          key={node.key}
          src={node.attributes.src}
          title={_T(node.attributes.title)}
          alt={_T(node.attributes.alt)}
        />
      );

    case 'math_inline':
      return <MdLatex key={node.key} latex={node.content} displayMode={false} />;

    case 'math_block':
      return <MdLatex key={node.key} latex={node.content} displayMode={true} />;

    case 'math_block_eqno':
      return (
        <MdLatex
          key={node.key}
          latex={node.content}
          equationInput={node.sourceInfo}
          displayMode={true}
        />
      );

    /* HACK: 'paragraph' and 'table' should only be block elements. But
      resource expansion causes them to be inline.
      TODO: Fix the parser and remove this hack.
    */
    case 'paragraph':
      return <span key={node.key}>{inlineChild(node)}</span>; // hack
    case 'table':
      return nodeToTable(node);

    default:
      return <b>unhandled-inline [{node.type}]</b>;
  }
}

export function MdInline({ nodes }: { nodes: AstNode[] }) {
  if (!nodes) return null;
  return <>{nodes.map((node) => nodeToElement(node))}</>;
}

/*  <!-- Footnote Reference
    <sup case 'footnoteReference':>[{{ tree.footnoteIndex(node) }}]</sup>
    -->

    <!-- Plain text with emoji support by EmojiTextModule
    <span case 'text': [wm-emoji-text]="_T(node.content) | emojiNames" [mode]="tree.emojiMode"></span>
    -->

    <!-- Image Reference
        <ng-container case 'imageReference':>
        <img ngIf="tree.definition(node) as def" [src]="def.url" [title]="_T(def.title)" [alt]="_T(def.alt)"/>
        </ng-container>
        -->*/
