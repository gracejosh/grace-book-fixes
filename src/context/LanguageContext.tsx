import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'en' | 'am';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const translations: Record<string, { en: string; am: string }> = {
  'nav.home': { en: 'Home', am: 'ቤት' },
  'nav.verses': { en: 'Verses', am: 'የመጽሐፍ ቅዱስ ጥቅሶች' },
  'nav.posts': { en: 'Posts', am: 'ልጥፎች' },
  'nav.books': { en: 'Books', am: 'መጻሕፍት' },
  'nav.courses': { en: 'Courses', am: 'ኮርሶች' },
  'nav.quiz': { en: 'Quiz', am: 'ጥያቄዎች' },
  'nav.chat': { en: 'Chat', am: 'ውይይት' },
  'nav.profile': { en: 'Profile', am: 'መገለጫ' },
  'nav.admin': { en: 'Admin', am: 'አስተዳደር' },
  'nav.about': { en: 'About', am: 'ስለ እኛ' },
  'nav.signIn': { en: 'Sign In', am: 'ግባ' },
  'common.search': { en: 'Search', am: 'ፈልግ' },
  'common.download': { en: 'Download', am: 'አውርድ' },
  'common.share': { en: 'Share', am: 'አጋራ' },
  'common.save': { en: 'Save', am: 'አስቀምጥ' },
  'common.edit': { en: 'Edit', am: 'አስተካክል' },
  'common.delete': { en: 'Delete', am: 'አጥፋ' },
  'common.cancel': { en: 'Cancel', am: 'ይቅር' },
  'common.loading': { en: 'Loading...', am: 'በመጫን ላይ...' },
  'common.welcome': { en: 'Welcome', am: 'እንኳን ደህና መጡ' },
  'common.viewAll': { en: 'View All', am: 'ሁሉንም ይመልከቱ' },
  'common.readMore': { en: 'Read More', am: 'ተጨማሪ ያንብቡ' },
  'common.get': { en: 'Get', am: 'አግኝ' },
  'common.preview': { en: 'Preview', am: 'ቅድመ-እይታ' },
  'common.start': { en: 'Start', am: 'ጀምር' },
  'common.retry': { en: 'Retry', am: 'እንደገና ሞክር' },
  'common.send': { en: 'Send', am: 'ላክ' },
  'common.submit': { en: 'Submit', am: 'አስገባ' },
  'common.logout': { en: 'Logout', am: 'ውጣ' },
  'common.login': { en: 'Login', am: 'ግባ' },
  'common.signup': { en: 'Sign Up', am: 'ተመዝገብ' },
  'common.back': { en: 'Back', am: 'ተመለስ' },
  'home.tagline': { en: 'Your Faith, Beautifully Nourished', am: 'እምነትህ በቆንጆ ሁኔታ የተመገበ' },
  'home.heroTitle1': { en: 'Walk Closer With', am: 'ከእግዚአብሔር ጋር' },
  'home.heroTitle2': { en: 'God Every Day', am: 'በየቀኑ ቅርብ በል' },
  'home.heroDesc': { en: 'Grace Book brings together daily Bible verses, free Christian books, inspiring courses, engaging quizzes, and a global community — all in one beautiful place.', am: 'ጌስ ቡክ የዕለቱን የመጽሐፍ ቅዱስ ጥቅሶች፣ ነፃ የክርስትና መጻሕፍት፣ ምልምሎች፣ ጥያቄዎች እና ዓለም አቀፍ ማህበረሰብ — ሁሉም በአንድ ቆንጆ ቦታ ላይ ያቀራቅራል።' },
  'home.readVerse': { en: "Read Today's Verse", am: 'የዕለቱን ጥቅስ ያንብቡ' },
  'home.exploreCourses': { en: 'Explore Courses', am: 'ኮርሶችን ያስሱ' },
  'home.verseOfDay': { en: 'Verse of the Day', am: 'የዕለቱ ጥቅስ' },
  'home.moreVerses': { en: 'More verses', am: 'ተጨማሪ ጥቅሶች' },
  'home.stats.members': { en: 'Community Members', am: 'የማህበረሰብ አባላት' },
  'home.stats.books': { en: 'Free Books', am: 'ነፃ መጻሕፍት' },
  'home.stats.courses': { en: 'Video Courses', am: 'የቪዲዮ ኮርሶች' },
  'home.stats.quizzes': { en: 'Quiz Participants', am: 'የጥያቄ ተሳታፊዎች' },
  'home.exploreTitle': { en: 'Explore Grace Book', am: 'ጌስ ቡክን ያስሱ' },
  'home.exploreDesc': { en: 'Everything you need to deepen your faith journey, all in one place.', am: 'እምነትህን ለማጠንከር የሚያስፈልግህ ሁሉ፣ ሁሉም በአንድ ቦታ።' },
  'home.card.verses': { en: 'Bible Verses', am: 'የመጽሐፍ ቅዱስ ጥቅሶች' },
  'home.card.posts': { en: 'Community Posts', am: 'የማህበረሰብ ልጥፎች' },
  'home.card.postsDesc': { en: 'Share text, images, PDFs & audio', am: 'ጽሑፎች፣ ምስሎች፣ ፒዲኤፍ እና ድምፅ ያጋራ' },
  'home.card.versesDesc': { en: 'Daily inspiration from Scripture', am: 'ከመጽሐፍ ቅዱስ የዕለቱ ምክር' },
  'home.card.books': { en: 'Books Library', am: 'የመጻሕፍት ቤተ-መጻሕፍት' },
  'home.card.booksDesc': { en: 'Free Christian books to download', am: 'ለማውረድ ነፃ የክርስትና መጻሕፍት' },
  'home.card.courses': { en: 'Free Courses', am: 'ነፃ ኮርሶች' },
  'home.card.coursesDesc': { en: 'Learn and grow in your faith', am: 'ተማር እና በእምነትህ ያደጉ' },
  'home.card.quiz': { en: 'Quiz Challenge', am: 'የጥያቄ ተቋቋሚያ' },
  'home.card.quizDesc': { en: 'Test your biblical knowledge', am: 'የመጽሐፍ ቅዱስን እውቀትህን ይሞክሩ' },
  'home.card.chat': { en: 'Community', am: 'ማህበረሰብ' },
  'home.card.chatDesc': { en: 'Connect with believers worldwide', am: 'ከዓለም አቀፍ አማኞች ጋር ይገናኙ' },
  'home.card.about': { en: 'About Us', am: 'ስለ እኛ' },
  'home.card.aboutDesc': { en: 'Our mission and your support', am: 'ተልእካችን እና ድጋፍዎ' },
  'home.testimonialsTitle': { en: 'Loved by Believers Worldwide', am: 'በዓለም አቀፍ አማኞች የተወደደ' },
  'home.testimonialsDesc': { en: 'Real stories from our community', am: 'ከማህበረሰባችን እውነተኛ ታሪኮች' },
  'home.newsletterTitle': { en: 'Join Our Newsletter', am: 'ወደ ጋዜጣችን ይቀላቀሉ' },
  'home.newsletterDesc': { en: 'Get weekly Bible verses, new book releases, and course updates delivered to your inbox.', am: 'ሳምንታዊ የመጽሐፍ ቅዱስ ጥቅሶች፣ አዲስ የመጽሐፍ ቅዱስ መጻሕፍት እና የኮርስ ዜናዎች ወደ ኢሜይልዎ ይድረሱ።' },
  'home.subscribe': { en: 'Subscribe', am: 'ይመዝገቡ' },
  'home.subscribing': { en: 'Subscribing...', am: 'በመመዝገብ ላይ...' },
  'footer.tagline': { en: 'Your premium Christian faith companion. Daily Bible verses, free books, life-changing courses, engaging quizzes, and a global community of believers united in Christ.', am: 'የእርስዎ ቅርብ የክርስትና እምነት አጋር። የዕለቱ የመጽሐፍ ቅዱስ ጥቅሶች፣ ነፃ መጻሕፍት፣ ህይወት የለወጠ ኮርሶች፣ ጥያቄዎች እና በክርስቶስ የተዋሐደ ዓለም አቀፍ ማህበረሰብ።' },
  'footer.explore': { en: 'Explore', am: 'ያስሱ' },
  'footer.connect': { en: 'Connect', am: 'ይገናኙ' },
  'footer.bibleVerses': { en: 'Bible Verses', am: 'የመጽሐፍ ቅዱስ ጥቅሶች' },
  'footer.booksLibrary': { en: 'Books Library', am: 'የመጻሕፍት ቤተ-መጻሕፍት' },
  'footer.freeCourses': { en: 'Free Courses', am: 'ነፃ ኮርሶች' },
  'footer.quizChallenge': { en: 'Quiz Challenge', am: 'የጥያቄ ተቋቋሚያ' },
  'footer.communityChat': { en: 'Community Chat', am: 'የማህበረሰብ ውይይት' },
  'footer.aboutUs': { en: 'About Us', am: 'ስለ እኛ' },
  'footer.support': { en: 'Support & FAQ', am: 'ድጋፍ እና ጥያቄዎች' },
  'footer.contactUs': { en: 'Contact Us', am: 'አግኙን' },
  'footer.prayerRequests': { en: 'Prayer Requests', am: 'የጸሎት ጥያቄዎች' },
  'footer.rights': { en: 'All rights reserved.', am: 'ሁሉም መብቶች የተጠበቁ ናቸው።' },
  'footer.madeWith': { en: 'Made with', am: 'ተሰራ በ' },
  'footer.forKingdom': { en: 'for the Kingdom', am: 'ለመንግሥት' },
  'footer.developedBy': { en: 'Developed by Addis Power', am: 'በ Addis Power ተሰራ' },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem('grace-lang') as Language | null;
    return stored ?? 'en';
  });

  useEffect(() => {
    localStorage.setItem('grace-lang', lang);
    document.documentElement.lang = lang;
    document.body.classList.toggle('lang-am', lang === 'am');
  }, [lang]);

  const setLang = (l: Language) => setLangState(l);
  const toggleLang = () => setLangState((prev) => (prev === 'en' ? 'am' : 'en'));

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang];
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
