// =====================================================
// MAILGUN EMAIL SERVICE
// Sprint 85: Weekly Ops Report Email Delivery
// =====================================================
// Service for sending transactional and operational emails via Mailgun

import { logger } from '../lib/logger';
import { captureException } from './observability.service';

/**
 * Mailgun configuration from environment variables
 */
const MAILGUN_CONFIG = {
  apiKey: process.env.MAILGUN_API_KEY || '',
  domain: process.env.MAILGUN_DOMAIN || '',
  fromEmail: process.env.MAILGUN_FROM_EMAIL || 'ops@pravado.io',
  fromName: process.env.MAILGUN_FROM_NAME || 'Pravado Operations',
};

/**
 * Email message interface
 */
export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

/**
 * Send email via Mailgun API
 *
 * @param message - Email message to send
 * @returns Promise resolving to Mailgun response
 */
export async function sendEmail(message: EmailMessage): Promise<any> {
  try {
    // Validate configuration
    if (!MAILGUN_CONFIG.apiKey) {
      throw new Error('MAILGUN_API_KEY environment variable not set');
    }

    if (!MAILGUN_CONFIG.domain) {
      throw new Error('MAILGUN_DOMAIN environment variable not set');
    }

    // Normalize recipients
    const toAddresses = Array.isArray(message.to) ? message.to.join(',') : message.to;

    // Prepare form data for Mailgun API
    const formData = new FormData();
    formData.append('from', `${MAILGUN_CONFIG.fromName} <${MAILGUN_CONFIG.fromEmail}>`);
    formData.append('to', toAddresses);
    formData.append('subject', message.subject);

    if (message.text) {
      formData.append('text', message.text);
    }

    if (message.html) {
      formData.append('html', message.html);
    }

    // Add attachments
    if (message.attachments) {
      message.attachments.forEach((attachment) => {
        const blob = new Blob([attachment.content], {
          type: attachment.contentType || 'application/octet-stream',
        });
        formData.append('attachment', blob, attachment.filename);
      });
    }

    // Send via Mailgun API
    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_CONFIG.domain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${MAILGUN_CONFIG.apiKey}`).toString('base64')}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mailgun API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    logger.info('[Mailgun] Email sent successfully', {
      to: toAddresses,
      subject: message.subject,
      messageId: result.id,
    });

    return result;
  } catch (error) {
    logger.error('[Mailgun] Failed to send email', {
      error,
      to: message.to,
      subject: message.subject,
    });

    captureException(error as Error, {
      context: 'mailgun-send-email',
      extra: {
        to: message.to,
        subject: message.subject,
      },
    });

    throw error;
  }
}

/**
 * Convert Markdown to HTML
 * Basic Markdown to HTML converter for emails
 *
 * @param markdown - Markdown content
 * @returns HTML string
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2">$1</a>');

  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

  // Tables (basic support)
  html = html.replace(/\|(.+)\|/gim, (match) => {
    const cells = match.split('|').filter((c) => c.trim());
    const cellsHtml = cells.map((c) => `<td>${c.trim()}</td>`).join('');
    return `<tr>${cellsHtml}</tr>`;
  });

  html = html.replace(/(<tr>.*<\/tr>)/gims, '<table border="1" cellpadding="8" cellspacing="0">$1</table>');

  // Line breaks
  html = html.replace(/\n/gim, '<br>');

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');

  return html;
}

/**
 * Wrap HTML content in email template
 *
 * @param content - HTML content
 * @param title - Email title
 * @returns Complete HTML email
 */
export function wrapInEmailTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: #ffffff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 10px;
    }
    h2 {
      color: #4f46e5;
      margin-top: 30px;
    }
    h3 {
      color: #6366f1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    td, th {
      padding: 12px;
      text-align: left;
      border: 1px solid #e5e7eb;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .status-good {
      color: #10b981;
      font-weight: 600;
    }
    .status-warning {
      color: #f59e0b;
      font-weight: 600;
    }
    .status-critical {
      color: #ef4444;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${content}
    <div class="footer">
      <p>
        <strong>Pravado Platform</strong><br>
        Automated Operations Report<br>
        <a href="https://dashboard.pravado.com/admin/ops-dashboard">View Ops Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Send weekly ops report email
 *
 * @param reportMarkdown - Markdown report content
 * @param recipients - Email recipients
 * @returns Promise resolving to Mailgun response
 */
export async function sendWeeklyOpsReport(
  reportMarkdown: string,
  recipients: string[]
): Promise<any> {
  try {
    // Convert Markdown to HTML
    const htmlContent = markdownToHtml(reportMarkdown);
    const fullHtml = wrapInEmailTemplate(htmlContent, 'Weekly Ops Report');

    // Send email
    const result = await sendEmail({
      to: recipients,
      subject: `Pravado Platform - Weekly Ops Report (${new Date().toISOString().split('T')[0]})`,
      text: reportMarkdown,
      html: fullHtml,
    });

    return result;
  } catch (error) {
    logger.error('[Mailgun] Failed to send weekly ops report', { error });
    throw error;
  }
}

/**
 * Validate Mailgun configuration
 *
 * @returns boolean indicating if Mailgun is configured
 */
export function isMailgunConfigured(): boolean {
  return !!(MAILGUN_CONFIG.apiKey && MAILGUN_CONFIG.domain);
}
