/**
 * Translation catalog for MeO UI strings.
 *
 * Flat-dotted keys: group.subgroup.string. Unknown keys fall back to the
 * English entry, and a missing English entry falls back to the key string
 * itself — so the app never shows raw keys to users even if a translation
 * is missed.
 *
 * Keep entries in alphabetical order within each group so diffs stay
 * focused. Values can include `{placeholder}` tokens that the caller
 * fills via the hook's second arg: t('chat.delete_confirm', { title: '…' }).
 *
 * Scope for this pass — high-visibility chrome: sidebar navigation,
 * chat input, language/voice affordances, delete confirm, toast copy.
 * Deep corners (admin, personalize form validation, pricing page copy)
 * still read in English for now and will migrate in follow-up passes.
 */

export type Messages = Record<string, string>;

export const translations: Record<'en' | 'ar' | 'hi' | 'nl', Messages> = {
  en: {
    'sidebar.new_chat': 'New chat',
    'sidebar.chats': 'Chats',
    'sidebar.empty_chats': 'No chats yet. Start a new one.',
    'sidebar.personalize': 'Personalize',
    'sidebar.activity': 'Activity',
    'sidebar.settings': 'Settings & help',
    'sidebar.delete_chat_aria': 'Delete chat',
    'chat.limited_preview': 'Limited Preview',
    'chat.placeholder_landing': 'Message MeO…',
    'chat.placeholder_followup': 'Ask a follow-up…',
    'chat.thinking_live': 'Thinking…',
    'chat.reasoning_complete': 'Reasoning complete',
    'chat.thought_for': 'Thought for {seconds}s · {count} steps',
    'chat.delete_confirm': 'Delete "{title}"?',
    'chat.delete_success': 'Deleted "{title}"',
    'chat.delete_default_success': 'Chat deleted',
    'chat.delete_failure': "Couldn't delete chat — restored it to the list.",
    'voice.start': 'Start voice input',
    'voice.stop': 'Stop voice input',
    'voice.listening': 'Listening in {language}…',
    'voice.unsupported': 'Voice input is not supported in this browser. Try Chrome, Edge, or Safari.',
    'voice.needs_https': 'Voice input requires a secure connection (HTTPS).',
    'voice.permission_denied': 'Microphone permission denied. Enable it in your browser site settings.',
    'voice.no_mic': 'No microphone found on this device.',
    'voice.network_required': 'Voice input needs an internet connection.',
    'auth.session_expired': 'Session expired — redirecting to sign in',
    'auth.log_out': 'Log out',
  },
  ar: {
    'sidebar.new_chat': 'محادثة جديدة',
    'sidebar.chats': 'المحادثات',
    'sidebar.empty_chats': 'لا توجد محادثات بعد. ابدأ محادثة جديدة.',
    'sidebar.personalize': 'التخصيص',
    'sidebar.activity': 'النشاط',
    'sidebar.settings': 'الإعدادات والمساعدة',
    'sidebar.delete_chat_aria': 'حذف المحادثة',
    'chat.limited_preview': 'إصدار تجريبي',
    'chat.placeholder_landing': 'اسأل MeO…',
    'chat.placeholder_followup': 'اطرح سؤالاً متابعاً…',
    'chat.thinking_live': 'جارٍ التفكير…',
    'chat.reasoning_complete': 'اكتمل التفكير',
    'chat.thought_for': 'تم التفكير لمدة {seconds} ثانية · {count} خطوات',
    'chat.delete_confirm': 'حذف "{title}"؟',
    'chat.delete_success': 'تم حذف "{title}"',
    'chat.delete_default_success': 'تم حذف المحادثة',
    'chat.delete_failure': 'تعذّر حذف المحادثة — تم استعادتها إلى القائمة.',
    'voice.start': 'بدء الإدخال الصوتي',
    'voice.stop': 'إيقاف الإدخال الصوتي',
    'voice.listening': 'أستمع بلغة {language}…',
    'voice.unsupported': 'الإدخال الصوتي غير مدعوم في هذا المتصفح. جرّب Chrome أو Edge أو Safari.',
    'voice.needs_https': 'يتطلب الإدخال الصوتي اتصالاً آمناً (HTTPS).',
    'voice.permission_denied': 'تم رفض إذن الميكروفون. فعّله من إعدادات الموقع في المتصفح.',
    'voice.no_mic': 'لم يتم العثور على ميكروفون في هذا الجهاز.',
    'voice.network_required': 'يتطلب الإدخال الصوتي اتصالاً بالإنترنت.',
    'auth.session_expired': 'انتهت الجلسة — جارٍ التحويل لتسجيل الدخول',
    'auth.log_out': 'تسجيل الخروج',
  },
  hi: {
    'sidebar.new_chat': 'नई चैट',
    'sidebar.chats': 'चैट्स',
    'sidebar.empty_chats': 'अभी तक कोई चैट नहीं। एक नई शुरू करें।',
    'sidebar.personalize': 'वैयक्तिकृत करें',
    'sidebar.activity': 'गतिविधि',
    'sidebar.settings': 'सेटिंग्स और सहायता',
    'sidebar.delete_chat_aria': 'चैट हटाएँ',
    'chat.limited_preview': 'सीमित पूर्वावलोकन',
    'chat.placeholder_landing': 'MeO से पूछें…',
    'chat.placeholder_followup': 'अगला प्रश्न पूछें…',
    'chat.thinking_live': 'सोच रहा हूँ…',
    'chat.reasoning_complete': 'विचार पूरा',
    'chat.thought_for': '{seconds} सेकंड सोचा · {count} चरण',
    'chat.delete_confirm': 'क्या "{title}" हटाना है?',
    'chat.delete_success': '"{title}" हटाया गया',
    'chat.delete_default_success': 'चैट हटाई गई',
    'chat.delete_failure': 'चैट हटाने में विफल — सूची में पुनर्स्थापित कर दी गई है।',
    'voice.start': 'वॉइस इनपुट शुरू करें',
    'voice.stop': 'वॉइस इनपुट रोकें',
    'voice.listening': '{language} में सुन रहा हूँ…',
    'voice.unsupported': 'यह ब्राउज़र वॉइस इनपुट का समर्थन नहीं करता। Chrome, Edge या Safari आज़माएँ।',
    'voice.needs_https': 'वॉइस इनपुट के लिए सुरक्षित कनेक्शन (HTTPS) आवश्यक है।',
    'voice.permission_denied': 'माइक्रोफ़ोन की अनुमति अस्वीकृत। ब्राउज़र की साइट सेटिंग्स में इसे सक्षम करें।',
    'voice.no_mic': 'इस डिवाइस पर कोई माइक्रोफ़ोन नहीं मिला।',
    'voice.network_required': 'वॉइस इनपुट के लिए इंटरनेट कनेक्शन आवश्यक है।',
    'auth.session_expired': 'सत्र समाप्त हो गया — साइन इन के लिए रीडायरेक्ट हो रहा है',
    'auth.log_out': 'लॉग आउट',
  },
  nl: {
    'sidebar.new_chat': 'Nieuwe chat',
    'sidebar.chats': 'Chats',
    'sidebar.empty_chats': 'Nog geen chats. Begin een nieuwe.',
    'sidebar.personalize': 'Personaliseren',
    'sidebar.activity': 'Activiteit',
    'sidebar.settings': 'Instellingen en hulp',
    'sidebar.delete_chat_aria': 'Chat verwijderen',
    'chat.limited_preview': 'Beperkte voorvertoning',
    'chat.placeholder_landing': 'Stel MeO een vraag…',
    'chat.placeholder_followup': 'Stel een vervolgvraag…',
    'chat.thinking_live': 'Aan het nadenken…',
    'chat.reasoning_complete': 'Redenering voltooid',
    'chat.thought_for': 'Nagedacht voor {seconds}s · {count} stappen',
    'chat.delete_confirm': '"{title}" verwijderen?',
    'chat.delete_success': '"{title}" verwijderd',
    'chat.delete_default_success': 'Chat verwijderd',
    'chat.delete_failure': 'Kon chat niet verwijderen — teruggezet in de lijst.',
    'voice.start': 'Spraakinvoer starten',
    'voice.stop': 'Spraakinvoer stoppen',
    'voice.listening': 'Aan het luisteren in het {language}…',
    'voice.unsupported': 'Spraakinvoer wordt niet ondersteund in deze browser. Probeer Chrome, Edge of Safari.',
    'voice.needs_https': 'Spraakinvoer vereist een beveiligde verbinding (HTTPS).',
    'voice.permission_denied': 'Microfoontoestemming geweigerd. Activeer het in de site-instellingen van je browser.',
    'voice.no_mic': 'Geen microfoon gevonden op dit apparaat.',
    'voice.network_required': 'Spraakinvoer heeft een internetverbinding nodig.',
    'auth.session_expired': 'Sessie verlopen — wordt doorgestuurd naar aanmelden',
    'auth.log_out': 'Uitloggen',
  },
};

/**
 * Substitute {placeholder} tokens in a translated string. Tokens not
 * provided in `vars` are left untouched so bugs are visible in the UI
 * rather than silently hidden as empty strings.
 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}
