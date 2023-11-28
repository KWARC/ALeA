import { getAuthHeaders } from '@stex-react/api';
import { FileInfo } from '@stex-react/utils';
import axios from 'axios';

const THREE_BACKTICKS = '```';

export enum IssueType {
  ERROR = 'ERROR',
  SUGGESTION = 'SUGGESTION',
}

export enum IssueCategory {
  CONTENT = 'CONTENT',
  DISPLAY = 'DISPLAY',
}

function createSectionHierarchy(context: FileInfo[]) {
  if (!context?.length) return '';
  let returnVal =
    '### The selected text was in the following section hierarchy:\n\n';
  if (context.length > 1) returnVal += '**_INNERMOST SECTION FIRST_**\n\n';

  returnVal += context
    .map(
      (sectionInfo, idx) =>
        `${idx + 1}. GitLab: ${
          sectionInfo.source
        }<br/>FetchURL: https://stexmmt.mathhub.info/${sectionInfo.url}`
    )
    .join('\n\n');
  return returnVal;
}

function createIssueBody(
  type: IssueType,
  desc: string,
  selectedText: string,
  userName: string,
  context: FileInfo[]
) {
  const sectionHierarchy = createSectionHierarchy(context);
  const user = userName || 'a user';

  return `A content ${type.toString()} was logged by "${user}" at the following url:

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

function getNewIssueUrl(category: IssueCategory, projectId: string) {
  if (category === IssueCategory.CONTENT) {
    return `https://gl.mathhub.info/api/v4/projects/${encodeURIComponent(
      projectId
    )}/issues`;
  }
  return 'https://api.github.com/repos/slatex/sTeX-React/issues';
}

function createIssueData(
  type: IssueType,
  category: IssueCategory,
  desc: string,
  selectedText: string,
  context: FileInfo[],
  userName: string,
  title?: string
) {
  const filepath = context?.[0]?.filepath;
  const body = createIssueBody(type, desc, selectedText, userName, context);
  return {
    title: title || `User reported ${type.toString()} ${filepath}`,
    ...(category === IssueCategory.DISPLAY
      ? { body, labels: ['user-reported'] }
      : { description: body }),
  };
}
export async function createNewIssue(
  type: IssueType,
  category: IssueCategory,
  desc: string,
  selectedText: string,
  context: FileInfo[],
  userName: string,
  title?: string
) {
  const projectId = context?.[0]?.archive || 'sTeX/meta-inf';
  const data = createIssueData(
    type,
    category,
    desc,
    selectedText,
    context,
    userName,
    title
  );
  try {
    const createNewIssueUrl = getNewIssueUrl(category, projectId);
    const response = await axios.post(
      '/api/create-issue',
      {
        data,
        type,
        createNewIssueUrl,
        category: category.toString(),
      },
      { headers: getAuthHeaders() }
    );
    return response.data['issue_url'];
  } catch (err) {
    console.log(err);
    return null;
  }
}

export function issuesUrlList(context: FileInfo[]) {
  const projectId = context?.[0]?.archive;
  if (!projectId) return 'https://github.com/slatex/sTeX-React/issues';
  return `https://gl.mathhub.info/${projectId}/-/issues`;
}
