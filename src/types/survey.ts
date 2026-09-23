export type QuestionType =
  | 'text'
  | 'textarea'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'rating'
  | 'matrix'
  | 'scale'
  | 'date'
  | 'file'
  | 'ranking'
  | 'signature';

export type SurveyQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'cascading_dropdown'
  | 'text_short'
  | 'text_long'
  | 'number_input'
  | 'rating_stars'
  | 'nps_score'
  | 'likert_scale'
  | 'matrix_rating'
  | 'matrix_single'
  | 'matrix_text'
  | 'matrix_checkbox'
  | 'slider_score'
  | 'ranking'
  | 'date_time'
  | 'file_upload'
  | 'signature'
  | 'gps_location'
  | 'geo_location'
  | 'contact_info'
  | 'quiz_answer'
  | 'rsvp_status'
  | 'section_header'
  | 'picture_choice'
  | 'image_choice'
  | 'checkbox'
  | 'matrix'
  | 'scale'
  | 'textarea'
  | 'rating'
  | 'quota_choice';

export interface CascadingItem {
  id: string;
  name: string;
  subItems?: CascadingItem[];
  parentId?: string;
}

export interface SurveyOption {
  id: string;
  text?: string;
  score?: number;
  imageUrl?: string;
  quotaLimit?: number; // โควตารับจำนวนคำตอบสูงสุดของตัวเลือกนี้
  label?: string;
  value?: string;
  isCorrect?: boolean;
}

export interface SurveyCascadingLevel {
  levelName: string;
  options: Array<{
    id: string;
    text: string;
    parentId?: string;
  }>;
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
  cascadingLevels?: SurveyCascadingLevel[];
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

  // Number input specific
  unit?: string;
  numberUnit?: string;
  numberMin?: number;
  numberMax?: number;

  // Quiz / Exam / Evaluation specific
  questionScore?: number;
  correctAnswer?: string | string[]; // ID or text of correct option(s)
  correctAnswers?: string[];
  scorePoints?: number;
  isExamQuestion?: boolean;
  points?: number;
  rankingItems?: any[];
  explanation?: string;
  answerExplanation?: string;

  // GPS Map specific
  defaultAddress?: string;

  // Scaling / Star label specific
  minLabel?: string;
  maxLabel?: string;
  minScale?: number;
  maxScale?: number;
}

export interface SurveyEvaluationGrade {
  minPercent: number;
  maxPercent: number;
  levelName: string;
  gradeCode: string;
  color: string;
  description: string;
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

export interface CertificateDesignerConfig {
  templateId: 'classic' | 'modern' | 'minimal';
  logoPosition: 'top-left' | 'top-center' | 'top-right';
  fontFamily: 'sarabun' | 'prompt' | 'kanit';
  signatureImageUrl?: string;
}

export interface SurveySettings {
  status: 'draft' | 'published' | 'paused' | 'archived' | 'closed';
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
  oneResponsePerUser?: boolean;
  collectIp?: boolean;
  collectDeviceInfo?: boolean;
  passwordProtection?: string;
  maxTotalResponses?: number;
  startDate?: string;
  endDate?: string;
  thankYouTitle: string;
  thankYouMessage: string;
  redirectUrl?: string;
  showSummaryToRespondents: boolean;
  certificateOrgName?: string;
  certificateSignerName?: string;
  certificateSignerPosition?: string;
  certificateDesignerConfig?: CertificateDesignerConfig;
  linkedDocId?: string;
  linkedDocNumber?: string;
  targetAudience?: string;

  // Enterprise Security & Whitelist Controls
  enableWhitelist?: boolean;
  whitelistEntries?: string[]; // รายชื่ออีเมล, เลขประจำตัวประชาชน, หรือเบอร์โทรศัพท์ที่ได้รับอนุญาต

  // Enterprise Quiz & Evaluation Mode
  quizMode?: boolean;
  isExamMode?: boolean;
  passingScorePercentage?: number;
  passingScorePercent?: number;
  passScore?: number;
  surveyMode?: 'exam' | 'survey' | 'rsvp' | string;
  quizPassPercent?: number; // เปอร์เซ็นต์ผ่านเกณฑ์ เช่น 70%
  passScorePercent?: number;
  quizShowResultImmediate?: boolean;
  showScoreImmediately?: boolean;
  timeLimitMinutes?: number; // เวลาในการทำแบบสำรวจ/ข้อสอบ (นาที)
  evaluationGrades?: SurveyEvaluationGrade[]; // เกณฑ์ตัดเกรดการประเมิน 5 ระดับ

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
  category: 'satisfaction' | 'disaster_readiness' | 'training' | 'assessment' | 'public_feedback' | 'rsvp_acknowledgment' | 'general' | 'exam_quiz';
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
  maxPossibleScore?: number;
  review?: any;
  scoreObtained?: number;
  passedExam?: boolean;
  geoLocation?: any;
  examResult?: any;
  whitelistTokenUsed?: string;
  scorePercentage?: number;
  evaluationResult?: {
    gradeCode: string;
    levelName: string;
    color: string;
    isPassed?: boolean;
  };
}

export interface SurveySummaryStats {
  totalSurveys: number;
  activeSurveys: number;
  totalResponses: number;
  completionRate: number;
  avgSatisfactionScore: number;
}
