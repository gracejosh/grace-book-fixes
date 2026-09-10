import { motion } from 'framer-motion';
import { Shield, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const APP_NAME = 'Grace Volume 7';
const DEVELOPER = 'Addis Power';
const CONTACT_EMAIL = 'graceapp@proton.me';

const sections = [
  {
    title: '1. Information We Collect',
    body: `When you create an account, we collect your email address, username, and any profile information you choose to provide (such as a display name and avatar). When you use community features, we collect the content you post, including messages and uploaded files.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to provide and improve the App's features, to display your profile and content to other users in community areas, to send important account notifications, and to maintain a safe and respectful environment.`,
  },
  {
    title: '3. Data Storage',
    body: `Your data is stored securely using Supabase, a trusted database provider. Passwords are hashed and never stored in plain text. We do not sell or rent your personal information to third parties.`,
  },
  {
    title: '4. Visibility of Your Information',
    body: `Your username and avatar are visible to other users in community features such as chat and posts. Your email address and account details are private and are not shown to other users.`,
  },
  {
    title: '5. Cookies and Local Storage',
    body: `The App uses local storage to remember your language preference, theme selection, and login session. We do not use tracking cookies for advertising.`,
  },
  {
    title: '6. Third-Party Services',
    body: `${APP_NAME} uses third-party services for database hosting, live video, and file storage. These providers may process data in accordance with their own privacy policies. We only share data necessary for the App to function.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.`,
  },
  {
    title: '8. Children\'s Privacy',
    body: `The App is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us for removal.`,
  },
  {
    title: '9. Your Rights',
    body: `You have the right to access, correct, or delete your personal data. You can update your profile information within the App or contact us for assistance with data deletion.`,
  },
  {
    title: '10. Security',
    body: `We implement appropriate technical and organizational measures to protect your data. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.`,
  },
  {
    title: '11. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the updated policy within the App.`,
  },
  {
    title: '12. Contact',
    body: `For privacy questions or requests, contact us at ${CONTACT_EMAIL}.`,
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 dark:from-slate-950 dark:via-primary-950 dark:to-slate-950 py-14">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-72 h-72 bg-gold-500 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-20 w-72 h-72 bg-primary-500 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 mb-5 mx-auto">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-white/70">Last updated: September 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="max-w-2xl mx-auto">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="mb-8"
            >
              <h2 className="text-lg font-bold mb-2 text-primary-700 dark:text-primary-300">{section.title}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{section.body}</p>
            </motion.div>
          ))}

          {/* Contact card */}
          <div className="glass-card p-5 mt-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-gold-500">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Privacy Questions?</p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/terms" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              View Terms of Use &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
