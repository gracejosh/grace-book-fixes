import { motion } from 'framer-motion';
import { FileText, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const APP_NAME = 'Grace Volume 7';
const DEVELOPER = 'Addis Power';
const CONTACT_EMAIL = 'graceapp@proton.me';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing and using ${APP_NAME} ("the App"), you accept and agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the App.`,
  },
  {
    title: '2. Use of the App',
    body: `${APP_NAME} is a Christian faith application providing Bible verses, books, courses, quizzes, community chat, and other faith-based resources. You agree to use the App only for lawful and respectful purposes. You may not use the App to share content that is hateful, offensive, misleading, or contrary to Christian values.`,
  },
  {
    title: '3. User Accounts',
    body: `Certain features of the App require a free account. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must be at least 13 years old to create an account.`,
  },
  {
    title: '4. User-Generated Content',
    body: `You retain ownership of content you post in community features such as chat and posts. By posting, you grant ${APP_NAME} a non-exclusive license to display and distribute your content within the App. You are solely responsible for your content and must not infringe the rights of others.`,
  },
  {
    title: '5. Intellectual Property',
    body: `The App, including its design, features, and curated content, is owned by ${DEVELOPER}. Bible verses are sourced from public domain or licensed translations. Books and courses are either original, licensed, or used with permission. You may not copy, redistribute, or repurpose App content without authorization.`,
  },
  {
    title: '6. Free Service',
    body: `${APP_NAME} is provided free of charge. We reserve the right to modify, suspend, or discontinue any feature at any time without prior notice.`,
  },
  {
    title: '7. Donations',
    body: `The App may accept voluntary donations to support its growth and maintenance. Donations are non-refundable unless required by applicable law.`,
  },
  {
    title: '8. Disclaimer of Warranties',
    body: `The App is provided "as is" without warranties of any kind. While we strive for accuracy in Biblical content, we do not guarantee that all information is error-free or complete.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `${DEVELOPER} shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App.`,
  },
  {
    title: '10. Changes to These Terms',
    body: `We may update these Terms from time to time. Continued use of the App after changes constitutes acceptance of the updated Terms.`,
  },
  {
    title: '11. Contact',
    body: `For questions about these Terms, contact us at ${CONTACT_EMAIL}.`,
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 dark:from-slate-950 dark:via-primary-950 dark:to-slate-950 py-14">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-72 h-72 bg-gold-500 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-20 w-72 h-72 bg-primary-500 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-5 mx-auto">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Terms of Use</h1>
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
                <p className="text-sm font-semibold">Questions?</p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/privacy" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              View Privacy Policy &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
