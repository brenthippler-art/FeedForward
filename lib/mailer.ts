import nodemailer, { type Transporter } from 'nodemailer';

// Created on first use, then reused for every email after that
let transporter: Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP_USER and SMTP_PASS must be set on the server.');
  }
  transporter ??= nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendMail({ subject, text }: { subject: string; text: string }) {
  await getTransporter().sendMail({
    from: `FeedForward Surveys <${process.env.SMTP_USER}>`,
    to: process.env.SURVEY_TO ?? process.env.SMTP_USER,
    subject,
    text,
  });
}