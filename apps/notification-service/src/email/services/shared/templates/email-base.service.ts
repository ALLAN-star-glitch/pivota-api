/**
 * Email Base Template
 * 
 * Core HTML template that provides the consistent branding and structure for all
 * PivotaConnect emails. This template is used by the EmailTemplateService to wrap
 * all email content, ensuring a unified look and feel across all communications.
 * 
 * Features:
 * - Responsive design optimized for both desktop and mobile email clients
 * - PivotaConnect branding with logo and brand colors following the 60-30-10 rule
 * - Social media links in footer
 * - Consistent typography using Montserrat (headings) and Merriweather (body)
 * - Accessibility-compliant color contrast
 * - Pre-built reusable CSS classes for common email components
 * 
 * CSS Classes:
 * - info-box: For informational content with subtle background
 * - security-alert: For urgent security notifications (error color)
 * - device-details: For displaying device information in login alerts
 * - expiry-box: For time-sensitive information (OTP expiry, invitation links)
 * - viewing-card: For property viewing details
 * - property-highlight: For property titles in listing/viewing emails
 * - admin-badge: For admin-scheduled events (tertiary color)
 * - role-badge: For user role display (secondary color)
 * - message-box: For user-submitted messages in invitations
 * - button: Primary call-to-action button (secondary color)
 * - divider: Subtle separator line
 * 
 * Color Usage (60-30-10 Rule):
 * - Primary (60%): Used for headers, main headings, info boxes
 * - Secondary (30%): Used for primary buttons and accents
 * - Tertiary (10%): Used for admin badges and special highlights
 * 
 * Mobile Responsiveness:
 * - Reduces padding on smaller screens
 * - Buttons become full-width
 * - Logo scales down appropriately
 * 
 * @example
 * // Used in EmailTemplateService:
 * const fullHtml = getBaseHtmlTemplate(content, colors, social);
 * 
 * @param content - The inner HTML content to be placed in the email body
 * @param colors - PivotaConnect color palette (EmailColors interface)
 * @param social - Social media links (SocialLinks interface)
 * @returns Complete HTML string with header, footer, and styling
 */

import { EmailColors, SocialLinks } from "@pivota-api/interfaces";

export const getBaseHtmlTemplate = (content: string, colors: EmailColors, social: SocialLinks): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PivotaConnect</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Merriweather', Georgia, 'Times New Roman', serif;
          background-color: ${colors.background};
          -webkit-font-smoothing: antialiased;
        }
        
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background-color: ${colors.surface};
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .email-header {
          background: linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}08 50%, ${colors.primary}15 100%);
          padding: 32px 24px;
          text-align: center;
          border-bottom: 1px solid ${colors.borderLight};
        }
        
        .logo-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }
        
        .logo-image {
          max-width: 200px;
          width: 100%;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        
        .email-content {
          padding: 48px 32px;
          background: ${colors.surface};
        }
        
        h1 {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: ${colors.primary};
          margin: 0 0 16px 0;
          letter-spacing: -0.5px;
        }
        
        p {
          font-family: 'Merriweather', Georgia, 'Times New Roman', serif;
          font-size: 16px;
          line-height: 1.6;
          color: ${colors.textPrimary};
          margin: 0 0 16px 0;
        }
        
        .info-box {
          background: ${colors.neutralVariant}20;
          border: 1px solid ${colors.borderLight};
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .info-box h3 {
          color: ${colors.primary};
          font-size: 16px;
          margin: 0 0 12px 0;
          font-weight: 600;
        }
        
        .info-box ul {
          margin: 0;
          padding-left: 20px;
          color: ${colors.textPrimary};
        }
        
        .info-box li {
          margin-bottom: 8px;
        }
        
        .button {
          display: inline-block;
          background: ${colors.secondary};
          color: ${colors.onSecondary} !important;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          font-family: 'Montserrat', sans-serif;
          margin: 14px 0;
          transition: all 0.2s ease;
        }

        .button:hover {
          background: ${colors.secondary}E6;
          transform: translateY(-1px);
        }
        
        .security-alert {
          background: ${colors.error}10;
          border-left: 4px solid ${colors.error};
          padding: 16px 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .security-alert p {
          color: ${colors.error};
          margin: 0;
        }
        
        .device-details {
          background: ${colors.neutralVariant}20;
          padding: 16px;
          border-radius: 8px;
          margin: 20px 0;
          font-family: monospace;
          font-size: 13px;
        }
        
        .device-details p {
          margin: 0 0 6px 0;
          color: ${colors.textSecondary};
        }
        
        .expiry-box {
          background: ${colors.warning}10;
          border: 1px solid ${colors.warning}30;
          padding: 14px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          color: ${colors.textSecondary};
          font-size: 13px;
        }
        
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, ${colors.borderMedium}, transparent);
          margin: 32px 0;
        }
        
        .viewing-card {
          background: ${colors.surfaceVariant};
          border: 1px solid ${colors.borderLight};
          padding: 20px;
          border-radius: 12px;
          margin: 20px 0;
        }
        
        .viewing-details {
          background: ${colors.surface};
          padding: 16px;
          border-radius: 8px;
          margin: 14px 0;
          border-left: 4px solid ${colors.primary};
        }
        
        .property-highlight {
          font-family: 'Montserrat', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: ${colors.primary};
          margin: 0 0 8px 0;
        }
        
        .admin-badge {
          display: inline-block;
          background: ${colors.tertiary}20;
          color: ${colors.primary};
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 600;
          font-family: 'Montserrat', sans-serif;
          margin: 6px 0;
        }
        
        .role-badge {
          display: inline-block;
          background: ${colors.secondary}10;
          color: ${colors.secondary};
          padding: 6px 16px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Montserrat', sans-serif;
          margin: 8px 0;
        }
        
        .message-box {
          background: ${colors.neutralVariant}40;
          border-left: 4px solid ${colors.tertiary};
          padding: 16px 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .email-footer {
          padding: 32px 24px;
          background: ${colors.neutralVariant}20;
          text-align: center;
          border-top: 1px solid ${colors.borderLight};
        }
        
        .social-links {
          margin: 0 0 20px 0;
        }
        
        .social-link {
          display: inline-block;
          padding: 6px 12px;
          margin: 0 6px;
          color: ${colors.primary};
          text-decoration: none;
          font-size: 12px;
          font-family: 'Montserrat', sans-serif;
          border: 1px solid ${colors.borderLight};
          border-radius: 6px;
        }
        
        .footer-links {
          margin: 16px 0;
        }
        
        .footer-links a {
          color: ${colors.textSecondary};
          text-decoration: none;
          margin: 0 10px;
          font-size: 12px;
          font-family: 'Montserrat', sans-serif;
        }
        
        .copyright {
          font-size: 11px;
          color: ${colors.textHint};
          font-family: 'Merriweather', serif;
        }
        
        @media screen and (max-width: 600px) {
          .email-header { padding: 24px 20px; }
          .email-content { padding: 32px 20px; }
          h1 { font-size: 24px; }
          .button { display: block; text-align: center; }
          .logo-image { max-width: 160px; }
        }
      </style>
    </head>
    <body style="background-color: ${colors.background}; padding: 16px;"> 
      <div class="email-wrapper">
        <div class="email-header">
          <div class="logo-container">
            <img 
              src="https://pivotaconnect.com/logofinaletransparent.png" 
              alt="PivotaConnect" 
              class="logo-image"
            /> 
          </div> 
        </div>
        <div class="email-content">${content}</div>
        <div class="email-footer">
          <div class="social-links">
            <a href="${social.twitter}" class="social-link">Twitter</a>
            <a href="${social.linkedin}" class="social-link">LinkedIn</a>
            <a href="${social.facebook}" class="social-link">Facebook</a>
            <a href="${social.instagram}" class="social-link">Instagram</a>
            <a href="${social.website}" class="social-link">Website</a>
          </div>
          <div class="footer-links">
            <a href="${social.website}/about">About</a>
            <a href="${social.website}/help">Help</a>
            <a href="${social.website}/terms">Terms</a>
            <a href="${social.website}/privacy">Privacy</a>
          </div>
          <div class="copyright">
            © ${new Date().getFullYear()} PivotaConnect. All rights reserved.
          </div>
        </div>
      </div> 
    </body>
    </html>
  `;
};