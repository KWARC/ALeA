import { NotificationType } from '@alea/spec';
import { extractRepoAndFilepath as extractProjectAndFilepath } from '@alea/utils';
import axios, { RawAxiosRequestHeaders } from 'axios';
import { OpenAI } from 'openai';
import { sendAlert } from './add-comment';
import { checkIfPostOrSetError, getUserId, sendNotification } from './comment-utils';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

enum IssueCategory {
  CONTENT = 'CONTENT',
  DISPLAY = 'DISPLAY',
}
interface IssueClassification {
  title: string;
  category: IssueCategory;
}

function getHeaders(createNewIssueUrl: string): RawAxiosRequestHeaders {
  if (createNewIssueUrl.includes('github')) {
    return { Authorization: `token ${process.env['KWARC_ALEA_PAT']}` };
  }
  return {
    'PRIVATE-TOKEN': process.env['CONTENT_ISSUES_GITLAB_PAT'] as string,
  };
}

function isGitlabIssue(classification: IssueClassification, context: string) {
  return classification.category === 'CONTENT' && context?.length > 0;
}

function getNewIssueUrl(classification: IssueClassification, projectId: string, context: string) {
  if (!isGitlabIssue(classification, context))
    return 'https://api.github.com/repos/slatex/ALeA/issues';
  return `https://gl.mathhub.info/api/v4/projects/${encodeURIComponent(projectId)}/issues`;
}

async function sendReportNotifications(userId: string | null = null, link: string) {
  await sendNotification(
    userId,
    'You Reported an issue',
    '',
    'Sie haben ein Problem gemeldet',
    '',
    NotificationType.REPORT_PROBLEM,
    link
  );
}

async function generateIssueTitle(
  description: string,
  selectedText: string,
  context: string
): Promise<IssueClassification> {
  if (!description || description.length <= 10) {
    return { title: '', category: IssueCategory.CONTENT };
  }

  const prompt = `
You are an assistant that analyzes user reports and generates issue classifications.
Your task is to:
1. Generate a concise issue title
2. Classify the issue category (CONTENT or DISPLAY)

Context:
- Selected Text: ${selectedText}
- Description: ${description}
- Fragment context: ${JSON.stringify(context)}

The classification is important because it determines where the issue will be reported:
- CONTENT → GitLab
- DISPLAY → GitHub

Classification Guidelines:
- CONTENT: Issues related to information accuracy, missing content, typos, spelling errors, factual problems
- DISPLAY: Issues related to visual presentation, formatting, layout, rendering problems

Respond with a valid JSON object in this exact format:
{
  "title": "Brief descriptive title (max 60 characters)",
  "category": "CONTENT" or "DISPLAY",
}

Keep the title neutral, readable by educators and developers, and don't repeat the user's words verbatim.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content?.trim();
    if (!content) {
      throw new Error('No response content');
    }

    const classification: IssueClassification = JSON.parse(content);

    if (!classification.title || !classification.category) {
      throw new Error('Invalid classification response');
    }

    if (!['CONTENT', 'DISPLAY'].includes(classification.category)) {
      classification.category = IssueCategory.CONTENT;
    }

    classification.title = classification.title.replace(/^["']|["']$/g, '').substring(0, 60);
    return classification;
  } catch (err) {
    console.error('Issue classification error:', err);
    const { filepath } = extractProjectAndFilepath(context);
    if (!filepath) {
      return {
        title: `User created issue`,
        category: IssueCategory.CONTENT,
      };
    }
    return {
      title: `User reported issue in ${filepath}`,
      category: IssueCategory.CONTENT,
    };
  }
}

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserId(req);
  const body = req.body;

  let generatedTitle = body.title?.trim() || '';
  let issueCategory = IssueCategory.CONTENT;

  const { project } = extractProjectAndFilepath(body.context);
  const projectId = project || 'sTeX/meta-inf';

  if (!generatedTitle && body.description && body.selectedText) {
    const classification = await generateIssueTitle(
      body.description,
      body.selectedText,
      body.context
    );
    generatedTitle = classification.title;
    issueCategory = classification.category;
  }

  const isGitlab = isGitlabIssue({ category: issueCategory } as IssueClassification, body.context);

  const issuePayload = isGitlab
    ? { description: body.data, title: generatedTitle }
    : { body: body.data, labels: ['user-reported'], title: generatedTitle };

  body.createNewIssueUrl = getNewIssueUrl(
    { category: issueCategory } as IssueClassification,
    projectId,
    body.context
  );

  const headers = getHeaders(body.createNewIssueUrl);

  const response = await axios.post(body.createNewIssueUrl, issuePayload, {
    headers,
  });
  const issue_url = response.data['web_url'] || response.data['html_url'];

  res.status(200).json({
    issue_url,
    generatedTitle,
    category: issueCategory,
  });

  await sendAlert(`A user-reported issue was created at ${issue_url}`);
  await sendReportNotifications(userId, issue_url);
}
