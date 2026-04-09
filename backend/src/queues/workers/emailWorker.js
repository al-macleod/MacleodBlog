const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { getRedisConnection } = require('../connection');

const buildTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: parseInt(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    from: SMTP_FROM || SMTP_USER
  });
};

const send = async (transporter, { to, subject, html }) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, html });
};

// Strip newlines and carriage returns to prevent email header injection
const sanitizeHeaderValue = (value = '') => String(value).replace(/[\r\n]+/g, ' ').trim();

const templates = {
  'new-comment': ({ postAuthorName, commenterName, postTitle, postSlug, commentContent }) => ({
    subject: `New comment on your post: ${sanitizeHeaderValue(postTitle)}`,
    html: `
      <p>Hi ${postAuthorName},</p>
      <p><strong>${commenterName}</strong> commented on your post
         <a href="${process.env.SITE_URL || ''}/post/${postSlug}">${postTitle}</a>:</p>
      <blockquote>${commentContent}</blockquote>
      <p>Log in to approve or reply.</p>
    `
  }),

  mention: ({ mentionedUserName, mentionerName, postTitle, postSlug }) => ({
    subject: `${sanitizeHeaderValue(mentionerName)} mentioned you in "${sanitizeHeaderValue(postTitle)}"`,
    html: `
      <p>Hi ${mentionedUserName},</p>
      <p><strong>${mentionerName}</strong> mentioned you in the post
         <a href="${process.env.SITE_URL || ''}/post/${postSlug}">${postTitle}</a>.</p>
    `
  }),

  'new-follower': ({ targetUserName, followerName }) => ({
    subject: `${sanitizeHeaderValue(followerName)} started following you`,
    html: `
      <p>Hi ${targetUserName},</p>
      <p><strong>${followerName}</strong> started following you on BuzzForge.</p>
    `
  }),

  'analytics-digest': ({ period, stats }) => ({
    subject: `BuzzForge ${sanitizeHeaderValue(period)} analytics digest`,
    html: `
      <h2>BuzzForge ${period} analytics digest</h2>
      <table>
        <tr><td>Total posts</td><td>${stats.totalPosts}</td></tr>
        <tr><td>Total views</td><td>${stats.totalViews}</td></tr>
        <tr><td>Total likes</td><td>${stats.totalLikes}</td></tr>
        <tr><td>Total comments</td><td>${stats.totalComments}</td></tr>
        <tr><td>New posts</td><td>${stats.newPosts}</td></tr>
      </table>
    `
  })
};

const processEmailJob = async (job) => {
  const transporter = buildTransporter();

  if (!transporter) {
    console.warn('Email worker: SMTP not configured, skipping job', job.name);
    return;
  }

  const { to, ...templateData } = job.data;

  const template = templates[job.name];
  if (!template) {
    console.warn('Email worker: unknown job name', job.name);
    return;
  }

  const { subject, html } = template(templateData);
  await send(transporter, { to, subject, html });
  console.log(`Email worker: sent "${job.name}" to ${to}`);
};

const createEmailWorker = () => new Worker('email', processEmailJob, {
  connection: getRedisConnection(),
  concurrency: 5
});

module.exports = { createEmailWorker };
