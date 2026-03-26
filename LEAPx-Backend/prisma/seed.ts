import { PrismaClient, RoleType } from '@prisma/client'
const prisma = new PrismaClient()

export async function seedRoles() {
  console.log('🌱 Seeding roles...')

  const roles = [
    { id: 6, name: RoleType.SUPREME, description: 'LEAPx ADMIN' },
    { id: 5, name: RoleType.SKILL_ADMIN, description: 'แอดมินของกลุ่มทักษะเฉพาะด้าน - จัดการกิจกรรมและประเมินผลในสาขาที่รับผิดชอบ' },
    { id: 4, name: RoleType.ACTIVITY_ADMIN, description: 'ผู้ดูแลกิจกรรม - รับผิดชอบในการจัดการกิจกรรมต่างๆ' },
    { id: 3, name: RoleType.STUDENT, description: 'นักศึกษา - เข้าร่วมกิจกรรมและพัฒนาทักษะ' },
    { id: 2, name: RoleType.ALUMNI, description: 'ศิษย์เก่า - สามารถเข้าร่วมกิจกรรมบางประเภทและแบ่งปันประสบการณ์' },
    { id: 1, name: RoleType.USER, description: 'ผู้ใช้ทั่วไป - บุคคลทั่วไปที่สามารถเข้าใช้ระบบได้' },
  ]

  const staffRoles = [
    { id: 1, name: 'GENERAL', description_TH: 'งานทั่วไป' , description_EN: 'General work', canScanQR : false },
    { id: 2, name: 'REGISTRATION', description_TH: 'ฝ่ายลงทะเบียน', description_EN: 'Registration department', canScanQR : true },

  ]

  const majorCategories = [
    {
      code: 'CPE',
      name_TH: 'วิศวกรรมคอมพิวเตอร์',
      name_EN: 'Computer Engineering',
      faculty_TH: 'คณะวิศวกรรมศาสตร์',
      faculty_EN: 'Faculty of Engineering',
      description_TH: 'สาขาวิชาวิศวกรรมคอมพิวเตอร์',
      description_EN: 'Computer Engineering Program',
      icon: 'Cpu'
    },
    {
      code: 'IE',
      name_TH: 'วิศวกรรมอุตสาหการ',
      name_EN: 'Industrial Engineering',
      faculty_TH: 'คณะวิศวกรรมศาสตร์',
      faculty_EN: 'Faculty of Engineering',
      description_TH: 'สาขาวิชาวิศวกรรมอุตสาหการ',
      description_EN: 'Industrial Engineering Program',
      icon: 'Factory'
    },
    {
      code: 'EE',
      name_TH: 'วิศวกรรมไฟฟ้า',
      name_EN: 'Electrical Engineering',
      faculty_TH: 'คณะวิศวกรรมศาสตร์',
      faculty_EN: 'Faculty of Engineering',
      description_TH: 'สาขาวิชาวิศวกรรมไฟฟ้า',
      description_EN: 'Electrical Engineering Program',
      icon: 'Zap'
    },
    {
      code: 'ME',
      name_TH: 'วิศวกรรมเครื่องกล',
      name_EN: 'Mechanical Engineering',
      faculty_TH: 'คณะวิศวกรรมศาสตร์',
      faculty_EN: 'Faculty of Engineering',
      description_TH: 'สาขาวิชาวิศวกรรมเครื่องกล',
      description_EN: 'Mechanical Engineering Program',
      icon: 'Cog'
    },
    {
      code: 'CE',
      name_TH: 'วิศวกรรมโยธา',
      name_EN: 'Civil Engineering',
      faculty_TH: 'คณะวิศวกรรมศาสตร์',
      faculty_EN: 'Faculty of Engineering',
      description_TH: 'สาขาวิชาวิศวกรรมโยธา',
      description_EN: 'Civil Engineering Program',
      icon: 'Construction'
    },
  ]

  const mainSkills = [
    {
      id: 1,
      name_TH: 'การคิดเชิงวิพากษ์และการแก้ปัญหา',
      name_EN: 'Critical Thinking & Problem Solving',
      icon: 'Brain',
      slug: 'critical-thinking-problem-solving',
      sortOrder: 6,
      subSkills: [
        {
          sortOrder: 1,
          name_TH: 'การให้เหตุผลเชิงวิเคราะห์',
          name_EN: 'Analytical Reasoning',
          slug: 'analytical-reasoning',
          icon: 'FunctionSquare'
        },
        {
          sortOrder: 2,
          name_TH: 'การแก้ปัญหาอย่างเป็นระบบ',
          name_EN: 'Systematic Problem Solving',
          slug: 'systematic-problem-solving',
          icon: 'Waypoints'
        },
        {
          sortOrder: 3,
          name_TH: 'การคิดเชิงระบบและบริบททางสังคม',
          name_EN: 'Systems Thinking & Societal Context',
          slug: 'systems-thinking-societal-context',
          icon: 'Network'
        }
      ]
    },
    {
      id: 2,
      name_TH: 'การสื่อสาร',
      name_EN: 'Communication',
      icon: 'MessageSquare',
      slug: 'communication',
      sortOrder: 5,
      subSkills: [
        {
          sortOrder: 1,
          name_TH: 'ทักษะการนำเสนอ',
          name_EN: 'Presentation Skills',
          slug: 'presentation-skills',
          icon: 'Presentation'
        },
        {
          sortOrder: 2,
          name_TH: 'การฟังและความเข้าใจ',
          name_EN: 'Listening and Comprehension',
          slug: 'listening-comprehension',
          icon: 'Ear'
        },
        {
          sortOrder: 3,
          name_TH: 'การสื่อสารภาษาอังกฤษ',
          name_EN: 'English Communication',
          slug: 'english-communication',
          icon: 'Languages'
        }
      ]
    },
    {
      id: 3,
      name_TH: 'การทำงานเป็นทีมและความร่วมมือ',
      name_EN: 'Teamwork & Collaboration',
      icon: 'Users',
      slug: 'teamwork-collaboration',
      sortOrder: 4,
      subSkills: [
        {
          sortOrder: 1,
          name_TH: 'ความเข้าใจในบทบาทและการปฏิบัติงาน',
          name_EN: 'Role Understanding and Execution',
          slug: 'role-understanding-execution',
          icon: 'IdCard'
        },
        {
          sortOrder: 2,
          name_TH: 'การจัดการงาน',
          name_EN: 'Task Management',
          slug: 'task-management',
          icon: 'ListChecks'
        },
        {
          sortOrder: 3,
          name_TH: 'การทำงานร่วมกัน',
          name_EN: 'Collaborative Work',
          slug: 'collaborative-work',
          icon: 'Handshake'
        }
      ]
    },
    {
      id: 4,
      name_TH: 'การเติบโตทางวิชาชีพและการปรับตัว',
      name_EN: 'Professional Growth & Adaptability',
      icon: 'TrendingUp',
      slug: 'professional-growth-adaptability',
      sortOrder: 3,
      subSkills: [
        {
          sortOrder: 1,
          name_TH: 'ความคล่องตัวในการเรียนรู้',
          name_EN: 'Learning Agility',
          slug: 'learning-agility',
          icon: 'BookOpen'
        },
        {
          sortOrder: 2,
          name_TH: 'ความรู้ด้านดิจิทัล',
          name_EN: 'Digital Literacy',
          slug: 'digital-literacy',
          icon: 'MonitorSmartphone'
        },
        {
          sortOrder: 3,
          name_TH: 'ความเชี่ยวชาญด้านเครื่องมือ',
          name_EN: 'Tool Proficiency',
          slug: 'tool-proficiency',
          icon: 'Wrench'
        }
      ]
    },
    {
      id: 5,
      name_TH: 'นวัตกรรมและความเข้าใจทางธุรกิจ',
      name_EN: 'Innovation & Business Acumen',
      icon: 'Lightbulb',
      slug: 'innovation-business-acumen',
      sortOrder: 2,
      subSkills: [
        {
          sortOrder: 1,
          name_TH: 'การออกแบบที่ยึดมนุษย์เป็นศูนย์กลาง',
          name_EN: 'Human-Centered Design',
          slug: 'human-centered-design',
          icon: 'UserSearch'
        },
        {
          sortOrder: 2,
          name_TH: 'การบริหารโครงการ',
          name_EN: 'Project Management',
          slug: 'project-management',
          icon: 'Kanban'
        },
        {
          sortOrder: 3,
          name_TH: 'ความตระหนักรู้ทางธุรกิจและการเป็นผู้ประกอบการ',
          name_EN: 'Business & Entrepreneurial Awareness',
          slug: 'business-entrepreneurial-awareness',
          icon: 'Briefcase'
        }
      ]
    },
    {
      id: 6,
      name_TH: 'การพัฒนาตนเองและความยืดหยุ่น',
      name_EN: 'Self-Development & Resilience',
      icon: 'HeartPulse',
      slug: 'self-development-resilience',
      sortOrder: 1,
      subSkills: [
        {
          sortOrder: 1,
          name_TH: 'การเติบโตส่วนบุคคลและการตระหนักรู้ในตนเอง',
          name_EN: 'Personal Growth & Self-Awareness',
          slug: 'personal-growth-self-awareness',
          icon: 'Target'
        },
        {
          sortOrder: 2,
          name_TH: 'ความยืดหยุ่นและการปรับตัว',
          name_EN: 'Resilience & Adaptability',
          slug: 'resilience-adaptability',
          icon: 'Repeat2'
        },
        {
          sortOrder: 3,
          name_TH: 'ความเข้าอกเข้าใจและความเข้าใจระหว่างบุคคล',
          name_EN: 'Empathy & Interpersonal Understanding',
          slug: 'empathy-interpersonal-understanding',
          icon: 'HandHeart'
        }
      ]
    }
  ]

  try {
    console.log('Clearing existing data...')
    await prisma.role.deleteMany()
    await prisma.staffRole.deleteMany()
    await prisma.subSkillCategory.deleteMany()
    await prisma.mainSkillCategory.deleteMany()
    await prisma.majorCategory.deleteMany()

    // Seed Roles
    console.log('\n🌱 Seeding roles...')
    for (const roleData of roles) {
      const role = await prisma.role.create({
        data: roleData
      })
      console.log(`Created role: ${role.name} (ID: ${role.id})`)
    }
    const totalRoles = await prisma.role.count()
    console.log(`Total roles in database: ${totalRoles}`)

    // Create SUPREME user
    console.log('\n🍀 Creating default SUPREME user...')
    await prisma.user.create({
      data: {
        id: 99999999,
        firstName: 'talentdev',
        lastName: 'eng.cmu.ac.th',
        email: 'talentdev@eng.cmu.ac.th',
        faculty: 'LEAP Development',
        role_id: 6,
        isActive: true,
      },
    })
    console.log('Created default SUPREME user: talentdev@eng.cmu.ac.th')

    // Seed Staff Roles
    console.log('\n🌱 Seeding staff roles...')
    for (const staffRoleData of staffRoles) {
      const staffRole = await prisma.staffRole.create({
        data: staffRoleData
      })
      console.log(`Created staff role: ${staffRole.name} (ID: ${staffRole.id})`)
    }
    const totalStaffRoles = await prisma.staffRole.count()
    console.log(`Total staff roles in database: ${totalStaffRoles}`)

    // Seed Major Categories
    console.log('\n🌱 Seeding major categories...')
    for (const majorData of majorCategories) {
      const major = await prisma.majorCategory.create({
        data: {
          ...majorData,
          isActive: true
        }
      })
      console.log(`Created major: ${major.code} - ${major.name_TH} (ID: ${major.id})`)
    }
    const totalMajors = await prisma.majorCategory.count()
    console.log(`Total major categories in database: ${totalMajors}`)

    // Seed Main Skills and Sub Skills
    console.log('\n🌱 Seeding main skill categories and sub skills...')
    for (const mainSkillData of mainSkills) {
      const { subSkills, ...mainSkillInfo } = mainSkillData
      
      const mainSkill = await prisma.mainSkillCategory.create({
        data: {
          ...mainSkillInfo,
          isActive: true
        }
      })
      console.log(`Created main skill: ${mainSkill.name_TH} (ID: ${mainSkill.id})`)

      // Create sub skills
      for (const subSkillData of subSkills) {
        const subSkill = await prisma.subSkillCategory.create({
          data: {
            ...subSkillData,
            mainSkillCategory_id: mainSkill.id,
            isActive: true
          }
        })
        console.log(`   ↳ Created sub skill: ${subSkill.name_TH} (ID: ${subSkill.id})`)
      }
    }

    
    const totalMainSkills = await prisma.mainSkillCategory.count()
    const totalSubSkills = await prisma.subSkillCategory.count()
    console.log(`Total main skills in database: ${totalMainSkills}`)
    console.log(`Total sub skills in database: ${totalSubSkills}`)
    
    console.log('\n🌱 Seeding academic years...')


    const currentAcademicYear = await prisma.academicYear.upsert({
      where: { year_TH: 2568 },
      update: {
        year_TH: 2568,
        year_EN: 2025,
        semesterStart: new Date('2025-06-22T00:00:00.000Z'),
        semesterEnd: new Date('2026-06-08T23:59:59.999Z'),
        isActive: true
      },
      create: {
        year_TH: 2568,
        year_EN: 2025,
        semesterStart: new Date('2025-06-22T00:00:00.000Z'),
        semesterEnd: new Date('2026-06-08T23:59:59.999Z'),
        isActive: true
      }
    })
    console.log(`Created Academic Year: ${currentAcademicYear.year_TH} (${currentAcademicYear.semesterStart.toLocaleDateString('th-TH')} - ${currentAcademicYear.semesterEnd.toLocaleDateString('th-TH')})`)


    console.log('🎨 Seeding icons...')

    const icons = [
      {
        name: 'Brain',
        url: 'https://lucide.dev/icons/brain',
        description: 'การคิดเชิงวิพากษ์และการแก้ปัญหา (Critical Thinking & Problem Solving)',
      },
      {
        name: 'FunctionSquare',
        url: 'https://lucide.dev/icons/function-square',
        description: 'การให้เหตุผลเชิงวิเคราะห์ (Analytical Reasoning)',
      },
      {
        name: 'Waypoints',
        url: 'https://lucide.dev/icons/waypoints',
        description: 'การแก้ปัญหาอย่างเป็นระบบ (Systematic Problem Solving)',
      },
      {
        name: 'Network',
        url: 'https://lucide.dev/icons/network',
        description: 'การคิดเชิงระบบและบริบททางสังคม (Systems Thinking & Societal Context)',
      },
      {
        name: 'MessageSquare',
        url: 'https://lucide.dev/icons/message-square',
        description: 'การสื่อสาร (Communication)',
      },
      {
        name: 'Presentation',
        url: 'https://lucide.dev/icons/presentation',
        description: 'ทักษะการนำเสนอ (Presentation Skills)',
      },
      {
        name: 'Ear',
        url: 'https://lucide.dev/icons/ear',
        description: 'การฟังและความเข้าใจ (Listening & Comprehension)',
      },
      {
        name: 'Languages',
        url: 'https://lucide.dev/icons/languages',
        description: 'การสื่อสารภาษาอังกฤษ (English Communication)',
      },
      {
        name: 'Users',
        url: 'https://lucide.dev/icons/users',
        description: 'การทำงานเป็นทีมและความร่วมมือ (Teamwork & Collaboration)',
      },
      {
        name: 'IdCard',
        url: 'https://lucide.dev/icons/id-card',
        description: 'ความเข้าใจในบทบาทและการปฏิบัติงาน (Role Understanding & Execution)',
      },
      {
        name: 'ListChecks',
        url: 'https://lucide.dev/icons/list-checks',
        description: 'การจัดการงาน (Task Management)',
      },
      {
        name: 'Handshake',
        url: 'https://lucide.dev/icons/handshake',
        description: 'การทำงานร่วมกัน (Collaborative Work)',
      },
      {
        name: 'TrendingUp',
        url: 'https://lucide.dev/icons/trending-up',
        description: 'การเติบโตทางวิชาชีพและการปรับตัว (Professional Growth & Adaptability)',
      },
      {
        name: 'BookOpen',
        url: 'https://lucide.dev/icons/book-open',
        description: 'ความคล่องตัวในการเรียนรู้ (Learning Agility)',
      },
      {
        name: 'MonitorSmartphone',
        url: 'https://lucide.dev/icons/monitor-smartphone',
        description: 'ความรู้ด้านดิจิทัล (Digital Literacy)',
      },
      {
        name: 'Wrench',
        url: 'https://lucide.dev/icons/wrench',
        description: 'ความเชี่ยวชาญด้านเครื่องมือ (Tool Proficiency)',
      },
      {
        name: 'Lightbulb',
        url: 'https://lucide.dev/icons/lightbulb',
        description: 'นวัตกรรมและความเข้าใจทางธุรกิจ (Innovation & Business Acumen)',
      },
      {
        name: 'UserSearch',
        url: 'https://lucide.dev/icons/user-search',
        description: 'การออกแบบที่ยึดมนุษย์เป็นศูนย์กลาง (Human-Centered Design)',
      },
      {
        name: 'Kanban',
        url: 'https://lucide.dev/icons/kanban',
        description: 'การบริหารโครงการ (Project Management)',
      },
      {
        name: 'Briefcase',
        url: 'https://lucide.dev/icons/briefcase',
        description: 'ความตระหนักรู้ทางธุรกิจและการเป็นผู้ประกอบการ (Business & Entrepreneurial Awareness)',
      },
      {
        name: 'HeartPulse',
        url: 'https://lucide.dev/icons/heart-pulse',
        description: 'การพัฒนาตนเองและความยืดหยุ่น (Self-Development & Resilience)',
      },
      {
        name: 'Target',
        url: 'https://lucide.dev/icons/target',
        description: 'การเติบโตส่วนบุคคลและการตระหนักรู้ในตนเอง (Personal Growth & Self-Awareness)',
      },
      {
        name: 'Repeat2',
        url: 'https://lucide.dev/icons/repeat-2',
        description: 'ความยืดหยุ่นและการปรับตัว (Resilience & Adaptability)',
      },
      {
        name: 'HandHeart',
        url: 'https://lucide.dev/icons/hand-heart',
        description: 'ความเข้าอกเข้าใจและความเข้าใจระหว่างบุคคล (Empathy & Interpersonal Understanding)',
      },
      {
        name: 'Cpu',
        url: 'https://lucide.dev/icons/cpu',
        description: 'วิศวกรรมคอมพิวเตอร์ (Computer Engineering)',
      },
      {
        name: 'Factory',
        url: 'https://lucide.dev/icons/factory',
        description: 'วิศวกรรมอุตสาหการ (Industrial Engineering)',
      },
      {
        name: 'Zap',
        url: 'https://lucide.dev/icons/zap',
        description: 'วิศวกรรมไฟฟ้า (Electrical Engineering)',
      },
      {
        name: 'Cog',
        url: 'https://lucide.dev/icons/cog',
        description: 'วิศวกรรมเครื่องกล (Mechanical Engineering)',
      },
      {
        name: 'Construction',
        url: 'https://lucide.dev/icons/construction',
        description: 'วิศวกรรมโยธา (Civil Engineering)',
      },
      {
        name: 'FlaskConical',
        url: 'https://lucide.dev/icons/flask-conical',
        description: 'วิศวกรรมเคมี (Chemical Engineering)',
      },
      {
        name: 'Leaf',
        url: 'https://lucide.dev/icons/leaf',
        description: 'วิศวกรรมสิ่งแวดล้อม (Environmental Engineering)',
      },
      {
        name: 'Layers',
        url: 'https://lucide.dev/icons/layers',
        description: 'วิศวกรรมวัสดุ (Materials Engineering)',
      },
      { name: 'Shield',
        url: 'https://lucide.dev/icons/shield',
        description: 'Shield',
      }
    ];

    let totalIcons_sum = 0;
    try {
      console.log('Clearing existing icons...')
      await prisma.icon.deleteMany()

      console.log('\n🎨 Creating icons...')
      for (const iconData of icons) {
        const icon = await prisma.icon.create({
          data: iconData
        })
        console.log(`Created icon: ${icon.name} (ID: ${icon.id})`)
      }

      const totalIcons = await prisma.icon.count()
      console.log(`\nTotal icons in database: ${totalIcons}`)
      totalIcons_sum += totalIcons
      
      console.log('\n🎨 Icon seeding completed successfully! 🎨')

    } catch (error) {
      console.error('❌ Error seeding icons:', error)
      throw error
    }

    //SpecialSkill
    const SpecialSkill = await prisma.specialSkill.createMany({
      data: [
        {
          name_TH: 'วินัยและความรับผิดชอบ',
          name_EN: 'Discipline and Responsibility',
          slug: 'discipline-and-responsibility',
          description_TH: "ทักษะด้านวินัย ความรับผิดชอบ และการปฏิบัติตามกฎระเบียบ",
          description_EN: "Skills in discipline, responsibility and compliance",
          icon: 'Shield'

        }
      ]
    })

    console.log(`\nCreated special skills: ${SpecialSkill.count}`)

    const totalSpecialSkills = await prisma.specialSkill.count()
    console.log(`\nTotal special skills in database: ${totalSpecialSkills}`)


    const LevelThresholds = await prisma.levelThreshold.createMany({
      data: [
      { levelType: 'I', expRequired: 8,  levelName_TH: 'รู้จัก', levelName_EN: 'Familiar',       sortOrder: 1 },
      { levelType: 'II', expRequired: 16, levelName_TH: 'เข้าใจ', levelName_EN: 'Understanding', sortOrder: 2 },
      { levelType: 'III', expRequired: 32, levelName_TH: 'ใช้เป็น', levelName_EN: 'Proficient',   sortOrder: 3 },
      { levelType: 'IV', expRequired: 64, levelName_TH: 'ผู้นำ', levelName_EN: 'Leading',        sortOrder: 4 },
      ],
    })

    console.log(`\nCreated level thresholds: ${LevelThresholds.count}`)

    const totalLevelThresholds = await prisma.levelThreshold.count()
    console.log(`\nTotal level thresholds in database: ${totalLevelThresholds}`)

    console.log('\n🍀Seeding process completed successfully! 🍀')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Summary:`)
    console.log(`   • Roles: ${totalRoles}`)
    console.log(`   • Staff Roles: ${totalStaffRoles}`)
    console.log(`   • Major Categories: ${totalMajors}`)
    console.log(`   • Main Skills: ${totalMainSkills}`)
    console.log(`   • Sub Skills: ${totalSubSkills}`)
    console.log(`   • Special Skills: ${totalSpecialSkills}`)
    console.log(`   • Icons: ${totalIcons_sum}`)
    console.log(`   • Level Thresholds: ${totalLevelThresholds}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    throw error
  }
}

if (require.main === module) {
  seedRoles()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}