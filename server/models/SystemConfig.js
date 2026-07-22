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
      tax: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      refundWindow: { type: Number, default: 14 },
      minWithdrawal: { type: Number, default: 50 },
      stripeEnabled: { type: Boolean, default: true },
      paypalEnabled: { type: Boolean, default: false },
    },

    registration: {
      studentRegistration: { type: Boolean, default: true },
      instructorRegistration: { type: Boolean, default: true },
      eduEmailOnly: { type: Boolean, default: false },
      emailVerification: { type: Boolean, default: true },
      phoneVerification: { type: Boolean, default: false },
      inviteOnly: { type: Boolean, default: false },
      autoApproveInstructors: { type: Boolean, default: false },
    },

    security: {
      passwordPolicy: { type: String, default: 'strong' },
      sessionTimeout: { type: Number, default: 60 },
      maxLoginAttempts: { type: Number, default: 5 },
      twoFactorAuth: { type: Boolean, default: false },
      jwtExpiration: { type: Number, default: 7 },
      allowedDomains: { type: String, default: '' },
      maintenanceLock: { type: Boolean, default: false },
    },

    storage: {
      provider: { type: String, default: 'AWS S3' },
      maxUploadSizeMb: { type: Number, default: 50 },
      allowedFileTypes: { type: String, default: '.mp4,.pdf,.zip,.jpg,.png' },
    },

    email: {
      smtpHost: { type: String, default: 'smtp.sendgrid.net' },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String, default: 'apikey' },
      smtpPass: { type: String, default: '' },
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
      platformLogo: { type: String, default: '' },
      favicon: { type: String, default: '' },
      defaultTheme: { type: String, default: 'system' },
      accentColor: { type: String, default: '#3B82F6' },
      landingBanner: { type: String, default: '' },
      footerInfo: { type: String, default: '© 2026 Program' },
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
