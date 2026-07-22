import mongoose from 'mongoose';

const websiteContentSchema = new mongoose.Schema(
  {
    isGlobal: { type: Boolean, default: true, unique: true }, // Singleton

    homepage: {
      hero: {
        title: { type: String, default: 'Learn Without Limits' },
        subtitle: { type: String, default: 'Build skills with courses taught by world-class instructors.' },
        primaryButtonText: { type: String, default: 'Explore Courses' },
        primaryButtonUrl: { type: String, default: '/explore' },
        secondaryButtonText: { type: String, default: 'Become an Instructor' },
        secondaryButtonUrl: { type: String, default: '/instructor-signup' },
        heroImage: { type: String, default: '' },
      },
      stats: {
        studentsCount: { type: String, default: '10,000+' },
        coursesCount: { type: String, default: '200+' },
        instructorsCount: { type: String, default: '50+' },
      },
      featuredCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
      featuredInstructors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      partners: [
        {
          logoUrl: { type: String, required: true },
          websiteUrl: { type: String },
          displayOrder: { type: Number, default: 0 }
        }
      ],
      banner: {
        enabled: { type: Boolean, default: false },
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        ctaText: { type: String, default: '' },
        ctaUrl: { type: String, default: '' },
        backgroundImage: { type: String, default: '' },
      },
      sectionsVisibility: {
        hero: { type: Boolean, default: true },
        stats: { type: Boolean, default: true },
        featuredCourses: { type: Boolean, default: true },
        featuredInstructors: { type: Boolean, default: true },
        partners: { type: Boolean, default: true },
        testimonials: { type: Boolean, default: true },
      }
    },

    about: {
      companyStory: { type: String, default: '' },
      mission: { type: String, default: '' },
      vision: { type: String, default: '' },
      values: [{ title: String, description: String }],
      timeline: [
        { year: String, title: String, description: String, displayOrder: Number }
      ],
      teamMembers: [
        {
          name: { type: String },
          position: { type: String },
          image: { type: String },
          bio: { type: String },
          socialLinks: {
            linkedin: { type: String },
            twitter: { type: String },
          },
          displayOrder: { type: Number, default: 0 },
          isHidden: { type: Boolean, default: false }
        }
      ]
    },

    contact: {
      supportEmail: { type: String, default: 'support@program.com' },
      businessEmail: { type: String, default: 'business@program.com' },
      phoneNumbers: [{ label: String, number: String }],
      whatsappNumber: { type: String, default: '' },
      address: { type: String, default: '' },
      googleMapsUrl: { type: String, default: '' },
      businessHours: { type: String, default: 'Mon-Fri 9AM-5PM' },
      socialMediaLinks: {
        facebook: { type: String, default: '' },
        instagram: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        tiktok: { type: String, default: '' },
        youtube: { type: String, default: '' },
        github: { type: String, default: '' },
      }
    }
  },
  { timestamps: true }
);

const WebsiteContent = mongoose.model('WebsiteContent', websiteContentSchema);

export default WebsiteContent;
