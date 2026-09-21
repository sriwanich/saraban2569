import { Survey } from '../types/survey';

export const OFFICIAL_SURVEY_TEMPLATES: Array<Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'responseCount' | 'creatorId' | 'creatorName'>> = [
  {
    title: 'แบบประเมินความพึงพอใจการให้บริการประชาชน (ก.พ.ร.)',
    description: 'แบบสำรวจความพึงพอใจของผู้รับบริการต่อการปฏิบัติงานและการให้บริการของสำนักงาน ปภ. จังหวัดระยอง ตามเกณฑ์มาตรฐาน ก.พ.ร.',
    category: 'satisfaction',
    categoryLabel: 'ความพึงพอใจการบริการ',
    department: 'ฝ่ายบริหารทั่วไป',
    settings: {
      status: 'published',
      themeColor: '#2563eb',
      headerLogoType: 'garuda',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: true,
      requireLogin: false,
      limitOneResponsePerDevice: false,
      thankYouTitle: 'ขอบพระคุณสำหรับข้อคิดเห็นอันมีค่ายิ่ง',
      thankYouMessage: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง จะนำผลการประเมินไปพัฒนาและยกระดับคุณภาพการให้บริการประชาชนให้ดียิ่งขึ้นต่อไป',
      showSummaryToRespondents: false
    },
    questions: [
      {
        id: 'q_service_type',
        type: 'single_choice',
        title: '1. ประเภทงานบริการที่ท่านมาติดต่อขอรับบริการในวันนี้',
        description: 'กรุณาเลือกงานบริการหลักที่ท่านเข้ารับบริการ',
        required: true,
        options: [
          { id: 'opt_1', text: 'งานขอรับความช่วยเหลือสงเคราะห์ผู้ประสบภัยพิบัติ' },
          { id: 'opt_2', text: 'งานฝึกอบรม/ซ้อมแผนป้องกันและระงับอัคคีภัย' },
          { id: 'opt_3', text: 'งานขอใช้เครื่องจักรกลสาธารณภัย / ยานพาหนะกู้ภัย' },
          { id: 'opt_4', text: 'งานสารบรรณ / ส่ง-รับหนังสือราชการ' },
          { id: 'opt_5', text: 'งานขอข้อมูลสถิติและแผนป้องกันสาธารณภัย' },
          { id: 'opt_6', text: 'อื่นๆ (โปรดระบุ)' }
        ],
        allowOther: true
      },
      {
        id: 'q_matrix_satisfaction',
        type: 'matrix_rating',
        title: '2. ระดับความพึงพอใจต่อขั้นตอนและการให้บริการในแต่ละมิติ',
        description: 'กรุณาให้คะแนนความพึงพอใจตามระดับ 1 (น้อยที่สุด) ถึง 5 (มากที่สุด)',
        required: true,
        matrixRows: [
          { id: 'row_step', text: '1) ขั้นตอนและกระบวนการให้บริการมีความสะดวกรวดเร็วและไม่ซับซ้อน' },
          { id: 'row_staff', text: '2) เจ้าหน้าที่ให้บริการด้วยความสุภาพ ยิ้มแย้ม และเต็มใจให้คำแนะนำ' },
          { id: 'row_info', text: '3) ข้อมูล คำอธิบาย และเอกสารเผยแพร่มีความชัดเจน ครบถ้วน ถูกต้อง' },
          { id: 'row_place', text: '4) สถานที่ จุดบริการ มีความสะอาด สะดวกสบาย และปลอดภัย' },
          { id: 'row_overall', text: '5) ภาพรวมความพึงพอใจต่อการให้บริการของสำนักงาน ปภ. จังหวัดระยอง' }
        ],
        matrixCols: [
          { id: 'c1', text: 'น้อยที่สุด (1)', score: 1 },
          { id: 'c2', text: 'น้อย (2)', score: 2 },
          { id: 'c3', text: 'ปานกลาง (3)', score: 3 },
          { id: 'c4', text: 'มาก (4)', score: 4 },
          { id: 'c5', text: 'มากที่สุด (5)', score: 5 }
        ]
      },
      {
        id: 'q_nps_score',
        type: 'slider_score',
        title: '3. ความเป็นไปได้ที่ท่านจะแนะนำการบริการของหน่วยงานแก่ผู้อื่น (Net Promoter Score)',
        description: 'คะแนนระดับ 0 (ไม่แนะนำแน่นอน) ถึง 10 (แนะนำอย่างยิ่ง)',
        required: true,
        minScore: 0,
        maxScore: 10,
        step: 1
      },
      {
        id: 'q_suggestions',
        type: 'text_long',
        title: '4. ข้อเสนอแนะเพื่อการปรับปรุงและพัฒนางานบริการ',
        description: 'ท่านมีข้อคิดเห็น คำแนะนำ หรือความต้องการเพิ่มเติมประการใดในการพัฒนาระบบบริการ',
        required: false,
        placeholder: 'พิมพ์ข้อเสนอแนะของท่านที่นี่...'
      }
    ]
  },
  {
    title: 'แบบสำรวจความพร้อมรับมืออุทกภัยและสาธารณภัยระดับชุมชน/ท้องถิ่น',
    description: 'แบบสำรวจการเตรียมความพร้อมขององค์กรปกครองส่วนท้องถิ่นและชุมชนในการรับมือสถานการณ์น้ำท่วม ดินถล่ม และภัยธรรมชาติตามแผน ปภ. จังหวัดระยอง',
    category: 'disaster_readiness',
    categoryLabel: 'ความพร้อมรับมือสาธารณภัย',
    department: 'กลุ่มงานยุทธศาสตร์และการจัดการ',
    settings: {
      status: 'published',
      themeColor: '#ea580c',
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: true,
      thankYouTitle: 'บันทึกข้อมูลการสำรวจสำเร็จ',
      thankYouMessage: 'ข้อมูลของท่านได้รับการส่งต่อไปยังศูนย์บัญชาการเหตุการณ์จังหวัดระยอง (ศบก.จ.รย.) เพื่อใช้ในการจัดสรรทรัพยากรช่วยเหลือต่อไป',
      showSummaryToRespondents: true
    },
    questions: [
      {
        id: 'q_loc_info',
        type: 'contact_info',
        title: '1. ข้อมูลพื้นที่และหน่วยงานผู้รับผิดชอบ',
        description: 'ระบุข้อมูลหน่วยงานและผู้ประสานงานในพื้นที่',
        required: true
      },
      {
        id: 'q_hazard_types',
        type: 'multiple_choice',
        title: '2. ภัยพิบัติที่มีความเสี่ยงสูงในพื้นที่ของท่าน (เลือกได้มากกว่า 1 ข้อ)',
        description: 'ประเมินจากประวัติการเกิดภัยย้อนหลัง 3 ปี',
        required: true,
        options: [
          { id: 'h1', text: 'น้ำท่วมขัง / น้ำป่าไหลหลาก / น้ำล้นตลิ่ง' },
          { id: 'h2', text: 'ดินโคลนถล่ม / ดินสไลด์ริมตลิ่ง' },
          { id: 'h3', text: 'คลื่นลมแรง / น้ำทะเลหนุนสูงชายฝั่ง' },
          { id: 'h4', text: 'วาตภัย / พายุฤดูร้อน / ลมกระโชกแรง' },
          { id: 'h5', text: 'อัคคีภัย / ภัยจากสารเคมีในโรงงานอุตสาหกรรม' },
          { id: 'h6', text: 'ภัยแล้ง / ขาดแคลนน้ำอุปโภคบริโภค' }
        ]
      },
      {
        id: 'q_shelter_ready',
        type: 'single_choice',
        title: '3. ความพร้อมของศูนย์พักพิงชั่วคราวรองรับผู้อพยพในพื้นที่',
        description: 'ตรวจสอบสถานที่ น้ำดื่ม ระบบสุขาภิบาล และไฟฟ้าสำรอง',
        required: true,
        options: [
          { id: 's1', text: 'มีความพร้อมสมบูรณ์ 100% (มีแผนผัง, อาหารสำรอง, ระบบไฟฟ้า/น้ำ)' },
          { id: 's2', text: 'มีความพร้อมระดับปานกลาง (มีสถานที่ แต่ต้องเสริมระบบสาธารณูปโภค)' },
          { id: 's3', text: 'ยังไม่มีความพร้อม / อยู่ระหว่างจัดเตรียมสถานที่' }
        ]
      },
      {
        id: 'q_equipment_list',
        type: 'matrix_rating',
        title: '4. สภาพความพร้อมของเครื่องจักรกลและอุปกรณ์กู้ภัยในพื้นที่',
        description: 'ประเมินความพร้อมใช้งานของเครื่องจักรกลในสังกัด',
        required: true,
        matrixRows: [
          { id: 'eq_pump', text: 'เครื่องสูบน้ำขนาดใหญ่ / ท่อส่งน้ำ' },
          { id: 'eq_boat', text: 'เรือท้องแบนติดเครื่องยนต์ / เสื้อชูชีพ' },
          { id: 'eq_gen', text: 'เครื่องกำเนิดไฟฟ้าเคลื่อนที่ / ไฟส่องสว่าง' },
          { id: 'eq_radio', text: 'วิทยุสื่อสารข่าย ปภ. และเครือข่ายสำรอง' }
        ],
        matrixCols: [
          { id: 'c_none', text: 'ไม่มีอุปกรณ์', score: 0 },
          { id: 'c_repair', text: 'ชำรุด/รอซ่อม', score: 1 },
          { id: 'c_ready', text: 'พร้อมใช้งานทันที', score: 2 }
        ]
      },
      {
        id: 'q_urgent_support',
        type: 'text_long',
        title: '5. ทรัพยากรหรือความช่วยเหลือที่ต้องการสนับสนุนจาก ปภ. จังหวัดเร่งด่วน',
        description: 'ระบุชนิดอุปกรณ์ กำลังพล หรือการสนับสนุนทางเทคนิค',
        required: false,
        placeholder: 'ระบุความต้องการสนับสนุน...'
      },
      {
        id: 'q_sign_rep',
        type: 'signature',
        title: '6. ลายมือชื่อผู้รับรองข้อมูลการสำรวจ',
        description: 'ลงลายมือชื่อดิจิทัลเพื่อยืนยันความถูกต้องของข้อมูลสำรวจ',
        required: true
      }
    ]
  },
  {
    title: 'แบบประเมินผลการฝึกซ้อมแผนป้องกันและระงับอัคคีภัย / ซ้อมอพยพหนีไฟ',
    description: 'แบบประเมินผลสัมฤทธิ์และข้อบกพร่องจากการฝึกซ้อมดับเพลิงและฝึกซ้อมอพยพหนีไฟ ประจำปีงบประมาณ',
    category: 'training',
    categoryLabel: 'การประเมินการฝึกซ้อม',
    department: 'กลุ่มงานป้องกันและปฏิบัติการ',
    settings: {
      status: 'published',
      themeColor: '#dc2626',
      headerLogoType: 'garuda',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: false,
      thankYouTitle: 'บันทึกการประเมินการฝึกซ้อมเรียบร้อย',
      thankYouMessage: 'ผลการประเมินจะถูกจัดทำเป็นรายงานเสนอผู้ว่าราชการจังหวัดระยองเพื่อปรับปรุงแผนเผชิญเหตุต่อไป',
      showSummaryToRespondents: true
    },
    questions: [
      {
        id: 'q_org_info',
        type: 'text_short',
        title: '1. ชื่อหน่วยงาน / อาคาร / โรงงาน ที่เข้าร่วมการฝึกซ้อม',
        required: true,
        placeholder: 'เช่น โรงพยาบาลระยอง, อบต.เชิงเนิน, บจก.ไทยปิโตรเคมี'
      },
      {
        id: 'q_evac_time',
        type: 'slider_score',
        title: '2. ระยะเวลาในการอพยพคนทั้งหมดออกจากอาคารไปยังจุดรวมพล (นาที)',
        description: 'มาตรฐานสากลเป้าหมายไม่เกิน 3-5 นาที',
        required: true,
        minScore: 1,
        maxScore: 15,
        step: 1
      },
      {
        id: 'q_drill_eval',
        type: 'matrix_rating',
        title: '3. ผลการประเมินหัวข้อการฝึกซ้อมตามขั้นตอนเผชิญเหตุ',
        description: 'ระดับคะแนน 1 (ต้องปรับปรุงเร่งด่วน) ถึง 5 (ดีเยี่ยม)',
        required: true,
        matrixRows: [
          { id: 'd_alarm', text: '1. สัญญาณเตือนภัยดังชัดเจนและครอบคลุมทุกจุด' },
          { id: 'd_command', text: '2. การสั่งการของศูนย์บัญชาการเหตุการณ์ (ICS)' },
          { id: 'd_route', text: '3. ป้ายบอกทางหนีไฟและเส้นทางอพยพไม่มีสิ่งกีดขวาง' },
          { id: 'd_rollcall', text: '4. การเช็คยอดและรายงานยอดผู้สูญหาย/ติดค้าง ณ จุดรวมพล' },
          { id: 'd_firstaid', text: '5. การปฐมพยาบาลเบื้องต้นและการประสานส่งต่อรถพยาบาล' }
        ],
        matrixCols: [
          { id: 'sc1', text: '1 (ปรับปรุง)', score: 1 },
          { id: 'sc2', text: '2 (พอใช้)', score: 2 },
          { id: 'sc3', text: '3 (ปานกลาง)', score: 3 },
          { id: 'sc4', text: '4 (ดี)', score: 4 },
          { id: 'sc5', text: '5 (ดีเยี่ยม)', score: 5 }
        ]
      },
      {
        id: 'q_drill_photos',
        type: 'file_upload',
        title: '4. แนบภาพถ่ายบรรยากาศการฝึกซ้อม / จุดรวมพล',
        description: 'อัปโหลดภาพถ่ายประกอบรายงานผล (รองรับ PNG, JPG, PDF)',
        required: false
      },
      {
        id: 'q_drill_notes',
        type: 'text_long',
        title: '5. ปัญหา อุปสรรค และข้อสังเกตของวิทยากรครูฝึก',
        description: 'ข้อสังเกตเชิงลึกเพื่อนำไปแก้ไขในคู่มือระงับเหตุฉุกเฉิน',
        required: false,
        placeholder: 'ระบุจุดที่ต้องปรับปรุง...'
      }
    ]
  },
  {
    title: 'แบบสำรวจความคิดเห็นและความสุขในการทำงานของบุคลากร (Happy Workplace)',
    description: 'แบบสำรวจความคิดเห็น บรรยากาศในการปฏิบัติงาน และสวัสดิการของเจ้าหน้าที่สำนักงาน ปภ. จังหวัดระยอง',
    category: 'assessment',
    categoryLabel: 'การประเมินภายในองค์กร',
    department: 'ฝ่ายบริหารทั่วไป',
    settings: {
      status: 'published',
      themeColor: '#059669',
      headerLogoType: 'garuda',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: true,
      requireLogin: false,
      limitOneResponsePerDevice: true,
      thankYouTitle: 'ขอบคุณสำหรับความคิดเห็นที่จริงใจ',
      thankYouMessage: 'ข้อมูลทั้งหมดจะถูกเก็บเป็นความลับ 100% โดยไม่มีการระบุตัวตน เพื่อนำไปพัฒนาสภาพแวดล้อมการทำงานที่ดีขึ้น',
      showSummaryToRespondents: false
    },
    questions: [
      {
        id: 'q_dept_group',
        type: 'dropdown',
        title: '1. กลุ่มงาน/ฝ่าย ที่ท่านสังกัด',
        required: true,
        options: [
          { id: 'g1', text: 'ฝ่ายบริหารทั่วไป' },
          { id: 'g2', text: 'กลุ่มงานยุทธศาสตร์และการจัดการ' },
          { id: 'g3', text: 'กลุ่มงานป้องกันและปฏิบัติการ' },
          { id: 'g4', text: 'กลุ่มงานสงเคราะห์ผู้ประสบภัย' }
        ]
      },
      {
        id: 'q_work_satisfaction',
        type: 'matrix_rating',
        title: '2. ความพึงพอใจต่อสภาพแวดล้อมการทำงานและระบบสนับสนุน',
        required: true,
        matrixRows: [
          { id: 'w1', text: 'ระบบเทคโนโลยีสารบรรณอิเล็กทรอนิกส์ (EDMS) ใช้งานสะดวกและรวดเร็ว' },
          { id: 'w2', text: 'อุปกรณ์สำนักงาน เครื่องมือ และคอมพิวเตอร์เพียงพอต่อการทำงาน' },
          { id: 'w3', text: 'การสื่อสารและการประสานงานภายในฝ่ายงานและข้ามกลุ่มงานราบรื่น' },
          { id: 'w4', text: 'ความสมดุลระหว่างชีวิตและการทำงาน (Work-Life Balance)' },
          { id: 'w5', text: 'การได้รับการส่งเสริมและพัฒนาทักษะวิชาชีพสม่ำเสมอ' }
        ],
        matrixCols: [
          { id: 'ws1', text: 'ไม่พอใจอย่างยิ่ง', score: 1 },
          { id: 'ws2', text: 'ไม่พอใจ', score: 2 },
          { id: 'ws3', text: 'ปานกลาง', score: 3 },
          { id: 'ws4', text: 'พึงพอใจ', score: 4 },
          { id: 'ws5', text: 'พึงพอใจอย่างยิ่ง', score: 5 }
        ]
      },
      {
        id: 'q_open_feedback',
        type: 'text_long',
        title: '3. สิ่งที่ท่านต้องการให้ผู้บริหารสนับสนุนหรือปรับปรุงเพิ่มเติม',
        required: false,
        placeholder: 'พิมพ์ข้อเสนอแนะของท่านอย่างอิสระ...'
      }
    ]
  },
  {
    title: 'แบบตอบรับการเข้าร่วมประชุม / ฝึกอบรม / สัมมนา ปภ. จังหวัดระยอง (RSVP)',
    description: 'แบบตอบรับยืนยันการเข้าร่วมการประชุม สัมมนา หรือการฝึกอบรมเชิงปฏิบัติการของสำนักงาน ปภ. จังหวัดระยอง เพื่อจัดเตรียมอาหาร สถิติ และเอกสารประกอบ',
    category: 'rsvp_acknowledgment',
    categoryLabel: 'แบบตอบรับ & ยืนยันเข้าร่วม',
    department: 'ฝ่ายบริหารทั่วไป',
    settings: {
      status: 'published',
      themeColor: '#1e3a8a',
      themeConfig: {
        presetId: 'thai_gov',
        primaryColor: '#1e3a8a',
        accentColor: '#2563eb',
        bgColor: '#f8fafc',
        cardBgColor: '#ffffff',
        textColor: '#0f172a',
        fontFamily: 'sarabun',
        borderRadius: 'xl',
        headerStyle: 'gradient',
        headerGradientFrom: '#1e3a8a',
        headerGradientTo: '#1e40af',
        headerPattern: 'thai_motif',
        cardShadow: 'md',
        buttonStyle: 'filled'
      },
      headerLogoType: 'garuda',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: false,
      thankYouTitle: 'บันทึกแบบตอบรับการเข้าร่วมเรียบร้อยแล้ว',
      thankYouMessage: 'ขอบคุณสำหรับการตอบรับการเข้าร่วมกิจกรรม ท่านสามารถบันทึกหรือพิมพ์ "บัตรตอบรับ (RSVP Ticket)" เพื่อแสดง ณ จุดลงทะเบียนวันงาน',
      showSummaryToRespondents: false,
      isRsvpForm: true,
      rsvpEventTitle: 'การประชุมเชิงปฏิบัติการจัดทำแผนป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
      rsvpEventDate: '28 กันยายน 2026 (เวลา 08:30 - 16:30 น.)',
      rsvpEventLocation: 'ห้องประชุมพระเจดีย์กลางน้ำ ชั้น 4 ศาลากลางจังหวัดระยอง',
      rsvpDeadlineDate: '25 กันยายน 2026',
      rsvpContactPhone: '038-694000 ต่อ 102 (ฝ่ายบริหารทั่วไป ปภ.ระยอง)',
      showRsvpReceipt: true
    },
    questions: [
      {
        id: 'q_rsvp_contact',
        type: 'contact_info',
        title: '1. ข้อมูลผู้ตอบแบบตอบรับ / ผู้เข้าร่วมงาน',
        description: 'กรุณาระบุชื่อ-นามสกุล ตำแหน่ง สังกัด และหมายเลขโทรศัพท์ติดต่อ',
        required: true
      },
      {
        id: 'q_rsvp_status',
        type: 'rsvp_status',
        title: '2. ยืนยันการเข้าร่วมกิจกรรม',
        description: 'กรุณาเลือกสถานะการตอบรับเข้าร่วมงาน',
        required: true,
        options: [
          { id: 'status_yes', text: 'ตอบรับเข้าร่วมงานด้วยตนเอง (Accept & Attend)' },
          { id: 'status_delegate', text: 'มอบหมายผู้แทนเข้าร่วมงานแทน (Send Representative)' },
          { id: 'status_no', text: 'ไม่สะดวกเข้าร่วมงานเนื่องจากติดภารกิจ (Decline)' }
        ]
      },
      {
        id: 'q_delegate_info',
        type: 'text_short',
        title: '3. กรณีมอบหมายผู้แทน โปรดระบุชื่อ-นามสกุล และตำแหน่งของผู้แทน',
        description: 'กรอกเฉพาะกรณีมอบหมายผู้แทนเข้าร่วมงาน',
        required: false,
        placeholder: 'เช่น นายสมชาย ใจดี (นักวิเคราะห์นโยบายและแผนปฏิบัติการ)',
        logicRules: [
          {
            id: 'rule_delegate_show',
            action: 'show',
            conditionMatch: 'all',
            conditions: [
              {
                id: 'cond_1',
                triggerQuestionId: 'q_rsvp_status',
                operator: 'contains',
                triggerValue: 'มอบหมายผู้แทน'
              }
            ]
          }
        ]
      },
      {
        id: 'q_dietary_needs',
        type: 'multiple_choice',
        title: '4. อาหารและข้อจำกัดพิเศษ (สำหรับจัดเตรียมอาหารกลางวัน)',
        description: 'เลือกได้มากกว่า 1 รายการ',
        required: false,
        options: [
          { id: 'diet_normal', text: 'อาหารทั่วไป (ไม่มีข้อจำกัด)' },
          { id: 'diet_halal', text: 'อาหารฮาลาล (Halal Food)' },
          { id: 'diet_veg', text: 'อาหารมังสวิรัติ / เจ' },
          { id: 'diet_seafood_allergy', text: 'แพ้อาหารทะเล' }
        ],
        allowOther: true,
        logicRules: [
          {
            id: 'rule_diet_show',
            action: 'show',
            conditionMatch: 'any',
            conditions: [
              {
                id: 'cond_yes',
                triggerQuestionId: 'q_rsvp_status',
                operator: 'contains',
                triggerValue: 'ด้วยตนเอง'
              },
              {
                id: 'cond_rep',
                triggerQuestionId: 'q_rsvp_status',
                operator: 'contains',
                triggerValue: 'ผู้แทน'
              }
            ]
          }
        ]
      },
      {
        id: 'q_rsvp_sig',
        type: 'signature',
        title: '5. ลายมือชื่อดิจิทัลผู้ตอบรับ',
        description: 'ลงลายมือชื่อดิจิทัลเพื่อยืนยันแบบตอบรับ',
        required: true
      }
    ]
  },
  {
    title: 'แบบตอบรับการรับทราบประกาศ / คำสั่งปฏิบัติราชการ ปภ. จังหวัดระยอง',
    description: 'แบบฟอร์มตอบรับการรับทราบคำสั่ง ประกาศ หรือหนังสือสั่งการฉุกเฉิน ปภ. เพื่อเป็นหลักฐานตามระบบบริหารจัดการเอกสารอิเล็กทรอนิกส์ (EDMS)',
    category: 'rsvp_acknowledgment',
    categoryLabel: 'แบบตอบรับ & ยืนยันการรับทราบ',
    department: 'กลุ่มงานยุทธศาสตร์และการจัดการ',
    settings: {
      status: 'published',
      themeColor: '#ea580c',
      themeConfig: {
        presetId: 'disaster_alert',
        primaryColor: '#ea580c',
        accentColor: '#f97316',
        bgColor: '#fff7ed',
        cardBgColor: '#ffffff',
        textColor: '#1c1917',
        fontFamily: 'prompt',
        borderRadius: '2xl' as any,
        headerStyle: 'gradient',
        headerGradientFrom: '#c2410c',
        headerGradientTo: '#ea580c',
        headerPattern: 'waves',
        cardShadow: 'lg',
        buttonStyle: 'gradient'
      },
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: true,
      thankYouTitle: 'บันทึกการตอบรับทราบคำสั่งเรียบร้อยแล้ว',
      thankYouMessage: 'ระบบได้ลงบันทึกเวลาและหลักฐานการรับทราบคำสั่งของท่านเข้าสู่ฐานข้อมูลระบบสารบรรณอิเล็กทรอนิกส์ (EDMS) เรียบร้อยแล้ว',
      showSummaryToRespondents: false,
      isRsvpForm: true,
      rsvpEventTitle: 'คำสั่งเตรียมความพร้อมรับมือสถานการณ์อุทกภัยฉุกเฉินระยอง ที่ รย 0021/ว 1042',
      rsvpEventDate: 'มีผลตั้งแต่วันที่ 20 กันยายน 2026 เป็นต้นไป',
      rsvpEventLocation: 'พื้นที่เสี่ยงภัยอุทกภัย 8 อำเภอ จังหวัดระยอง',
      showRsvpReceipt: true
    },
    questions: [
      {
        id: 'q_ack_officer',
        type: 'contact_info',
        title: '1. ข้อมูลเจ้าหน้าที่ / ผู้บังคับบัญชาที่รับทราบคำสั่ง',
        description: 'ระบุชื่อ-นามสกุล ตำแหน่ง และองค์กรปกครองส่วนท้องถิ่น/สังกัด',
        required: true
      },
      {
        id: 'q_ack_check',
        type: 'single_choice',
        title: '2. การรับทราบและถือปฏิบัติตามคำสั่ง',
        description: 'ข้าพเจ้าได้อ่านและเข้าใจข้อความในประกาศ/คำสั่งโดยครบถ้วนแล้ว',
        required: true,
        options: [
          { id: 'ack_yes', text: 'รับทราบ และพร้อมปฏิบัติตามข้อสั่งการโดยเคร่งครัด' },
          { id: 'ack_req_more', text: 'รับทราบ แต่อยู่ระหว่างขอรับการสนับสนุนทรัพยากรเพิ่มเติม' }
        ]
      },
      {
        id: 'q_ack_attachment',
        type: 'file_upload',
        title: '3. แนบคำสั่งจัดตั้งศูนย์ปฏิบัติการท้องถิ่น / บันทึกรายงานการประชุม (ถ้ามี)',
        description: 'รองรับไฟล์ PDF หรือ รูปภาพประกอบหลักฐาน',
        required: false
      },
      {
        id: 'q_ack_signature',
        type: 'signature',
        title: '4. ลายมือชื่อดิจิทัลรับทราบคำสั่ง',
        description: 'วาดลายมือชื่อดิจิทัลเพื่อยืนยันการรับทราบตามกฎหมายสารบรรณอิเล็กทรอนิกส์',
        required: true
      }
    ]
  }
];
