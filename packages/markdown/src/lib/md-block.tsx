import { MdInline } from './md-inline';
import { AstNode } from './parser/md-utils';

export function inlineChild(node: AstNode) {
  return <MdInline nodes={node.children} />;
}

export function blockChild(node: AstNode) {
  return <MdBlock nodes={node.children} />;
}

export function nodeToTable(node: AstNode) {
  /* Tables TODO: cell alignement attr.align={node.align[i] || ''}*/
  return (
    <table key={node.key}>
      <thead>
        <tr>
          {node.children[0].children[0].children.map((cell) => (
            <th key={cell.key}>{inlineChild(cell)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {node.children[1].children.map((row) => (
          <tr key={row.key}>
            {row.children.map((cell) => (
              <td key={cell.key}>{inlineChild(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function nodeToElement(node: AstNode) {
  switch (node.type) {
    /* Headings */
    case 'heading1':
      return <h1 key={node.key}>{inlineChild(node)}</h1>;
    case 'heading2':
      return <h2 key={node.key}>{inlineChild(node)}</h2>;
    case 'heading3':
      return <h3 key={node.key}>{inlineChild(node)}</h3>;
    case 'heading4':
      return <h4 key={node.key}>{inlineChild(node)}</h4>;
    case 'heading5':
      return <h5 key={node.key}>{inlineChild(node)}</h5>;
    case 'heading6':
      return <h6 key={node.key}>{inlineChild(node)}</h6>;
    /* Paragraph */
    case 'paragraph':
      return <p key={node.key}>{inlineChild(node)}</p>;
    case 'inline_paragraph':
      return <span key={node.key}>{inlineChild(node)}</span>;
    /* Lists */
    case 'bullet_list':
      return (
        <ul key={node.key}>
          {node.children.map((item) => (
            <li key={item.key}>{blockChild(item)}</li>
          ))}
          {/*<!-- Is item always 'list_item'? Is it okay to directly add item.child[0]?--->*/}
        </ul>
      );
    case 'ordered_list':
      return (
        <ol key={node.key}>
          {node.children.map((item) => (
            <li key={item.key}>{blockChild(item)}</li>
          ))}
          {/*<!-- Is item always 'list_item'? Is it okay to directly add item.child[0]?--->*/}
        </ol>
      );
    /* Code */
    case 'code_block':
    case 'fence':
      return (
        <pre key={node.key}>
          <code>{node.content}</code>
        </pre>
      );
    /* Thematic Break */
    case 'hr':
      return <hr />;

    /* Blockquotes */
    case 'blockquote':
      return <blockquote key={node.key}>{blockChild(node)}</blockquote>;

    /* Left aligned block - Align plugin */
    case 'leftAligned':
      return (
        <span key={node.key} style={{ textAlign: 'left' }}>
          {blockChild(node)}
        </span>
      );
    /* Center aligned block - Align plugin */
    case 'centerAligned':
      return (
        <span key={node.key} style={{ textAlign: 'center' }}>
          {blockChild(node)}
        </span>
      );
    /* Right aligned block - Align plugin */
    case 'rightAligned':
      return (
        <span key={node.key} style={{ textAlign: 'right' }}>
          {blockChild(node)}
        </span>
      );

    /* Table */
    case 'table':
      return nodeToTable(node);

    default:
      return `unhandled-block [${node.type}]`;
  }
}
export function MdBlock({ nodes }: { nodes: AstNode[] }) {
  if (!nodes) return null;
  return <>{nodes.map((node) => nodeToElement(node))}</>;
}
