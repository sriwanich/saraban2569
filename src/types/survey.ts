export type SurveyQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'text_short'
  | 'text_long'
  | 'rating_stars'
  | 'likert_scale'
  | 'matrix_rating'
  | 'slider_score'
  | 'date_time'
  | 'file_upload'
  | 'signature'
  | 'contact_info'
  | 'rsvp_status'
  | 'section_header';

export interface SurveyOption {
  id: string;
  text: string;
  score?: number;
  imageUrl?: string;
}

export interface SurveyMatrixRow {
  id: string;
  text: string;
}

export interface SurveyMatrixCol {
  id: string;
  text: string;
  score?: number;
}

export interface SurveyLogicCondition {
  id: string;
  triggerQuestionId: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'greater_than'
    | 'greater_than_or_equal'
    | 'less_than'
    | 'less_than_or_equal'
    | 'is_empty'
    | 'is_not_empty'
    | 'is_answered';
  triggerValue?: any;
  matrixRowId?: string;
}

export interface SurveyLogicRule {
  id: string;
  name?: string;
  action: 'show' | 'hide' | 'jump_to_question' | 'jump_to_end' | 'require';
  conditionMatch: 'all' | 'any'; // AND vs OR
  conditions: SurveyLogicCondition[];
  targetQuestionId?: string; // For jump_to_question
  description?: string;
  
  // Legacy single-condition fallback fields
  triggerQuestionId?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  triggerValue?: string | number;
}

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: SurveyOption[];
  matrixRows?: SurveyMatrixRow[];
  matrixCols?: SurveyMatrixCol[];
  minScore?: number;
  maxScore?: number;
  step?: number;
  placeholder?: string;
  allowOther?: boolean;
  maxSelect?: number;
  minSelect?: number;
  logicRules?: SurveyLogicRule[];
  sectionIndex?: number;
  scoreWeight?: number;
}

export interface SurveyThemeConfig {
  presetId?: 'thai_gov' | 'disaster_alert' | 'royal_purple' | 'emerald_eco' | 'midnight_dark' | 'pastel_rose' | 'rayong_azure' | 'futuristic_cyan' | 'custom';
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  cardBgColor?: string;
  textColor?: string;
  fontFamily?: 'sarabun' | 'prompt' | 'kanit' | 'noto_sans' | 'inter';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  headerStyle?: 'solid' | 'gradient' | 'banner_pattern' | 'image_bg';
  headerGradientFrom?: string;
  headerGradientTo?: string;
  headerPattern?: 'none' | 'dots' | 'grid' | 'waves' | 'thai_motif';
  cardShadow?: 'none' | 'sm' | 'md' | 'lg' | 'glow';
  buttonStyle?: 'filled' | 'gradient' | 'soft' | 'outline';
}

export interface SurveySettings {
  status: 'draft' | 'published' | 'paused' | 'archived';
  isOpen?: boolean; // เปิด-ปิดรับคำตอบ
  resolvedLogoUrl?: string; // ตราสัญลักษณ์ที่เรโซลูชันแล้วสำหรับการแสดงผลบนมือถือ/อุปกรณ์อื่น
  themeColor: string;
  themeConfig?: SurveyThemeConfig;
  headerImageUrl?: string;
  headerLogoType: 'garuda' | 'ddpm' | 'rayong' | 'custom' | 'none';
  customLogoUrl?: string;
  showProgressBar: boolean;
  showQuestionNumbers: boolean;
  allowAnonymous: boolean;
  requireLogin: boolean;
  limitOneResponsePerDevice: boolean;
  passwordProtection?: string;
  maxTotalResponses?: number;
  startDate?: string;
  endDate?: string;
  thankYouTitle: string;
  thankYouMessage: string;
  redirectUrl?: string;
  showSummaryToRespondents: boolean;
  linkedDocId?: string;
  linkedDocNumber?: string;
  targetAudience?: string;

  // RSVP / Acknowledgment Specific Settings
  isRsvpForm?: boolean;
  rsvpEventTitle?: string;
  rsvpEventDate?: string;
  rsvpEventLocation?: string;
  rsvpDeadlineDate?: string;
  rsvpContactPhone?: string;
  showRsvpReceipt?: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  category: 'satisfaction' | 'disaster_readiness' | 'training' | 'assessment' | 'public_feedback' | 'rsvp_acknowledgment' | 'general';
  categoryLabel: string;
  department: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  questions: SurveyQuestion[];
  settings: SurveySettings;
  viewCount: number;
  responseCount: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  surveyTitle?: string;
  answers: Record<string, any>;
  respondentName?: string;
  respondentDepartment?: string;
  respondentPosition?: string;
  respondentPhone?: string;
  respondentEmail?: string;
  respondentIp?: string;
  submittedAt: string;
  deviceInfo?: string;
  timeSpentSeconds?: number;
  totalScore?: number;
}

export interface SurveySummaryStats {
  totalSurveys: number;
  activeSurveys: number;
  totalResponses: number;
  completionRate: number;
  avgSatisfactionScore: number;
}
