import { NotificationType } from '@stex-react/api';
import axios, { RawAxiosRequestHeaders } from 'axios';
import { sendAlert } from './add-comment';
import { getUserId, sendNotification } from './comment-utils';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface IssueClassification {
  title: string;
  category: 'CONTENT' | 'DISPLAY';
}

function getHeaders(createNewIssueUrl: string): RawAxiosRequestHeaders {
  if (createNewIssueUrl.includes('github')) {
    return { Authorization: `token ${process.env['KWARC_ALEA_PAT']}` };
  }
  return {
    'PRIVATE-TOKEN': process.env['CONTENT_ISSUES_GITLAB_PAT'] as string,
  };
}

async function sendReportNotifications(userId: string | null = null, link: string, type: string) {
  if (type === 'SUGGESTION') {
    await sendNotification(
      userId,
      'You provided a suggestion',
      '',
      'Du hast einen Vorschlag gemacht',
      '',
      NotificationType.SUGGESTION,
      link
    );
  } else {
    await sendNotification(
      userId,
      'You Reported a Problem',
      '',
      'Sie haben ein Problem gemeldet',
      '',
      NotificationType.REPORT_PROBLEM,
      link
    );
  }
}

async function generateIssueTitle(description: string, selectedText: string, context: any): Promise<IssueClassification> {
  if (!description || description.length <= 10) {
    return { title: '', category: 'CONTENT' };
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
      model: 'gpt-4.1-nano',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: "json_object" }
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
      classification.category = 'CONTENT';
    }

    classification.title = classification.title.replace(/^["']|["']$/g, '').substring(0, 60);
    return classification;
  } catch (err) {
    console.error('Issue classification error:', err);
    return { 
      title: '',
      category: 'CONTENT'
    };
  }
}

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (req.method !== 'POST') return res.status(404);
  const body = req.body;

  let generatedTitle = '';
  let issueCategory = 'CONTENT';
  
  if (body.description && body.selectedText) {
    const classification = await generateIssueTitle(body.description, body.selectedText, body.context);
    generatedTitle = classification.title;
    issueCategory = classification.category;
    
    if (generatedTitle && body.data) {
      body.data.title = generatedTitle;
    }
  }

  const headers = getHeaders(body.createNewIssueUrl);

  const response = await axios.post(body.createNewIssueUrl, body.data, {
    headers,
  });
  const issue_url = response.data['web_url'] || response.data['html_url'];
  
  res.status(200).json({ 
    issue_url,
    generatedTitle,
    category: issueCategory
  });
  
  await sendAlert(`A user-reported issue was created at ${issue_url}`);
  // await sendReportNotifications(userId, issue_url, body.type);
}
