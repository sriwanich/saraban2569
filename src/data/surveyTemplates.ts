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
      headerLogoType: 'ddpm',
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
      headerLogoType: 'ddpm',
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
      headerLogoType: 'ddpm',
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
      headerLogoType: 'ddpm',
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
  },
  {
    title: 'แบบทดสอบความรู้และสมรรถนะการปฐมพยาบาลเบื้องต้นและการช่วยฟื้นคืนชีพ (CPR & AED Basic Life Support)',
    description: 'แบบทดสอบวัดระดับสมรรถนะความรู้ด้านการปฐมพยาบาลเบื้องต้นและการใช้เครื่องกระตุกหัวใจไฟฟ้าแบบอัตโนมัติ (AED) สำหรับอาสาสมัครป้องกันภัยฝ่ายพลเรือน (อปพร.) จังหวัดระยอง (ผ่านเกณฑ์ร้อยละ 70 เพื่อรับเกียรติบัตร)',
    category: 'training',
    categoryLabel: 'การประเมินการฝึกซ้อม',
    department: 'กลุ่มงานป้องกันและปฏิบัติการ',
    settings: {
      status: 'published',
      themeColor: '#be123c',
      themeConfig: {
        presetId: 'disaster_alert',
        primaryColor: '#be123c',
        accentColor: '#f43f5e',
        bgColor: '#fff1f2',
        cardBgColor: '#ffffff',
        textColor: '#0f172a',
        fontFamily: 'prompt',
        borderRadius: 'xl',
        headerStyle: 'gradient',
        headerGradientFrom: '#9f1239',
        headerGradientTo: '#be123c',
        headerPattern: 'thai_motif',
        cardShadow: 'lg',
        buttonStyle: 'gradient'
      },
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: true,
      thankYouTitle: 'ส่งกระดาษคำตอบและประเมินสมรรถนะเรียบร้อย',
      thankYouMessage: 'ท่านได้ทำแบบทดสอบวัดสมรรถนะความรู้การปฐมพยาบาลและการช่วยชีวิตขั้นพื้นฐานเสร็จสิ้นแล้ว ระบบได้ประเมินผลคะแนนของท่านโดยอัตโนมัติ หากผ่านเกณฑ์ร้อยละ 70 ขึ้นไป สามารถคลิกรับใบประกาศเกียรติบัตรอิเล็กทรอนิกส์สีทองได้ทันที',
      showSummaryToRespondents: true,
      quizMode: true,
      passScorePercent: 70,
      showScoreImmediately: true,
      timeLimitMinutes: 15
    },
    questions: [
      {
        id: 'q_cpr_ratio',
        type: 'quiz_answer',
        title: '1. อัตราส่วนการกดหน้าอกสลับกับการเป่าปากในการทำ CPR สำหรับผู้ใหญ่ตามมาตรฐานสากลคือข้อใด',
        required: true,
        options: [
          { id: 'opt_cpr_1', text: 'กดหน้าอก 15 ครั้ง สลับเป่าปาก 2 ครั้ง' },
          { id: 'opt_cpr_2', text: 'กดหน้าอก 30 ครั้ง สลับเป่าปาก 2 ครั้ง' },
          { id: 'opt_cpr_3', text: 'กดหน้าอก 30 ครั้ง สลับเป่าปาก 5 ครั้ง' },
          { id: 'opt_cpr_4', text: 'กดหน้าอก 100 ครั้ง สลับเป่าปาก 2 ครั้ง' }
        ],
        correctAnswer: 'กดหน้าอก 30 ครั้ง สลับเป่าปาก 2 ครั้ง',
        scoreWeight: 1,
        explanation: 'ตามมาตรฐาน AHA Guidelines สำหรับการกู้ชีพขั้นพื้นฐาน (BLS) อัตราส่วนในผู้ใหญ่คือ 30:2 สำหรับผู้ปฏิบัติการช่วยเหลือทั้งคนเดียวหรือสองคน'
      },
      {
        id: 'q_aed_step',
        type: 'quiz_answer',
        title: '2. ขั้นตอนแรกสุดที่ต้องปฏิบัติทันทีเมื่อนำเครื่องกระตุกหัวใจไฟฟ้าแบบอัตโนมัติ (AED) มาถึงจุดเกิดเหตุคือข้อใด',
        required: true,
        options: [
          { id: 'opt_aed_1', text: 'แปะแผ่นนำไฟฟ้า (Pads) เข้ากับหน้าอกของผู้ป่วยทันที' },
          { id: 'opt_aed_2', text: 'เปิดสวิตช์เครื่อง AED ทันที (หรือเปิดฝาเครื่อง)' },
          { id: 'opt_aed_3', text: 'กดปุ่มช็อก (Shock) เพื่อกระตุ้นระบบ' },
          { id: 'opt_aed_4', text: 'เสียบสายขั้วต่อแผ่นแปะเข้ากับตัวเครื่อง' }
        ],
        correctAnswer: 'เปิดสวิตช์เครื่อง AED ทันที (หรือเปิดฝาเครื่อง)',
        scoreWeight: 1,
        explanation: 'ขั้นตอนแรกสุดเมื่อได้เครื่อง AED มาถึงข้างผู้ป่วยคือ "เปิดสวิตช์เครื่องทันที" เพื่อให้เครื่องส่งเสียงแนะนำขั้นตอนถัดไป'
      },
      {
        id: 'q_cpr_depth',
        type: 'quiz_answer',
        title: '3. ความลึกของการกดหน้าอกในการทำ CPR ผู้ใหญ่ที่เหมาะสมและมีประสิทธิภาพสูงคือช่วงใด',
        required: true,
        options: [
          { id: 'opt_dep_1', text: 'ลึกอย่างน้อย 1 นิ้ว แต่ไม่เกิน 1.5 นิ้ว' },
          { id: 'opt_dep_2', text: 'ลึกอย่างน้อย 2 นิ้ว (5 เซนติเมตร) แต่ไม่เกิน 2.4 นิ้ว (6 เซนติเมตร)' },
          { id: 'opt_dep_3', text: 'ลึกอย่างน้อย 3 นิ้ว แต่ไม่เกิน 4 นิ้ว' },
          { id: 'opt_dep_4', text: 'กดลึกที่สุดเท่าที่แรงของคนช่วยเหลือจะทำได้' }
        ],
        correctAnswer: 'ลึกอย่างน้อย 2 นิ้ว (5 เซนติเมตร) แต่ไม่เกิน 2.4 นิ้ว (6 เซนติเมตร)',
        scoreWeight: 1,
        explanation: 'ความลึกในการกดหน้าอกผู้ใหญ่ที่แนะนำคือ 2 ถึง 2.4 นิ้ว (5-6 ซม.) และต้องปล่อยหน้าอกคืนตัวจนสุด (Complete Chest Recoil) ทุกครั้ง'
      }
    ]
  },
  {
    title: 'แบบทดสอบความรู้พื้นฐานระบบบัญชาการเหตุการณ์ (Incident Command System: ICS 100)',
    description: 'แบบทดสอบวัดสมรรถนะและความรู้เบื้องต้นเกี่ยวกับระบบบัญชาการเหตุการณ์ (ICS) และศูนย์ปฏิบัติการฉุกเฉิน (EOC) ตามมาตรฐานการจัดการสาธารณภัยแห่งชาติ (ผ่านเกณฑ์ร้อยละ 80 เพื่อรับเกียรติบัตร)',
    category: 'training',
    categoryLabel: 'การประเมินการฝึกซ้อม',
    department: 'กลุ่มงานยุทธศาสตร์และการจัดการ',
    settings: {
      status: 'published',
      themeColor: '#0369a1',
      themeConfig: {
        presetId: 'rayong_azure',
        primaryColor: '#0369a1',
        accentColor: '#0ea5e9',
        bgColor: '#f0f9ff',
        cardBgColor: '#ffffff',
        textColor: '#0f172a',
        fontFamily: 'kanit',
        borderRadius: 'xl',
        headerStyle: 'gradient',
        headerGradientFrom: '#0369a1',
        headerGradientTo: '#0284c7',
        headerPattern: 'waves',
        cardShadow: 'md',
        buttonStyle: 'filled'
      },
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: true,
      thankYouTitle: 'บันทึกคำตอบการประเมินความรู้สำเร็จ',
      thankYouMessage: 'ขอบคุณสำหรับการทดสอบความรู้ระบบบัญชาการเหตุการณ์ (ICS) หากท่านผ่านเกณฑ์คะแนนสะสมร้อยละ 80 ขึ้นไป สามารถคลิกดูเกียรติบัตรดิจิทัลทางอิเล็กทรอนิกส์ได้ทันที',
      showSummaryToRespondents: true,
      quizMode: true,
      passScorePercent: 80,
      showScoreImmediately: true,
      timeLimitMinutes: 15
    },
    questions: [
      {
        id: 'q_ics_commander',
        type: 'quiz_answer',
        title: '1. ตำแหน่งโครงสร้างใดในระบบบัญชาการเหตุการณ์ (ICS) ที่มีหน้าที่รับผิดชอบสูงสุดในพื้นที่เผชิญเหตุและกำหนดทิศทางยุทธวิธีทั้งหมด',
        required: true,
        options: [
          { id: 'opt_cmd_1', text: 'ผู้บัญชาการเหตุการณ์ (Incident Commander: IC)' },
          { id: 'opt_cmd_2', text: 'หัวหน้าส่วนปฏิบัติการ (Operations Section Chief)' },
          { id: 'opt_cmd_3', text: 'เจ้าหน้าที่ประชาสัมพันธ์ (Public Information Officer: PIO)' },
          { id: 'opt_cmd_4', text: 'หัวหน้าส่วนวางแผน (Planning Section Chief)' }
        ],
        correctAnswer: 'ผู้บัญชาการเหตุการณ์ (Incident Commander: IC)',
        scoreWeight: 1,
        explanation: 'ผู้บัญชาการเหตุการณ์ (IC) เป็นบุคคลเดี่ยวหรือกลุ่มบุคคลที่รับผิดชอบโดยตรงต่อการสั่งการและยุทธศาสตร์ทั้งหมดในการเผชิญเหตุภัยพิบัติ'
      },
      {
        id: 'q_ics_span',
        type: 'quiz_answer',
        title: '2. ช่วงการควบคุมที่เหมาะสม (Span of Control) ตามหลักการสากลของระบบ ICS สำหรับผู้ควบคุมงาน 1 คน ควรดูแลผู้ใต้บังคับบัญชาจำนวนกี่คน',
        required: true,
        options: [
          { id: 'opt_span_1', text: '1 ต่อ 2 คน' },
          { id: 'opt_span_2', text: '1 ต่อ 5 คน (ช่วงเหมาะสมคือ 3 ถึง 7 คน)' },
          { id: 'opt_span_3', text: '1 ต่อ 10 คน' },
          { id: 'opt_span_4', text: 'ไม่จำกัดจำนวน ขึ้นอยู่กับระดับชั้นของยศทหาร/ปภ.' }
        ],
        correctAnswer: '1 ต่อ 5 คน (ช่วงเหมาะสมคือ 3 ถึง 7 คน)',
        scoreWeight: 1,
        explanation: 'หลักการ ICS กำหนดให้ Span of Control ที่มีประสิทธิภาพสูงสุดคือ 1 ต่อ 5 (หรือขยายได้ตั้งแต่ 3 ถึง 7 คน) เพื่อการควบคุมและส่งสารประสานงานที่รวดเร็ว'
      },
      {
        id: 'q_ics_section',
        type: 'quiz_answer',
        title: '3. ส่วนงาน (Section) ใดในโครงสร้างระบบ ICS ที่ทำหน้าที่หลักในการจัดหาเครื่องจักร อาหาร ยานพาหนะ และระบบวิทยุสื่อสารสนับสนุนการกู้ภัย',
        required: true,
        options: [
          { id: 'opt_sec_1', text: 'ส่วนวางแผน (Planning Section)' },
          { id: 'opt_sec_2', text: 'ส่วนบริการ/สนับสนุนการส่งกำลังบำรุง (Logistics Section)' },
          { id: 'opt_sec_3', text: 'ส่วนการเงินและบริหาร (Finance / Administration Section)' },
          { id: 'opt_sec_4', text: 'ส่วนปฏิบัติการ (Operations Section)' }
        ],
        correctAnswer: 'ส่วนบริการ/สนับสนุนการส่งกำลังบำรุง (Logistics Section)',
        scoreWeight: 1,
        explanation: 'ส่วนการส่งกำลังบำรุง (Logistics Section) มีหน้าที่จัดหาเครื่องมือ อุปกรณ์ ระบบสื่อสาร อาหาร สถานที่พักพิง และการสนับสนุนทางการแพทย์ให้แก่เจ้าหน้าที่กู้ชีพ'
      }
    ]
  },
  {
    title: 'แบบรายงานข้อมูลความเสียหายและการประสานความช่วยเหลือเร่งด่วนสถานการณ์อุทกภัย (ปภ. ย.1)',
    description: 'แบบรายงานสถานการณ์น้ำท่วม ดินถล่ม และความเสียหายของทรัพย์สิน/โครงสร้างพื้นฐานระดับท้องถิ่น สำหรับให้ อปท. และอำเภอใช้ส่งข้อมูลเข้าสู่ระบบแบบเรียลไทม์เพื่อขอรับงบประมาณช่วยเหลือฉุกเฉิน',
    category: 'disaster_readiness',
    categoryLabel: 'ความพร้อมรับมือสาธารณภัย',
    department: 'กลุ่มงานสงเคราะห์ผู้ประสบภัย',
    settings: {
      status: 'published',
      themeColor: '#ea580c',
      themeConfig: {
        presetId: 'disaster_alert',
        primaryColor: '#ea580c',
        accentColor: '#f97316',
        bgColor: '#fff7ed',
        cardBgColor: '#ffffff',
        textColor: '#0f172a',
        fontFamily: 'sarabun',
        borderRadius: 'lg',
        headerStyle: 'solid',
        headerGradientFrom: '#ea580c',
        headerGradientTo: '#ea580c',
        headerPattern: 'none',
        cardShadow: 'md',
        buttonStyle: 'filled'
      },
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: false,
      thankYouTitle: 'ส่งข้อมูลความเสียหายสำเร็จและได้รับการบันทึกข้อมูลแล้ว',
      thankYouMessage: 'สำนักงาน ปภ. จังหวัดระยอง และ คณะกรรมการ ก.ช.ภ.จ. ได้ลงทะเบียนเลขรับและส่งชุดข้อมูลไปยังส่วนงานพัฒนาและจัดสรรงบภัยพิบัติเป็นที่เรียบร้อย',
      showSummaryToRespondents: true
    },
    questions: [
      {
        id: 'q_reporter_details',
        type: 'contact_info',
        title: '1. ข้อมูลผู้ส่งรายงานและผู้แทนประสานงานอย่างเป็นทางการ',
        required: true
      },
      {
        id: 'q_damage_extent',
        type: 'multiple_choice',
        title: '2. รายการความเสียหายของทรัพย์สินสาธารณะและประชาชนเบื้องต้น (เลือกตอบได้หลายข้อ)',
        required: true,
        options: [
          { id: 'dm_1', text: 'บ้านเรือนของราษฎรเสียหายบางส่วน' },
          { id: 'dm_2', text: 'บ้านเรือนของราษฎรเสียหายทั้งหลัง' },
          { id: 'dm_3', text: 'เส้นทางคมนาคม (ถนน/สะพาน) ถูกตัดขาด รถผ่านไม่ได้' },
          { id: 'dm_4', text: 'พื้นที่การเกษตร/สวนผลไม้ถูกน้ำท่วมขัง' },
          { id: 'dm_5', text: 'ระบบสาธารณูปโภค (ไฟฟ้า/ประปา) ขัดข้องเป็นวงกว้าง' }
        ]
      },
      {
        id: 'q_water_level',
        type: 'single_choice',
        title: '3. แนวโน้มสถานการณ์และระดับน้ำในลุ่มน้ำหลักปัจจุบัน',
        required: true,
        options: [
          { id: 'wl_up', text: 'วิกฤต - ระดับน้ำล้นตลิ่งและเพิ่มขึ้นอย่างต่อเนื่อง' },
          { id: 'wl_mid', text: 'ทรงตัว - น้ำท่วมขังระบายออกได้ช้า' },
          { id: 'wl_down', text: 'ลดลง - สถานการณ์คลี่คลายใกล้เข้าสู่สภาวะปกติ' }
        ]
      },
      {
        id: 'q_gis_map',
        type: 'gps_location',
        title: '4. พิกัดภูมิศาสตร์ (GPS) ของจุดเกิดภัยหรือเส้นทางที่ชำรุด',
        description: 'เปิดระบบสิทธิ์การระบุพิกัดจีพีเอสผ่านสมาร์ตโฟน ณ จุดตรวจสอบความเสียหาย',
        required: true
      },
      {
        id: 'q_evidence_file',
        type: 'file_upload',
        title: '5. แนบรูปถ่ายจุดเกิดภัย ความเสียหาย หรือหนังสือขอรับความช่วยเหลือจากพื้นที่',
        required: true
      }
    ]
  },
  {
    title: 'แบบประเมินความพึงพอใจโครงการฝึกอบรมเยาวชนขับขี่ปลอดภัยใส่ใจวินัยจราจร ปภ.ระยอง',
    description: 'แบบสำรวจความคิดเห็นของนักเรียน นักศึกษา และผู้เข้ารับการอบรม โครงการเสริมสร้างทักษะป้องกันและลดอุบัติเหตุจราจรทางบกในระดับอำเภอ/จังหวัดระยอง',
    category: 'satisfaction',
    categoryLabel: 'ความพึงพอใจการบริการ',
    department: 'กลุ่มงานป้องกันและปฏิบัติการ',
    settings: {
      status: 'published',
      themeColor: '#0284c7',
      themeConfig: {
        presetId: 'rayong_azure',
        primaryColor: '#0284c7',
        accentColor: '#38bdf8',
        bgColor: '#f0f9ff',
        cardBgColor: '#ffffff',
        textColor: '#0f172a',
        fontFamily: 'prompt',
        borderRadius: 'xl',
        headerStyle: 'gradient',
        headerGradientFrom: '#0284c7',
        headerGradientTo: '#0ea5e9',
        headerPattern: 'waves',
        cardShadow: 'md',
        buttonStyle: 'filled'
      },
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: true,
      requireLogin: false,
      limitOneResponsePerDevice: false,
      thankYouTitle: 'ขอบพระคุณสำหรับข้อเสนอแนะและแบบสอบถาม',
      thankYouMessage: 'คำติชมและข้อคิดเห็นของน้องๆ เยาวชนจะถูกนำไปพัฒนาสื่อการสอน หลักสูตรขับขี่ปลอดภัยเพื่อช่วยรักษาชีวิตเยาวชนไทยบนท้องถนนจังหวัดระยองให้ดีขึ้น',
      showSummaryToRespondents: false
    },
    questions: [
      {
        id: 'q_trainee_age',
        type: 'dropdown',
        title: '1. ระดับชั้นการศึกษาของผู้เข้ารับการฝึกอบรม',
        required: true,
        options: [
          { id: 'age_1', text: 'มัธยมศึกษาตอนต้น (ม.1 - ม.3)' },
          { id: 'age_2', text: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)' },
          { id: 'age_3', text: 'ประกาศนียบัตรวิชาชีพ (ปวช.) / ปวส.' },
          { id: 'age_4', text: 'อื่นๆ / ประชาชนทั่วไป' }
        ]
      },
      {
        id: 'q_matrix_roadsafety',
        type: 'matrix_rating',
        title: '2. ความคิดเห็นต่อกิจกรรมและการบรรยายให้ความรู้ของทีมครูฝึกวิทยากร ปภ.',
        required: true,
        matrixRows: [
          { id: 'trs_1', text: 'ความรู้เรื่องกฎจราจรและสัญญาณป้ายที่ควรรู้เข้าใจง่าย' },
          { id: 'trs_2', text: 'กิจกรรมสาธิตการเอาตัวรอดและการขับขี่หลบสิ่งกีดขวางภาคปฏิบัติ' },
          { id: 'trs_3', text: 'ความสุภาพ เป็นกันเอง และการถ่ายทอดความรู้ของทีมวิทยากร ปภ.' },
          { id: 'trs_4', text: 'ระยะเวลา สถานที่ และสิ่งอำนวยความสะดวกในการอบรม' }
        ],
        matrixCols: [
          { id: 'rs1', text: 'น้อยที่สุด', score: 1 },
          { id: 'rs2', text: 'น้อย', score: 2 },
          { id: 'rs3', text: 'ปานกลาง', score: 3 },
          { id: 'rs4', text: 'มาก', score: 4 },
          { id: 'rs5', text: 'มากที่สุด', score: 5 }
        ]
      },
      {
        id: 'q_safety_slider',
        type: 'slider_score',
        title: '3. ระดับความมั่นใจและความตั้งใจของน้องๆ ในการสวมหมวกกันน็อก 100% หลังผ่านการฝึกอบรมนี้',
        description: 'ระดับ 0 (ไม่มีความมั่นใจเพิ่มขึ้น) ถึง 10 (ตั้งใจปฏิบัติอย่างเคร่งครัด 100%)',
        required: true,
        minScore: 0,
        maxScore: 10,
        step: 1
      }
    ]
  },
  {
    title: 'แบบสำรวจดัชนีความเสี่ยงอัคคีภัยและการจัดการสารเคมีในนิคมอุตสาหกรรม (ปภ. อส.3)',
    description: 'แบบสำรวจสถานภาพและมาตรการป้องกันอัคคีภัยจากสารเคมีและวัตถุอันตรายในโรงงานอุตสาหกรรมในเขตพื้นที่จังหวัดระยอง ตามพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย',
    category: 'assessment',
    categoryLabel: 'การประเมินภายในองค์กร',
    department: 'กลุ่มงานป้องกันและปฏิบัติการ',
    settings: {
      status: 'published',
      themeColor: '#4b5563',
      themeConfig: {
        presetId: 'disaster_alert',
        primaryColor: '#4b5563',
        accentColor: '#6b7280',
        bgColor: '#f3f4f6',
        cardBgColor: '#ffffff',
        textColor: '#111827',
        fontFamily: 'noto_sans',
        borderRadius: 'lg',
        headerStyle: 'solid',
        headerGradientFrom: '#4b5563',
        headerGradientTo: '#4b5563',
        headerPattern: 'none',
        cardShadow: 'sm',
        buttonStyle: 'filled'
      },
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: true,
      thankYouTitle: 'ขอบคุณสำหรับการตอบกลับแบบสำรวจความมั่นคงปลอดภัย',
      thankYouMessage: 'ข้อมูลความเสี่ยงสารเคมีและอัคคีภัยของโรงงานจะเข้าระบบประเมินความเสี่ยงความเสี่ยงแบบรวมศูนย์ (Hazard Mapping) เพื่อเตรียมแผนกู้ภัยระดับเขตจังหวัดระยองต่อไป',
      showSummaryToRespondents: false
    },
    questions: [
      {
        id: 'q_factory_details',
        type: 'contact_info',
        title: '1. ข้อมูลรายละเอียดสถานประกอบการ / โรงงาน และตำแหน่งพิกัด',
        required: true
      },
      {
        id: 'q_chem_class',
        type: 'multiple_choice',
        title: '2. สารเคมีหรือวัตถุอันตรายหลักที่ครอบครองหรือใช้ในกระบวนการผลิต (เลือกได้มากกว่า 1 ข้อ)',
        required: true,
        options: [
          { id: 'ch_1', text: 'ก๊าซไวไฟ (Flammable Gases) เช่น LPG / มีเทน' },
          { id: 'ch_2', text: 'ของเหลวไวไฟ (Flammable Liquids) เช่น ทินเนอร์ / น้ำมัน' },
          { id: 'ch_3', text: 'สารมีพิษและสารติดเชื้อ (Toxic Substances)' },
          { id: 'ch_4', text: 'สารกัดกร่อน (Corrosive Substances) เช่น กรดเกลือ / กรดกำมะถัน' },
          { id: 'ch_5', text: 'ไม่มีวัตถุอันตรายในโรงงาน' }
        ]
      },
      {
        id: 'q_safety_matrix',
        type: 'matrix_rating',
        title: '3. สภาพการติดตั้งและมาตรฐานระบบป้องกันอัคคีภัยภายในอาคารผลิต',
        required: true,
        matrixRows: [
          { id: 'sf_1', text: 'ระบบหัวกระจายน้ำดับเพลิงอัตโนมัติ (Sprinkler System) ครอบคลุมพื้นที่ไวไฟ' },
          { id: 'sf_2', text: 'ปุ่มแจ้งเหตุเพลิงไหม้ (Manual Pull Station) และเสียงไซเรนพร้อมทำงาน' },
          { id: 'sf_3', text: 'ระบบตรวจจับควันหรือความร้อน (Smoke / Heat Detector) ผ่านการตรวจสอบรายปี' },
          { id: 'sf_4', text: 'ถังดับเพลิงเคมีแห้ง/CO2 แปะแท็กตรวจสอบสภาพพร้อมใช้ทุกเดือน' }
        ],
        matrixCols: [
          { id: 'sc_no', text: 'ไม่มีระบบนี้', score: 1 },
          { id: 'sc_bad', text: 'ชำรุด/ยังไม่พร้อมใช้', score: 2 },
          { id: 'sc_ok', text: 'พร้อมใช้งานสมบูรณ์', score: 3 }
        ]
      },
      {
        id: 'q_factory_sig',
        type: 'signature',
        title: '4. ลายเซ็นจรรยาบรรณวิศวกรผู้ประเมินหรือผู้แทนนายจ้างเพื่อรับรองความถูกต้อง',
        required: true
      }
    ]
  },
  {
    title: 'แบบทดสอบความรู้ผู้ควบคุมและขับขี่เรือกู้ภัยและเรือกู้ชีพทางน้ำ (Rescue Boat Operator Competency Exam)',
    description: 'แบบทดสอบสมรรถนะการควบคุมเรือท้องแบน เรือตรวจการณ์ และเรือกู้ชีพกู้ภัยในการระงับภัยพิบัติทางน้ำและชายฝั่งทะเลระยอง (ผ่านเกณฑ์ร้อยละ 80 เพื่อรับเกียรติบัตรรับรอง)',
    category: 'training',
    categoryLabel: 'การประเมินการฝึกซ้อม',
    department: 'กลุ่มงานป้องกันและปฏิบัติการ',
    settings: {
      status: 'published',
      themeColor: '#0284c7',
      themeConfig: {
        presetId: 'rayong_azure',
        primaryColor: '#0284c7',
        accentColor: '#0ea5e9',
        bgColor: '#f0f9ff',
        cardBgColor: '#ffffff',
        textColor: '#0f172a',
        fontFamily: 'prompt',
        borderRadius: '2xl' as any,
        headerStyle: 'gradient',
        headerGradientFrom: '#0369a1',
        headerGradientTo: '#0284c7',
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
      thankYouTitle: 'ส่งกระดาษคำตอบสมรรถนะการเดินเรือกู้ภัยเรียบร้อย',
      thankYouMessage: 'ท่านได้ทำการสอบทฤษฎีผู้ควบคุมเรือยนต์กู้ภัย ปภ. จังหวัดระยอง เสร็จสิ้นแล้ว หากท่านทำคะแนนได้ร้อยละ 80 ขึ้นไป สามารถคลิกตรวจสอบและบันทึกเกียรติบัตรใบรับรองสมรรถนะของท่านได้ทันที',
      showSummaryToRespondents: true,
      quizMode: true,
      passScorePercent: 80,
      showScoreImmediately: true,
      timeLimitMinutes: 15
    },
    questions: [
      {
        id: 'q_boat_rule',
        type: 'quiz_answer',
        title: '1. เมื่อพบเห็นทุ่นสัญลักษณ์การเดินเรือสีแดง (Port Hand Buoy) ในร่องน้ำทางทะเล ท่านควรนำเรือหลบผ่านด้านใดของทุ่นเมื่อแล่นเข้าสู่ท่าเรือ',
        required: true,
        options: [
          { id: 'opt_b1', text: 'แล่นผ่านทางด้านซ้ายของทุ่น (Left Hand)' },
          { id: 'opt_b2', text: 'แล่นผ่านทางด้านขวาของทุ่น (Right Hand)' },
          { id: 'opt_b3', text: 'แล่นตรงทับทุ่นได้ทันที' },
          { id: 'opt_b4', text: 'หลบผ่านด้านใดก็ได้ตามความลึกของท้องน้ำ' }
        ],
        correctAnswer: 'แล่นผ่านทางด้านซ้ายของทุ่น (Left Hand)',
        scoreWeight: 1,
        explanation: 'ตามระบบทุ่นเครื่องหมายการเดินเรือสากล (IALA System A) เมื่อเรือแล่นเข้าหาฝั่ง (Inward) ทุ่นสีแดงจะอยู่ทางกราบซ้ายของเรือ ดังนั้นผู้ควบคุมต้องแล่นผ่านด้านซ้ายของทุ่น'
      },
      {
        id: 'q_boat_pfd',
        type: 'quiz_answer',
        title: '2. เสื้อชูชีพชนิดมาตรฐานประเภทใดที่ออกแบบมาให้พลิกตัวผู้ประสบภัยที่หมดสติให้หงายหน้าขึ้นเหนือผิวน้ำโดยอัตโนมัติภายใน 5 วินาที',
        required: true,
        options: [
          { id: 'opt_p1', text: 'เสื้อชูชีพประเภทโฟมช่วยชีวิตทั่วไป (PFD Type III)' },
          { id: 'opt_p2', text: 'เสื้อชูชีพเกรดช่วยเหลือสากลนอกชายฝั่ง (Offshore Life Jacket - PFD Type I)' },
          { id: 'opt_p3', text: 'สายคาดเอวลอยตัวส่วนบุคคล (Belt Pack)' },
          { id: 'opt_p4', text: 'เสื้อพยุงตัวสำหรับสันทนาการเล่นบอร์ดและสกีน้ำ (Buoyancy Aid)' }
        ],
        correctAnswer: 'เสื้อชูชีพเกรดช่วยเหลือสากลนอกชายฝั่ง (Offshore Life Jacket - PFD Type I)',
        scoreWeight: 1,
        explanation: 'PFD Type I (Offshore Life Jacket) มีปริมาณแรงลอยตัวสูงที่สุดและออกแบบโครงสร้างแผ่นโฟมให้ช่วยพลิกตัวผู้ประสบภัยที่หมดสติให้อยู่ในท่าหงายหน้าพ้นน้ำโดยอัตโนมัติเพื่อความปลอดภัยสูงสุด'
      },
      {
        id: 'q_boat_distress',
        type: 'quiz_answer',
        title: '3. สัญญาณเตือนภัยพิบัติทางทะเลฉุกเฉิน (Maritime Distress Sign) สากลที่ส่งผ่านวิทยุคลื่นสั้น VHF ช่อง 16 เพื่อขอความช่วยเหลือถึงชีวิตเร่งด่วนคือข้อสั่งการใด',
        required: true,
        options: [
          { id: 'opt_ds1', text: 'เมย์เดย์ เมย์เดย์ เมย์เดย์ (MAYDAY)' },
          { id: 'opt_ds2', text: 'แพน แพน แพน (PAN PAN)' },
          { id: 'opt_ds3', text: 'เซคูริเต้ เซคูริเต้ (SECURITE)' },
          { id: 'opt_ds4', text: 'เอสโอเอส (S.O.S.) เฉพาะในรหัสมอร์ส' }
        ],
        correctAnswer: 'เมย์เดย์ เมย์เดย์ เมย์เดย์ (MAYDAY)',
        scoreWeight: 1,
        explanation: 'MAYDAY เป็นคำสั่งเรียกฉุกเฉินสากลทางวิทยุสื่อสารสำหรับสถานการณ์วิกฤตที่มีภัยคุกคามชีวิตทันที เช่น เรือล่มหรือไฟไหม้เรือ ส่วน PAN PAN เป็นสัญญาณแจ้งเหตุฉุกเฉินที่ยังไม่เป็นภัยร้ายแรงถึงชีวิตทันที'
      }
    ]
  },
  {
    title: 'แบบลงทะเบียนและขอรับการเยียวยาฟื้นฟูเกษตรกรผู้ได้รับความเสียหายจากภัยพิบัติทางธรรมชาติ (ปภ. กษ.1)',
    description: 'แบบคำร้องขอรับเงินช่วยเหลือเงินชดเชยและสิ่งของฟื้นฟูเยียวยาของเกษตรกร (สวนทุเรียน สวนมังคุด ยางพารา ปศุสัตว์) ที่ได้รับความเสียหายจากเหตุอุทกภัย วาตภัย หรือภัยแล้ง จังหวัดระยอง',
    category: 'disaster_readiness',
    categoryLabel: 'ความพร้อมรับมือสาธารณภัย',
    department: 'กลุ่มงานสงเคราะห์ผู้ประสบภัย',
    settings: {
      status: 'published',
      themeColor: '#16a34a',
      themeConfig: {
        presetId: 'emerald_eco',
        primaryColor: '#16a34a',
        accentColor: '#22c55e',
        bgColor: '#f0fdf4',
        cardBgColor: '#ffffff',
        textColor: '#14532d',
        fontFamily: 'sarabun',
        borderRadius: 'lg',
        headerStyle: 'solid',
        headerGradientFrom: '#16a34a',
        headerGradientTo: '#16a34a',
        headerPattern: 'none',
        cardShadow: 'md',
        buttonStyle: 'filled'
      },
      headerLogoType: 'garuda',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: true,
      thankYouTitle: 'ยื่นคำร้องลงทะเบียนรับการเยียวยาสำเร็จ',
      thankYouMessage: 'ข้อมูลคำร้องของท่านเข้าสู่ทะเบียน ปภ. กษ.1 ของจังหวัดระยองเรียบร้อยแล้ว คณะอนุกรรมการระดับตำบลและอำเภอจะดำเนินการลงพื้นที่ตรวจสอบพิกัดความเสียหายตามที่ท่านแนบมาเพื่อเร่งรัดเงินชดเชยตามข้อกำหนดราชการ',
      showSummaryToRespondents: true
    },
    questions: [
      {
        id: 'q_farmer_details',
        type: 'contact_info',
        title: '1. ข้อมูลส่วนบุคคลและช่องทางติดต่อของเกษตรกรผู้ยื่นคำร้อง',
        required: true
      },
      {
        id: 'q_crop_type',
        type: 'dropdown',
        title: '2. ประเภทกิจกรรมการเกษตรหลักที่ได้รับความเสียหายจากภัยพิบัติ',
        required: true,
        options: [
          { id: 'cr_1', text: 'พืชสวนไม้ผล (เช่น ทุเรียน มังคุด เงาะ ระกำ)' },
          { id: 'cr_2', text: 'พืชไร่/นาข้าว (เช่น ข้าว มันสำปะหลัง สับปะรด)' },
          { id: 'cr_3', text: 'ปศุสัตว์ / สัตว์เลี้ยง (เช่น ไก่ โค กระบือ)' },
          { id: 'cr_4', text: 'การประมง / เพาะเลี้ยงสัตว์น้ำ (เช่น กระชังปลา บ่อกุ้ง)' }
        ]
      },
      {
        id: 'q_damage_area',
        type: 'number_input',
        title: '3. จำนวนพื้นที่การเกษตรที่ได้รับความเสียหายจริง (หน่วย: ไร่)',
        required: true,
        placeholder: 'พิมพ์ตัวเลขพื้นที่ความเสียหายจริงเป็นจำนวนไร่ เช่น 5',
        unit: 'ไร่'
      },
      {
        id: 'q_farm_gps',
        type: 'gps_location',
        title: '4. พิกัดภูมิศาสตร์ (GPS) ของแปลงเกษตรที่เกิดภัย',
        description: 'กดระบุพิกัดจีพีเอสผ่านแอปบนหน้าจอมือถือขณะยืนอยู่ที่แปลงเพื่อประกอบการตรวจสอบของคณะกรรมการตำบล',
        required: true
      },
      {
        id: 'q_damage_files',
        type: 'file_upload',
        title: '5. แนบสำเนาทะเบียนเกษตรกร (ทบก.) พร้อมรูปถ่ายสภาพความเสียหายของต้นไม้หรือแปลงเพาะปลูก',
        required: true
      },
      {
        id: 'q_farmer_signature',
        type: 'signature',
        title: '6. ลงลายมือชื่อดิจิทัลรับรองข้อมูลคำร้องและประวัติเยียวยา',
        required: true
      }
    ]
  },
  {
    title: 'แบบคัดกรองสุขภาวะทางจิตและการปฐมพยาบาลทางจิตวิทยาเบื้องต้นผู้ประสบภัย (Disaster Mental Health & PFA Screener)',
    description: 'แบบสำรวจคัดกรองระดับความเครียด ความวิตกกังวล และสภาพจิตใจของผู้ประสบสาธารณภัยในศูนย์พักพิงชั่วคราว เพื่อวางแผนทีมเยียวยาจิตใจกู้ชีพ (MCATT)',
    category: 'assessment',
    categoryLabel: 'การประเมินภายในองค์กร',
    department: 'ฝ่ายบริหารทั่วไป',
    settings: {
      status: 'published',
      themeColor: '#8b5cf6',
      themeConfig: {
        presetId: 'royal_purple',
        primaryColor: '#8b5cf6',
        accentColor: '#a78bfa',
        bgColor: '#faf5ff',
        cardBgColor: '#ffffff',
        textColor: '#1e1b4b',
        fontFamily: 'prompt',
        borderRadius: '2xl' as any,
        headerStyle: 'gradient',
        headerGradientFrom: '#6d28d9',
        headerGradientTo: '#8b5cf6',
        headerPattern: 'dots',
        cardShadow: 'md',
        buttonStyle: 'soft'
      },
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: true,
      requireLogin: false,
      limitOneResponsePerDevice: false,
      thankYouTitle: 'บันทึกข้อมูลการประเมินสุขภาวะทางจิตสำเร็จ',
      thankYouMessage: 'ขอบคุณสำหรับการประเมินสภาพจิตใจของท่าน ข้อมูลทั้งหมดจะถูกเก็บเป็นความลับทางการแพทย์ โดยทีมแพทย์และนักจิตวิทยา ปภ. ร่วมกับสาสุขจังหวัด จะส่งทีมแพทย์สนามลงไปดูแลช่วยเหลือพูดคุยบรรเทาความทุกข์ใจของท่าน ณ ศูนย์พักพิงโดยด่วนที่สุด',
      showSummaryToRespondents: false
    },
    questions: [
      {
        id: 'q_pfa_contact',
        type: 'contact_info',
        title: '1. ข้อมูลติดต่อเบื้องต้นของผู้ขอรับการประเมิน (สามารถไม่ระบุชื่อได้เพื่อความเป็นส่วนตัว)',
        description: 'กรอกข้อมูลติดต่อกรณีต้องการให้นักจิตวิทยาติดต่อกลับให้คำปรึกษาด่วน',
        required: false
      },
      {
        id: 'q_pfa_checklist',
        type: 'matrix_rating',
        title: '2. ตารางประเมินระดับอารมณ์และอาการในช่วง 7 วันที่ผ่านมาหลังเกิดเหตุภัยพิบัติ',
        required: true,
        matrixRows: [
          { id: 'pfa_1', text: 'นอนไม่หลับ หรือสะดุ้งตื่นกลางดึกบ่อยครั้งจากความกังวล' },
          { id: 'pfa_2', text: 'มีความรู้สึกตื่นตระหนก ตกใจง่าย หรือหวาดกลัวเมื่อได้ยินเสียงน้ำหรือเสียงเตือนภัย' },
          { id: 'pfa_3', text: 'มีความรู้สึกสิ้นหวัง ท้อแท้ ไม่อยากพูดคุยหรือปฏิสัมพันธ์กับผู้อื่นในศูนย์พักพิง' },
          { id: 'pfa_4', text: 'มีอาการปวดศีรษะ แน่นหน้าอก หรือหายใจไม่สะดวกบ่อยครั้ง' }
        ],
        matrixCols: [
          { id: 'cl_1', text: 'ไม่มีอาการเลย', score: 1 },
          { id: 'cl_2', text: 'มีบางครั้งบางคราว', score: 2 },
          { id: 'cl_3', text: 'มีบ่อยครั้ง', score: 3 },
          { id: 'cl_4', text: 'มีตลอดเวลาแทบทุกวัน', score: 4 }
        ]
      },
      {
        id: 'q_pfa_support_need',
        type: 'multiple_choice',
        title: '3. สิ่งที่ท่านต้องการให้ทีมสนับสนุนช่วยเหลือเร่งด่วนที่สุดในสภาวะปัจจุบัน',
        required: true,
        options: [
          { id: 'su_1', text: 'นม/อาหารเด็กอ่อน ยารักษาโรคประจำตัวด่วน' },
          { id: 'su_2', text: 'การเข้ามาพูดคุย ให้กำลังใจ ช่วยเหลือนวดผ่อนคลาย' },
          { id: 'su_3', text: 'การติดต่อหาเบอร์โทรประสานงานติดตามญาติสูญหาย/ห่างไกล' },
          { id: 'su_4', text: 'เครื่องช่วยฟัง หน้ากากอนามัย หรือสิทธิ์สวัสดิการเฉพาะบุคคล' }
        ],
        allowOther: true
      }
    ]
  },
  {
    title: 'แบบประเมินสภาพความมั่นคงปลอดภัยและความพร้อมสถานีวิทยุสื่อสารและหอกระจายข่าวเตือนภัยชุมชน (Emergency Siren & Wireless Network Survey)',
    description: 'แบบสำรวจประสิทธิภาพของหอกระจายข่าว ไซเรนเตือนภัยสึนามิชายฝั่ง และระบบเครือข่ายวิทยุสื่อสารฉุกเฉินระดับชุมชนในจังหวัดระยอง เพื่อคงประสิทธิภาพการแจ้งเตือนภัย 24 ชั่วโมง',
    category: 'disaster_readiness',
    categoryLabel: 'ความพร้อมรับมือสาธารณภัย',
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
        borderRadius: 'xl',
        headerStyle: 'solid',
        headerGradientFrom: '#ea580c',
        headerGradientTo: '#ea580c',
        headerPattern: 'none',
        cardShadow: 'md',
        buttonStyle: 'filled'
      },
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: true,
      thankYouTitle: 'บันทึกรายงานความพร้อมระบบแจ้งเตือนภัยสำเร็จ',
      thankYouMessage: 'ข้อมูลสถานะของระบบเตือนภัยชุมชนได้รับการบันทึกเข้าสู่ระบบควบคุมวิทยุโทรคมนาคม (Telecom Dashboard) ส่วนกลาง ปภ.ระยองเรียบร้อย ทีมวิศวกรซ่อมบำรุงจะจัดตารางซ่อมแซมหอที่แจ้งขัดข้องทันทีเพื่อความปลอดภัยในชีวิตประชาชน',
      showSummaryToRespondents: true
    },
    questions: [
      {
        id: 'q_station_details',
        type: 'contact_info',
        title: '1. ข้อมูลสถานที่ตั้งหอกระจายข่าว / สถานีวิทยุสื่อสารชุมชนที่ประเมิน',
        required: true
      },
      {
        id: 'q_warning_devices_status',
        type: 'matrix_rating',
        title: '2. สภาพการตรวจสอบและประเมินผลอุปกรณ์แจ้งเตือนภัยในพื้นที่',
        required: true,
        matrixRows: [
          { id: 'wd_1', text: 'เครื่องรับวิทยุเตือนภัยพิบัติคลื่นความถี่เฉพาะกาล ปภ. จังหวัด' },
          { id: 'wd_2', text: 'ระบบแผงโซลาร์เซลล์และแบตเตอรี่สำรองไฟประจำหอเตือนภัย' },
          { id: 'wd_3', text: 'หอกระจายเสียงเตือนสึนามิ / ไซเรนแจ้งเหตุฉุกเฉินชายหาด' },
          { id: 'wd_4', text: 'ลำโพงขยายเสียงและสายเคเบิลเตือนภัยในชุมชน' }
        ],
        matrixCols: [
          { id: 'wd_ok', text: 'ปกติ - เสียงดังดี / ไฟชาร์จเข้าปกติ 100%', score: 3 },
          { id: 'wd_warn', text: 'ขัดข้องบางประการ - เสียงแหบ / ต้องล้างขั้วโซลาร์เซลล์', score: 2 },
          { id: 'wd_dead', text: 'ชำรุดสิ้นเชิง - เปิดไม่ติด / ไม่มีสัญญาณตอบรับ', score: 1 }
        ]
      },
      {
        id: 'q_siren_test_date',
        type: 'date_time',
        title: '3. วันและเวลาที่ทำการทดสอบสัญญาณเสียงไซเรนเตือนภัยล่าสุด',
        required: true
      },
      {
        id: 'q_siren_photo',
        type: 'file_upload',
        title: '4. อัปโหลดรูปภาพเสาอากาศ แผงโซลาร์เซลล์ หรือสภาพเสาหอกระจายข่าวเพื่อการวินิจฉัยรอยแตก',
        required: false
      }
    ]
  },
  {
    title: 'แบบสำรวจมาตรฐานความปลอดภัยอัคคีภัยในสถานที่พักอาศัยและแหล่งท่องเที่ยวชายฝั่งระยอง (Coastal Tourist Accommodation & Beach Safety Survey)',
    description: 'แบบสำรวจความปลอดภัยและประเมินระบบป้องกันระงับอัคคีภัยและการจัดวางแนวทุ่นความปลอดภัยหาดชายทะเล สำหรับโรงแรม รีสอร์ต และโฮมสเตย์ชายทะเลระยองตามเกณฑ์มาตรฐานความปลอดภัยการท่องเที่ยว',
    category: 'assessment',
    categoryLabel: 'การประเมินภายในองค์กร',
    department: 'กลุ่มงานป้องกันและปฏิบัติการ',
    settings: {
      status: 'published',
      themeColor: '#0f766e',
      themeConfig: {
        presetId: 'emerald_eco',
        primaryColor: '#0f766e',
        accentColor: '#14b8a6',
        bgColor: '#f0fdfa',
        cardBgColor: '#ffffff',
        textColor: '#115e59',
        fontFamily: 'prompt',
        borderRadius: 'lg',
        headerStyle: 'solid',
        headerGradientFrom: '#0f766e',
        headerGradientTo: '#0f766e',
        headerPattern: 'none',
        cardShadow: 'sm',
        buttonStyle: 'filled'
      },
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      allowAnonymous: false,
      requireLogin: false,
      limitOneResponsePerDevice: false,
      thankYouTitle: 'บันทึกข้อมูลแบบสำรวจความปลอดภัยที่พักและการท่องเที่ยวเรียบร้อย',
      thankYouMessage: 'ข้อมูลดัชนีความปลอดภัยด้านการท่องเที่ยวของสถานประกอบการท่านได้รับการบันทึกเรียบร้อยเพื่อรับการตรวจรับรอง "DDPM Rayong Beach Safety Gold Award" ประจำปีนี้',
      showSummaryToRespondents: false
    },
    questions: [
      {
        id: 'q_hotel_details',
        type: 'contact_info',
        title: '1. ข้อมูลพิกัดและรายละเอียดชื่อที่พักอาศัย / สถานประกอบการท่องเที่ยว',
        required: true
      },
      {
        id: 'q_beach_safety_features',
        type: 'multiple_choice',
        title: '2. มาตรการและอุปกรณ์ความปลอดภัยทางทะเลที่สถานประกอบการจัดสรรให้แก่นักท่องเที่ยว (เลือกได้มากกว่า 1 ข้อ)',
        required: true,
        options: [
          { id: 'bf_1', text: 'มีเจ้าหน้าที่ไลฟ์การ์ด (Lifeguards) เฝ้าระวังประจำหาด/สระว่ายน้ำ' },
          { id: 'bf_2', text: 'มีเสื้อชูชีพและห่วงยางกู้ชีพ (Rescue Ring Buoys) แขวนพร้อมใช้งานริมชายหาด' },
          { id: 'bf_3', text: 'มีเสาธงและชุดสัญญาณธงเตือนภัยชายหาด (แดง/เหลือง/เขียว) แสดงตามฤดูกาล' },
          { id: 'bf_4', text: 'มีแนวกั้นทุ่นเตือนจุดน้ำลึกและห้ามเรือแล่นตัดผ่านจุดเล่นน้ำ' },
          { id: 'bf_5', text: 'ไม่มีมาตรการดังกล่าวข้างต้น' }
        ]
      },
      {
        id: 'q_hotel_escape_path',
        type: 'single_choice',
        title: '3. ความพร้อมและสว่างของเส้นทางหนีไฟและแผนที่ทางหนีไฟทุกห้องพัก',
        required: true,
        options: [
          { id: 'he_1', text: 'ผ่านเกณฑ์ดีเยี่ยม - มีไฟสำรองฉุกเฉิน ป้ายบอกทางหนีไฟครบ และสว่างชัดเจน' },
          { id: 'he_2', text: 'ผ่านเกณฑ์ขั้นต่ำ - มีป้ายบอกทาง แต่สว่างไม่เพียงพอขณะไฟฟ้าดับ' },
          { id: 'he_3', text: 'ต้องปรับปรุง - ไม่มีป้ายบอกทางหนีไฟในระดับสายตาที่สากลกำหนด' }
        ]
      },
      {
        id: 'q_hotel_sign',
        type: 'signature',
        title: '4. ลายเซ็นรับรองความถูกต้องโดยเจ้าของกิจการหรือผู้จัดการความปลอดภัยรีสอร์ต',
        required: true
      }
    ]
  },
  {
    title: 'แบบทดสอบสมรรถนะความรู้ด้านการป้องกันและระงับอัคคีภัย (Enterprise Exam)',
    description: 'แบบทดสอบวัดระดับความรู้พื้นฐานและทักษะการปฏิบัติงานด้านการระงับอัคคีภัยเบื้องต้น สำหรับบุคลากรและสถานประกอบการ พร้อมระบบออกใบประกาศนียบัตรอัตโนมัติเมื่อผ่านเกณฑ์',
    category: 'exam_quiz',
    categoryLabel: 'แบบทดสอบ / รับรองผล',
    department: 'กลุ่มงานฝึกอบรม',
    settings: {
      status: 'published',
      themeColor: '#dc2626',
      headerLogoType: 'ddpm',
      showProgressBar: true,
      showQuestionNumbers: true,
      quizMode: true,
      timeLimitMinutes: 15,
      passScorePercent: 70,
      showScoreImmediately: true,
      quizShowResultImmediate: true,
      thankYouTitle: 'การทดสอบเสร็จสิ้น',
      thankYouMessage: 'ระบบได้ประมวลผลคะแนนของท่านเรียบร้อยแล้ว หากท่านผ่านเกณฑ์จะสามารถดาวน์โหลดใบประกาศนียบัตรได้ทันที',
      showSummaryToRespondents: true,
      allowAnonymous: true,
      requireLogin: false,
      limitOneResponsePerDevice: false
    },
    questions: [
      {
        id: 'exam_info_section',
        type: 'section_header',
        title: 'ข้อมูลผู้เข้าทดสอบ',
        description: 'กรุณาระบุข้อมูลจริงเพื่อใช้ในการออกใบประกาศนียบัตร',
        required: false
      },
      {
        id: 'q_examinee_name',
        type: 'text_short',
        title: 'ชื่อ-นามสกุล (สำหรับระบุในประกาศนียบัตร)',
        required: true,
        placeholder: 'ระบุคำนำหน้าชื่อ ชื่อ และนามสกุล'
      },
      {
        id: 'q_examinee_dept',
        type: 'text_short',
        title: 'หน่วยงาน / สังกัด',
        required: true
      },
      {
        id: 'exam_quiz_section',
        type: 'section_header',
        title: 'ส่วนที่ 1: ความรู้พื้นฐานเกี่ยวกับอัคคีภัย',
        description: 'เลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว',
        required: false
      },
      {
        id: 'q_fire_triangle',
        type: 'single_choice',
        title: '1. องค์ประกอบของไฟ (Fire Triangle) ประกอบด้วยอะไรบ้าง?',
        required: true,
        scoreWeight: 2,
        correctAnswer: 'เชื้อเพลิง, ออกซิเจน, ความร้อน',
        options: [
          { id: 'opt_1', text: 'เชื้อเพลิง, ไนโตรเจน, ความร้อน' },
          { id: 'opt_2', text: 'เชื้อเพลิง, ออกซิเจน, ความร้อน' },
          { id: 'opt_3', text: 'ก๊าซหุงต้ม, ออกซิเจน, ประกายไฟ' },
          { id: 'opt_4', text: 'คาร์บอน, ออกซิเจน, แรงดัน' }
        ],
        explanation: 'ไฟเกิดจากองค์ประกอบ 3 อย่างคือ เชื้อเพลิง (Fuel), ออกซิเจน (Oxygen) และความร้อน (Heat) รวมกันในสัดส่วนที่เหมาะสม'
      },
      {
        id: 'q_fire_class_k',
        type: 'single_choice',
        title: '2. ไฟประเภท K (Class K Fire) คือไฟที่เกิดจากเชื้อเพลิงประเภทใด?',
        required: true,
        scoreWeight: 2,
        correctAnswer: 'น้ำมันประกอบอาหารในครัว',
        options: [
          { id: 'opt_1', text: 'ไม้ กระดาษ ผ้า' },
          { id: 'opt_2', text: 'อุปกรณ์ไฟฟ้าที่มีกระแสไฟไหลผ่าน' },
          { id: 'opt_3', text: 'โลหะที่ติดไฟได้' },
          { id: 'opt_4', text: 'น้ำมันประกอบอาหารในครัว' }
        ],
        explanation: 'Class K คือไฟที่เกิดจากน้ำมันปรุงอาหารหรือไขมันสัตว์ในห้องครัว'
      },
      {
        id: 'q_pass_technique',
        type: 'single_choice',
        title: '3. เทคนิค PASS ในการใช้ถังดับเพลิง P หมายถึงอะไร?',
        required: true,
        scoreWeight: 2,
        correctAnswer: 'Pull (ดึงสลัก)',
        options: [
          { id: 'opt_1', text: 'Push (ผลักวาล์ว)' },
          { id: 'opt_2', text: 'Pull (ดึงสลัก)' },
          { id: 'opt_3', text: 'Point (ชี้หัวฉีด)' },
          { id: 'opt_4', text: 'Press (กดคันบีบ)' }
        ],
        explanation: 'PASS คือ Pull (ดึง), Aim (เล็ง), Squeeze (บีบ), Sweep (ส่าย)'
      },
      {
        id: 'q_multiple_hazard',
        type: 'multiple_choice',
        title: '4. ข้อใดคือสาเหตุหลักที่ทำให้เกิดอัคคีภัยในอาคาร (เลือกได้มากกว่า 1 ข้อ)',
        required: true,
        scoreWeight: 4,
        correctAnswers: ['ไฟฟ้าลัดวงจร', 'การประกอบอาหารทิ้งไว้', 'ความประมาทเลินเล่อ'],
        options: [
          { id: 'opt_1', text: 'ไฟฟ้าลัดวงจร' },
          { id: 'opt_2', text: 'การประกอบอาหารทิ้งไว้' },
          { id: 'opt_3', text: 'ความประมาทเลินเล่อ' },
          { id: 'opt_4', text: 'สภาพอากาศหนาวจัด' }
        ]
      }
    ]
  }
];
