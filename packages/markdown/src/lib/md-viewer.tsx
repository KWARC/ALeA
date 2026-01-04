import styles from './markdown.module.scss';
import { MdBlock } from './md-block';
import { parseMarkdown } from './parser/md-parser';

export function MdViewer({ content }: { content: string }) {
  const t = parseMarkdown(content);
  return (
    <div style={{ display: 'inherit' }} className={styles['md_parent']}>
      <MdBlock nodes={t} />
    </div>
  );
}
