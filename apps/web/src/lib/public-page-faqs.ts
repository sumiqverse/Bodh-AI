import type { FaqItem } from './seo';

export const PUBLIC_FAQ_PATHS = [
  'about',
  'for-students',
  'for-teachers',
  'for-schools',
  'how-it-works',
  'languages-offline',
  'privacy-safety',
  'contact',
] as const;

export type PublicFaqPath = (typeof PUBLIC_FAQ_PATHS)[number];

type Locale = 'en' | 'hi';

const FAQS: Record<PublicFaqPath, Record<Locale, readonly FaqItem[]>> = {
  about: {
    en: [
      {
        question: "What is BodhAI's mission?",
        answer:
          'BodhAI aims to make mastery-based learning practical for Classes 6–10 in India. It combines diagnostic checks, bilingual explanations, guided practice, and progress insights for students and teachers.',
      },
      {
        question: 'Who is BodhAI designed for?',
        answer:
          'BodhAI is designed for students in Classes 6–10, teachers who need classwide learning insights, and schools looking for a bilingual, low-connectivity-friendly learning platform.',
      },
      {
        question: 'Where can I learn about student privacy?',
        answer:
          'The Privacy & Safety page explains BodhAI’s principles for data minimisation, guardian consent, and student data protection. The draft privacy policy contains the current statutory disclosures.',
      },
    ],
    hi: [
      {
        question: 'बोधAI का उद्देश्य क्या है?',
        answer:
          'बोधAI का उद्देश्य भारत में कक्षा 6–10 के विद्यार्थियों के लिए महारत-आधारित सीखने को व्यावहारिक बनाना है। यह निदान, द्विभाषी व्याख्या, संकेत-सहित अभ्यास और शिक्षकों के लिए प्रगति-अंतर्दृष्टि को जोड़ता है।',
      },
      {
        question: 'बोधAI किनके लिए है?',
        answer:
          'बोधAI कक्षा 6–10 के विद्यार्थियों, कक्षा-स्तरीय सीखने की जानकारी चाहने वाले शिक्षकों और द्विभाषी, कम कनेक्टिविटी वाले वातावरण के लिए उपयुक्त शिक्षण मंच चाहने वाले विद्यालयों के लिए है।',
      },
      {
        question: 'विद्यार्थी गोपनीयता के बारे में कहाँ पढ़ें?',
        answer:
          'गोपनीयता एवं सुरक्षा पृष्ठ पर डेटा न्यूनतमकरण, अभिभावक सहमति और विद्यार्थी डेटा संरक्षण के सिद्धांत दिए गए हैं। वर्तमान कानूनी विवरण मसौदा गोपनीयता नीति में हैं।',
      },
    ],
  },
  'for-students': {
    en: [
      {
        question: 'Which classes and subjects are covered?',
        answer:
          'BodhAI supports Classes 6 to 10 with NCERT-aligned practice in Mathematics, Science, Social Science, English, and Hindi.',
      },
      {
        question: 'How does adaptive practice work?',
        answer:
          'A short diagnostic maps prerequisite gaps. BodhAI then explains the concept, offers three levels of hints, and checks mastery before choosing the next activity.',
      },
      {
        question: 'Can I study in Hindi or offline?',
        answer:
          'Yes. Learning content is available in English and Hindi, and supported chapter packs can be downloaded for offline practice. Progress syncs when the connection returns.',
      },
    ],
    hi: [
      {
        question: 'कौन-सी कक्षाएँ और विषय उपलब्ध हैं?',
        answer:
          'बोधAI कक्षा 6 से 10 तक गणित, विज्ञान, सामाजिक विज्ञान, अंग्रेज़ी और हिन्दी में NCERT-संरेखित अभ्यास उपलब्ध कराता है।',
      },
      {
        question: 'अनुकूली अभ्यास कैसे काम करता है?',
        answer:
          'एक छोटा निदान पहले की अवधारणाओं की कमियाँ पहचानता है। फिर बोधAI अवधारणा समझाता है, तीन स्तर के संकेत देता है और अगली गतिविधि तय करने से पहले महारत जाँचता है।',
      },
      {
        question: 'क्या हिन्दी में या ऑफ़लाइन पढ़ाई हो सकती है?',
        answer:
          'हाँ। सामग्री अंग्रेज़ी और हिन्दी में है, और समर्थित अध्याय पैक ऑफ़लाइन अभ्यास के लिए डाउनलोड किए जा सकते हैं। कनेक्शन लौटने पर प्रगति सिंक हो जाती है।',
      },
    ],
  },
  'for-teachers': {
    en: [
      {
        question: 'What can teachers see in BodhAI?',
        answer:
          'Teachers can review classwide gaps, individual progress, hint use, and mastery against curriculum skills, then plan targeted practice.',
      },
      {
        question: 'Does BodhAI replace teacher judgement?',
        answer:
          'No. BodhAI provides formative evidence and suggested next steps; teachers remain responsible for classroom decisions and student support.',
      },
      {
        question: 'How can a teacher get started?',
        answer:
          'Teachers can join through their school’s BodhAI setup or contact the team to discuss classes, subjects, and onboarding.',
      },
    ],
    hi: [
      {
        question: 'शिक्षक बोधAI में क्या देख सकते हैं?',
        answer:
          'शिक्षक कक्षा-स्तरीय कमियाँ, प्रत्येक विद्यार्थी की प्रगति, संकेतों का उपयोग और पाठ्यक्रम कौशलों पर महारत देखकर लक्षित अभ्यास की योजना बना सकते हैं।',
      },
      {
        question: 'क्या बोधAI शिक्षक के निर्णय की जगह लेता है?',
        answer:
          'नहीं। बोधAI रचनात्मक मूल्यांकन की जानकारी और अगले कदम के सुझाव देता है; कक्षा के निर्णय और विद्यार्थी सहायता की जिम्मेदारी शिक्षक के पास रहती है।',
      },
      {
        question: 'शिक्षक शुरुआत कैसे करें?',
        answer:
          'शिक्षक अपने विद्यालय के बोधAI सेटअप से जुड़ सकते हैं या कक्षाओं, विषयों और ऑनबोर्डिंग पर चर्चा के लिए टीम से संपर्क कर सकते हैं।',
      },
    ],
  },
  'for-schools': {
    en: [
      {
        question: 'How does a school pilot BodhAI?',
        answer:
          'Contact the team with the classes, subjects, and number of students you want to include. BodhAI will help scope a pilot and an onboarding plan.',
      },
      {
        question: 'What devices and connectivity are needed?',
        answer:
          'BodhAI runs in a modern browser. Supported chapter packs can be used offline, which helps school labs and homes with intermittent connectivity.',
      },
      {
        question: 'How is student data governed?',
        answer:
          'BodhAI is designed around guardian consent, data minimisation, and role-based access. Student learning data is not used for commercial advertising.',
      },
    ],
    hi: [
      {
        question: 'विद्यालय बोधAI का पायलट कैसे शुरू करें?',
        answer:
          'टीम को कक्षाओं, विषयों और विद्यार्थियों की संख्या बताएं। बोधAI पायलट का दायरा और ऑनबोर्डिंग योजना तैयार करने में सहायता करेगा।',
      },
      {
        question: 'कौन-से उपकरण और कनेक्टिविटी चाहिए?',
        answer:
          'बोधAI आधुनिक ब्राउज़र में चलता है। समर्थित अध्याय पैक ऑफ़लाइन उपयोग हो सकते हैं, जिससे कम कनेक्टिविटी वाले स्कूल लैब और घरों में सहायता मिलती है।',
      },
      {
        question: 'विद्यार्थी डेटा कैसे नियंत्रित होता है?',
        answer:
          'बोधAI अभिभावक सहमति, डेटा न्यूनतमकरण और भूमिका-आधारित पहुँच पर बना है। विद्यार्थी सीखने के डेटा का उपयोग वाणिज्यिक विज्ञापन के लिए नहीं किया जाता।',
      },
    ],
  },
  'how-it-works': {
    en: [
      {
        question: 'What does the diagnostic measure?',
        answer:
          'A short adaptive check looks for prerequisite gaps behind the current topic, not just a single score.',
      },
      {
        question: 'How do Socratic hints work?',
        answer:
          'Hints move from a small nudge to a focused explanation and then to worked reasoning, so students can recover without immediately being shown the answer.',
      },
      {
        question: 'What decides the next activity?',
        answer:
          'The next activity responds to mastery-check performance, hint use, and the prerequisite skill that needs the most support. Teachers can also assign targeted practice.',
      },
    ],
    hi: [
      {
        question: 'निदान में क्या मापा जाता है?',
        answer:
          'छोटा अनुकूली निदान वर्तमान विषय के पीछे की पूर्व-आवश्यक अवधारणाओं की कमियाँ खोजता है, केवल एक अंक नहीं।',
      },
      {
        question: 'सोक्रेटिक संकेत कैसे काम करते हैं?',
        answer:
          'संकेत पहले छोटा इशारा देते हैं, फिर केंद्रित व्याख्या और फिर क्रमबद्ध तर्क तक बढ़ते हैं, ताकि विद्यार्थी उत्तर सीधे देखे बिना आगे बढ़ सके।',
      },
      {
        question: 'अगली गतिविधि कैसे तय होती है?',
        answer:
          'अगली गतिविधि महारत जाँच, संकेतों के उपयोग और सबसे अधिक सहायता चाहने वाली पूर्व-आवश्यकता के आधार पर चुनी जाती है। शिक्षक लक्षित अभ्यास भी दे सकते हैं।',
      },
    ],
  },
  'languages-offline': {
    en: [
      {
        question: 'Which languages does BodhAI support?',
        answer:
          'The learning experience is available in English and Hindi, with concept explanations, practice, and key interface text in both languages.',
      },
      {
        question: 'What can be downloaded for offline use?',
        answer:
          'Supported chapter practice packs and concept notes can be downloaded before class. Available packs are shown in the app.',
      },
      {
        question: 'How does offline progress sync?',
        answer:
          'Practice is stored locally on the device and synced when connectivity returns. The synced account record remains the source of truth.',
      },
    ],
    hi: [
      {
        question: 'बोधAI किन भाषाओं में उपलब्ध है?',
        answer:
          'सीखने का अनुभव अंग्रेज़ी और हिन्दी में उपलब्ध है; अवधारणाओं की व्याख्या, अभ्यास और मुख्य इंटरफ़ेस दोनों भाषाओं में हैं।',
      },
      {
        question: 'ऑफ़लाइन के लिए क्या डाउनलोड किया जा सकता है?',
        answer:
          'समर्थित अध्याय अभ्यास पैक और अवधारणा नोट्स कक्षा से पहले डाउनलोड किए जा सकते हैं। उपलब्ध पैक ऐप में दिखाए जाते हैं।',
      },
      {
        question: 'ऑफ़लाइन प्रगति सिंक कैसे होती है?',
        answer:
          'अभ्यास डिवाइस पर स्थानीय रूप से सुरक्षित रहता है और कनेक्शन लौटने पर सिंक होता है। सिंक किया गया खाता रिकॉर्ड अंतिम स्रोत रहता है।',
      },
    ],
  },
  'privacy-safety': {
    en: [
      {
        question: 'What student data does BodhAI use?',
        answer:
          'BodhAI uses account and class details, learning activity, and consent records to deliver and improve the learning experience. Collection is limited to those purposes.',
      },
      {
        question: 'Is student data used for advertising?',
        answer: 'No. BodhAI does not use commercial advertising trackers or sell student data.',
      },
      {
        question: "Who can see a student's progress?",
        answer:
          'Access is role-based: students can see their own progress, and authorised teachers or guardians can see the information needed to support learning.',
      },
    ],
    hi: [
      {
        question: 'बोधAI कौन-सा विद्यार्थी डेटा उपयोग करता है?',
        answer:
          'बोधAI खाते और कक्षा का विवरण, सीखने की गतिविधि और सहमति रिकॉर्ड का उपयोग सीखने का अनुभव देने और सुधारने के लिए करता है। संग्रह इन्हीं उद्देश्यों तक सीमित है।',
      },
      {
        question: 'क्या विद्यार्थी डेटा विज्ञापन के लिए उपयोग होता है?',
        answer:
          'नहीं। बोधAI वाणिज्यिक विज्ञापन ट्रैकर उपयोग नहीं करता और विद्यार्थी डेटा नहीं बेचता।',
      },
      {
        question: 'विद्यार्थी की प्रगति कौन देख सकता है?',
        answer:
          'पहुँच भूमिका-आधारित है: विद्यार्थी अपनी प्रगति देख सकता है, और सीखने में सहायता के लिए अधिकृत शिक्षक या अभिभावक आवश्यक जानकारी देख सकते हैं।',
      },
    ],
  },
  contact: {
    en: [
      {
        question: 'What should I include in a school enquiry?',
        answer:
          'Include your name, role, school or organization, city, classes and subjects of interest, and the outcome you want to explore.',
      },
      {
        question: 'Can I ask about privacy or safeguarding?',
        answer:
          'Yes. Use the contact form and mention privacy or safeguarding so the message reaches the right person.',
      },
      {
        question: 'Is support available in Hindi?',
        answer:
          'The BodhAI team can respond in English or Hindi. Include your preferred language in the message.',
      },
    ],
    hi: [
      {
        question: 'विद्यालय पूछताछ में क्या शामिल करें?',
        answer:
          'अपना नाम, भूमिका, विद्यालय या संस्था, शहर, रुचि की कक्षाएँ और विषय तथा वह परिणाम बताएं जिसे आप जानना चाहते हैं।',
      },
      {
        question: 'क्या गोपनीयता या बाल सुरक्षा के बारे में पूछ सकते हैं?',
        answer:
          'हाँ। संपर्क फ़ॉर्म में गोपनीयता या बाल सुरक्षा का उल्लेख करें ताकि संदेश सही व्यक्ति तक पहुँचे।',
      },
      {
        question: 'क्या सहायता हिन्दी में उपलब्ध है?',
        answer:
          'बोधAI टीम अंग्रेज़ी या हिन्दी में उत्तर दे सकती है। अपने संदेश में पसंदीदा भाषा लिखें।',
      },
    ],
  },
};

export function getPublicPageFaqs(locale: string, path: string): readonly FaqItem[] {
  const key = path.replace(/^\/+|\/+$/g, '') as PublicFaqPath;
  const entry = FAQS[key];
  if (!entry) return [];
  return entry[locale === 'hi' ? 'hi' : 'en'];
}
