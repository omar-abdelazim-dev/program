import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema(
  {
    // A singleton document
    isGlobal: { type: Boolean, default: true, unique: true },

    general: {
      platformName: { type: String, default: 'Program' },
      contactEmail: { type: String, default: 'contact@program.com' },
      supportEmail: { type: String, default: 'support@program.com' },
      homepageAnnouncement: { type: String, default: '' },
    },
    
    financial: {
      commission: { type: Number, default: 15, min: 0, max: 100 },
      currency: { type: String, default: 'EGP' },
      refundWindow: { type: Number, default: 14 },
      minWithdrawal: { type: Number, default: 50 },
      // Students transfer funds outside the platform and submit proof for
      // admin review. These recipient details are deliberately exposed by the
      // public config endpoint so the checkout can show where to transfer.
      instaPayEnabled: { type: Boolean, default: true },
      mobileWalletEnabled: { type: Boolean, default: true },
      instaPayAccount: { type: String, default: '', maxlength: 120 },
      mobileWalletNumber: { type: String, default: '', maxlength: 30 },
      manualPaymentInstructions: { type: String, default: '', maxlength: 500 },
      // Company contact info shown on the payment notice (superadmin only)
      companyPhone: { type: String, default: '', maxlength: 30 },
      companyInstaPayAccount: { type: String, default: '', maxlength: 120 },
    },

    registration: {
      studentRegistration: { type: Boolean, default: true },
      instructorRegistration: { type: Boolean, default: true },
      eduEmailOnly: { type: Boolean, default: false },
      emailVerification: { type: Boolean, default: true },
      phoneVerification: { type: Boolean, default: false },
      inviteOnly: { type: Boolean, default: false },
      // ADM-11: autoApproveInstructors removed — instructor registrations
      // always require manual admin review, no exceptions.
    },

    security: {
      passwordPolicy: { type: String, default: 'strong' },
      sessionTimeout: { type: Number, default: 60 },
      maxLoginAttempts: { type: Number, default: 5 },
      twoFactorAuth: { type: Boolean, default: false },
      // Minutes, not days — a 7-day token was a standing risk if ever stolen.
      // Kept in the 30-90 minute range recommended for session tokens.
      jwtExpiration: { type: Number, default: 60 },
      allowedDomains: { type: String, default: '' },
      maintenanceLock: { type: Boolean, default: false },
    },

    storage: {
      provider: { type: String, default: 'Cloudinary' },
      maxUploadSizeMb: { type: Number, default: 50 },
      allowedFileTypes: { type: String, default: '.mp4,.pdf,.zip,.jpg,.png' },
    },

    notifications: {
      studentEmails: { type: Boolean, default: true },
      instructorEmails: { type: Boolean, default: true },
      adminAlerts: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: false },
      systemAlerts: { type: Boolean, default: true },
    },

    appearance: {
      platformLogo: { type: String, default: '', maxlength: 500 },
      favicon: { type: String, default: '', maxlength: 500 },
      defaultTheme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
      accentColor: { type: String, default: '#3B82F6', maxlength: 20 },
      landingBanner: { type: String, default: '', maxlength: 500 },
      footerInfo: { type: String, default: '', maxlength: 500 },
    },

    landingPage: {
      hero: {
        eyebrow: { type: String, default: 'Education built around possibility' },
        titlePart1: { type: String, default: 'Master Your Craft. ' },
        titlePart2: { type: String, default: 'Share Your Expertise.' },
        copy: { type: String, default: 'Program makes high-quality learning and teaching more accessible, so ambition—not access—sets the limit on what comes next.' },
        studentCtaText: { type: String, default: 'Start Learning' },
        studentCtaLink: { type: String, default: '/auth?mode=register&role=student' },
        instructorCtaText: { type: String, default: 'Start Teaching' },
        instructorCtaLink: { type: String, default: '/auth?mode=register&role=instructor' }
      },
      social: {
        email: { type: String, default: 'hello@program.com' },
        instagram: { type: String, default: 'https://instagram.com/' },
        facebook: { type: String, default: 'https://facebook.com/' },
        tiktok: { type: String, default: 'https://tiktok.com/' },
      },
      stats: {
        type: [{
          label: { type: String },
          value: { type: Number },
          suffix: { type: String },
          isFloat: { type: Boolean, default: false }
        }],
        default: [
          { label: 'Active Learners', value: 10000, suffix: '+', isFloat: false },
          { label: 'Expert Instructors', value: 500, suffix: '+', isFloat: false },
          { label: 'Average Rating', value: 4.9, suffix: '/5', isFloat: true },
          { label: 'Courses Completed', value: 25000, suffix: '+', isFloat: false }
        ]
      },
      story: {
        eyebrowLeft: { type: String, default: 'Who we are' },
        titleLeft: { type: String, default: 'Learning should open doors for everyone.' },
        copyLeft: { type: String, default: 'Program began with a simple belief: exceptional education should feel close, practical, and personal. We bring curious learners together with people who have the experience to guide them.' },
        eyebrowRight: { type: String, default: 'Our vision' },
        titleRight: { type: String, default: 'A global learning community powered by real expertise.' },
        copyRight: { type: String, default: 'We are building a place where knowledge travels farther, instructors are rewarded for what they know, and every learner can turn a next step into lasting progress.' }
      },
      paths: {
        eyebrow: { type: String, default: 'One community, two ways forward' },
        title: { type: String, default: 'Choose the path that moves you.' },
        copy: { type: String, default: 'Whether you are growing a skill set or growing an audience, Program is designed to help your work go further.' },
        studentTitle: { type: String, default: 'Build skills that take you places.' },
        studentCopy: { type: String, default: 'Find focused courses, learn at your pace, and make every completed lesson count.' },
        studentCtaText: { type: String, default: 'Explore learning' },
        studentCtaLink: { type: String, default: '/auth?mode=register&role=student' },
        instructorTitle: { type: String, default: 'Teach what you know best.' },
        instructorCopy: { type: String, default: 'Create courses easily, connect with students directly, and build a new revenue stream.' },
        instructorCtaText: { type: String, default: 'Start teaching' },
        instructorCtaLink: { type: String, default: '/auth?mode=register&role=instructor' }
      },
    },

    maintenance: {
      isMaintenanceMode: { type: Boolean, default: false },
      message: { type: String, default: 'We are currently upgrading the system.' },
      estimatedCompletion: { type: String, default: '2 hours' },
      whitelist: { type: String, default: 'admin@program.com' },
    },

    backup: {
      frequency: { type: String, default: 'daily' },
      lastBackup: { type: Date, default: Date.now },
    },

    logs: {
      retentionDays: { type: Number, default: 30 },
    },

    api: {
      status: { type: String, default: 'active' },
      version: { type: String, default: 'v1' },
      webhookUrl: { type: String, default: '' },
      rateLimit: { type: Number, default: 100 },
    },

    features: {
      notebook: { type: Boolean, default: true },
      community: { type: Boolean, default: false },
      marketplace: { type: Boolean, default: false },
      aiTutor: { type: Boolean, default: false },
      referral: { type: Boolean, default: true },
      betaFeatures: { type: Boolean, default: false },
    },

    ai: {
      provider: { type: String, default: 'OpenAI' },
      model: { type: String, default: 'gpt-4o' },
      temperature: { type: Number, default: 0.7 },
      dailyTokenLimit: { type: Number, default: 100000 },
      prompts: { type: String, default: '' },
    },

    audit: {
      retentionDays: { type: Number, default: 90 },
      trackUsers: { type: Boolean, default: true },
      trackAdmins: { type: Boolean, default: true },
      trackFinancial: { type: Boolean, default: true },
      trackSettings: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

export default SystemConfig;
