export type Category =
  | 'taxes'
  | 'insurance'
  | 'bank'
  | 'fines'
  | 'housing'
  | 'health'
  | 'employment'
  | 'legal'
  | 'other';

export type Status = 'new' | 'read' | 'done' | 'overdue';

export type Urgency = 'high' | 'medium' | 'low' | 'none';

export type Locale = 'fr' | 'en' | 'ru' | 'ar' | 'it' | 'de' | 'es' | 'pt' | 'tr' | 'zh';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Recommendation {
  type: 'website' | 'professional';
  title: string;
  description: string;
  url?: string;
  professionalType?: ProfessionalType;
}

export type DocType =
  | 'lease'
  | 'nda'
  | 'employment'
  | 'medical'
  | 'tax'
  | 'insurance'
  | 'court'
  | 'invoice'
  | 'academic'
  | 'other';

export interface RiskFlag {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  page?: number;
  recommendation?: string;
}

export interface PositivePoint {
  title: string;
  description: string;
}

export interface AnalysisResponse {
  document_title: string;
  category: Category;
  doc_type: DocType;
  doc_type_label?: string;
  document_country?: string;
  document_language?: string;
  confidence?: 'high' | 'medium' | 'low';
  summary?: string;
  what_is_this: string;
  what_it_says: string;
  what_to_do: string[];
  what_does_it_say?: string;
  deadline: string | null;
  deadline_description: string | null;
  urgency: Urgency;
  urgency_reason?: string | null;
  amounts: string[];
  health_score?: number;
  health_score_explanation?: string;
  risk_flags?: RiskFlag[];
  positive_points?: PositivePoint[];
  key_facts?: string[];
  suggested_questions?: string[];
  key_entities?: {
    parties?: string[];
    reference_numbers?: string[];
    organizations?: string[];
    addresses?: string[];
    dates?: string[];
    amounts?: string[];
    references?: string[];
  };
  entities?: {
    parties?: string[];
    dates?: string[];
    amounts?: string[];
    references?: string[];
  };
  related_documents?: string[];
  recommendations?: Recommendation[];
  specialist_type?: string;
  specialist_recommendation?: string;
}

export interface Document {
  id: string;
  createdAt: string;
  title: string;
  category: Category;
  docType?: DocType;
  docTypeLabel?: string;
  status: Status;
  summary?: string;
  whatIsThis: string;
  whatItSays: string;
  whatToDo: string[];
  deadline: string | null;
  deadlineDescription: string | null;
  urgency: Urgency;
  amounts: string[];
  healthScore?: number;
  healthScoreExplanation?: string;
  riskFlags?: RiskFlag[];
  positivePoints?: PositivePoint[];
  keyFacts?: string[];
  suggestedQuestions?: string[];
  imageData: string;
  fileUrl?: string;
  fileType?: string;
  pageCount?: number;
  rawText?: string;
  pageTexts?: Record<string, string>;
  chatHistory: ChatMessage[];
  language: string;
  recommendations?: Recommendation[];
  specialistType?: string;
  specialistRecommendation?: string;
}

export type ImmigrationStatus =
  | 'student'
  | 'work_permit'
  | 'residence_permit'
  | 'family_reunion'
  | 'tourist'
  | 'eu_citizen'
  | 'pending'
  | 'citizen';

export type CountryCode = 'FR' | 'DE' | 'IT' | 'ES' | 'GB' | 'NL' | 'BE' | 'CH' | 'AT' | 'PT' | 'RU' | 'TR' | 'MA' | 'AE' | 'SA' | 'CN' | 'OTHER';

export interface UserProfile {
  language: Locale;
  country: CountryCode;
  status: ImmigrationStatus;
}

export interface Settings {
  language: Locale;
  country: CountryCode;
  status: ImmigrationStatus;
  notifications: {
    sevenDays: boolean;
    oneDay: boolean;
    today: boolean;
  };
  scanCount: number;
}

export type ProfessionalType =
  | 'immigration_lawyer'
  | 'tax_lawyer'
  | 'labor_lawyer'
  | 'family_lawyer'
  | 'real_estate_lawyer'
  | 'accountant'
  | 'sworn_translator'
  | 'notary'
  | 'insurance_broker'
  | 'bank_advisor'
  | 'doctor'
  | 'social_worker'
  | 'realtor'
  | 'immigration_consultant'
  | 'hr_consultant'
  | 'customs_broker'
  | 'education_consultant';

export interface Professional {
  id: string;
  name: string;
  type: ProfessionalType;
  specialties: string[];
  languages: string[];
  country: string;
  region: string;
  city: string;
  phone?: string;
  email?: string;
  website?: string;
  rating: number;
  recommended: boolean;
  description: Record<string, string>;
  availableOnline: boolean;
  priceRange?: string;
}

export const PROFESSIONAL_ICONS: Record<string, string> = {
  immigration_lawyer: '\u2696\ufe0f',
  tax_lawyer: '\u2696\ufe0f',
  labor_lawyer: '\u2696\ufe0f',
  family_lawyer: '\u2696\ufe0f',
  real_estate_lawyer: '\u2696\ufe0f',
  accountant: '\ud83d\udcbc',
  sworn_translator: '\ud83c\udf10',
  notary: '\ud83d\udcdc',
  insurance_broker: '\ud83d\udee1\ufe0f',
  bank_advisor: '\ud83c\udfe6',
  doctor: '\ud83e\ude7a',
  social_worker: '\ud83e\udd1d',
  realtor: '\ud83c\udfe0',
  immigration_consultant: '\ud83c\udf0d',
  hr_consultant: '\ud83d\udc65',
  customs_broker: '\ud83d\udce6',
  education_consultant: '\ud83c\udf93',
};

export interface BatchSummary {
  totalDocuments: number;
  byCategory: Record<string, number>;
  urgentDeadlines: { title: string; deadline: string; urgency: string }[];
  totalToPay: string;
  totalToReceive: string;
  aiRecommendation: string;
}

export const COUNTRY_FLAGS: Record<CountryCode, string> = {
  FR: '\ud83c\uddeb\ud83c\uddf7',
  DE: '\ud83c\udde9\ud83c\uddea',
  IT: '\ud83c\uddee\ud83c\uddf9',
  ES: '\ud83c\uddea\ud83c\uddf8',
  GB: '\ud83c\uddec\ud83c\udde7',
  NL: '\ud83c\uddf3\ud83c\uddf1',
  BE: '\ud83c\udde7\ud83c\uddea',
  CH: '\ud83c\udde8\ud83c\udded',
  AT: '\ud83c\udde6\ud83c\uddf9',
  PT: '\ud83c\uddf5\ud83c\uddf9',
  RU: '\ud83c\uddf7\ud83c\uddfa',
  TR: '\ud83c\uddf9\ud83c\uddf7',
  MA: '\ud83c\uddf2\ud83c\udde6',
  AE: '\ud83c\udde6\ud83c\uddea',
  SA: '\ud83c\uddf8\ud83c\udde6',
  CN: '\ud83c\udde8\ud83c\uddf3',
  OTHER: '\ud83c\udf0d',
};

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  FR: 'France',
  DE: 'Deutschland',
  IT: 'Italia',
  ES: 'Espa\u00f1a',
  GB: 'United Kingdom',
  NL: 'Nederland',
  BE: 'Belgique',
  CH: 'Schweiz',
  AT: '\u00d6sterreich',
  PT: 'Portugal',
  RU: '\u0420\u043e\u0441\u0441\u0438\u044f',
  TR: 'T\u00fcrkiye',
  MA: 'Maroc',
  AE: '\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a',
  SA: '\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629',
  CN: '\u4e2d\u56fd',
  OTHER: 'Other',
};

export const MAX_GUEST_SCANS = 3;        // Anonymous — 3 docs, 10 questions/day
export const MAX_FREE_SCANS = 5;         // Registered free — 5 docs, 20 questions/day
export const MAX_GUEST_QUESTIONS = 10;   // Anonymous daily question limit
export const MAX_FREE_QUESTIONS = 20;    // Registered free daily question limit
// Pro = unlimited

export const RTL_LOCALES: Locale[] = ['ar'];

export const LOCALE_NAMES: Record<Locale, string> = {
  fr: 'Fran\u00e7ais',
  en: 'English',
  ru: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439',
  de: 'Deutsch',
  es: 'Espa\u00f1ol',
  it: 'Italiano',
  ar: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
  pt: 'Portugu\u00eas',
  tr: 'T\u00fcrk\u00e7e',
  zh: '\u4e2d\u6587',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  fr: '\ud83c\uddeb\ud83c\uddf7',
  en: '\ud83c\uddec\ud83c\udde7',
  ru: '\ud83c\uddf7\ud83c\uddfa',
  de: '\ud83c\udde9\ud83c\uddea',
  es: '\ud83c\uddea\ud83c\uddf8',
  it: '\ud83c\uddee\ud83c\uddf9',
  ar: '\ud83c\uddf8\ud83c\udde6',
  pt: '\ud83c\udde7\ud83c\uddf7',
  tr: '\ud83c\uddf9\ud83c\uddf7',
  zh: '\ud83c\udde8\ud83c\uddf3',
};
