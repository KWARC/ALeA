import { getFlamsServer } from '@kwarc/ftml-react';
import { FTML } from '@kwarc/ftml-viewer';
import { getAuthHeaders } from '@stex-react/spec';
import { extractRepoAndFilepath as extractProjectAndFilepath } from '@stex-react/utils';
import axios from 'axios';

const THREE_BACKTICKS = '```';

export interface SelectionContext {
  fragmentUri: FTML.URI;
  fragmentKind: 'Section' | 'Paragraph' | 'Slide' | 'Problem'; // Keep alingned with FTML.FragmentKind
  source?: string;
}
async function addSources(context: SelectionContext[]): Promise<SelectionContext[]> {
  return await Promise.all(
    context.map((item) =>
      getFlamsServer()
        .sourceFile({ uri: item.fragmentUri })
        .then((source) => ({ ...item, source }))
    )
  );
}

function createSectionHierarchy(context: SelectionContext[]) {
  if (!context?.length) return '';
  let returnVal = '### The selected text was in the following section hierarchy:\n\n';
  if (context.length > 1) returnVal += '**_INNERMOST SECTION FIRST_**\n\n';

  returnVal += context
    .map(
      (contextItem, idx) =>
        `${idx + 1}. (${contextItem.fragmentKind}) GitLab: ${contextItem.source}<br/>Uri: ${
          contextItem.fragmentUri
        } `
    )
    .join('\n\n');

  return returnVal;
}

function createIssueBody(
  desc: string,
  selectedText: string,
  userName: string,
  context: SelectionContext[]
) {
  const sectionHierarchy = createSectionHierarchy(context);
  const user = userName || 'a user';

  return `An issue was logged by "${user}" at the following url:

${window.location.href}

## The issue as described by the user:
${THREE_BACKTICKS}
${desc.replace(/```/g, '"""')}
${THREE_BACKTICKS}

## The text highlighted while reporting this issue:
${THREE_BACKTICKS}
${selectedText.replace(/```/g, '"""')}
${THREE_BACKTICKS}

${sectionHierarchy}`;
}

function createIssueData(
  desc: string,
  selectedText: string,
  context: SelectionContext[],
  userName: string
) {
  const issueText = createIssueBody(desc, selectedText, userName, context);
  return issueText;
}

export async function createNewIssue(
  desc: string,
  selectedText: string,
  context: SelectionContext[],
  userName: string
) {
  const withSourceContext = await addSources(context);
  const data = createIssueData(desc, selectedText, withSourceContext, userName);

  try {
    const response = await axios.post(
      '/api/create-issue',
      {
        data,
        description: desc,
        selectedText,
        context: withSourceContext[0]?.source,
      },
      { headers: getAuthHeaders() }
    );
    return response.data['issue_url'];
  } catch (err) {
    console.error(err);
    return null;
  }
}

export function issuesUrlList(context: SelectionContext[]) {
  const { project } = extractProjectAndFilepath(context?.[0]?.source);
  if (!project) return 'https://github.com/slatex/ALeA/issues';
  return `https://gl.mathhub.info/${project}/-/issues`;
}
