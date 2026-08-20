import { Link } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import logo from '../assets/logo.png'; // Assuming logo.png is for light mode, if not we can adjust
import GlobalAnnouncementBanner from './GlobalAnnouncementBanner';
import '../styles/landing-page.css';
import { useState, useEffect, useRef } from 'react';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5v16" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-4 3 2 5-6" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="m16.5 7.5 3-3" />
      <path d="M15 4.5h4.5V9" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}


const getSafeExternalUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return '';

  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};

const studentBenefits = [
  {
    title: 'Learn by doing',
    description: 'Turn each lesson into practical momentum with interactive, project-led learning.',
    Icon: BookIcon,
  },
  {
    title: 'See your progress',
    description: 'Keep a clear view of every skill, milestone, and course you have completed.',
    Icon: ChartIcon,
  },
  {
    title: 'Move toward your career',
    description: 'Build the confidence and proof of work that help you pursue your dream role.',
    Icon: TargetIcon,
  },
];

const instructorBenefits = [
  {
    title: 'Build a trusted brand',
    description: 'Share your perspective and become the mentor learners return to.',
    Icon: SparkIcon,
  },
  {
    title: 'Teach without the busywork',
    description: 'Create, organize, and manage your courses from one focused workspace.',
    Icon: BookIcon,
  },
  {
    title: 'Monetize your knowledge',
    description: 'Transform expertise into a sustainable, meaningful income stream.',
    Icon: ChartIcon,
  },
];

function CountUp({ end, decimals = 0, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated) {
        setHasAnimated(true);
        let startTimestamp = null;
        const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          // easeOutQuart
          const easeProgress = 1 - Math.pow(1 - progress, 4);
          setCount(easeProgress * end);
          if (progress < 1) {
            window.requestAnimationFrame(step);
          }
        };
        window.requestAnimationFrame(step);
      }
    }, { threshold: 0.1 });

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }
    return () => {
      if (currentElement) observer.disconnect();
    };
  }, [end, duration, hasAnimated]);

  const formattedNumber = decimals > 0 
    ? count.toFixed(decimals) 
    : Math.floor(count).toLocaleString();

  return <span ref={elementRef}>{formattedNumber}{suffix}</span>;
}



function BenefitList({ benefits, variant }) {
  return (
    <ul className="landing-path-card__benefits">
      {benefits.map(({ title, description, Icon }) => (
        <li key={title}>
          <span className={`landing-benefit-icon landing-benefit-icon--${variant}`}>
            <Icon />
          </span>
          <span>
            <strong>{title}</strong>
            <span>{description}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function LandingPage() {
  const { config } = useConfig();
  const c = config?.landingPage || {
    hero: {
      eyebrow: 'Education built around possibility',
      titlePart1: 'Master Your Craft. ',
      titlePart2: 'Share Your Expertise.',
      copy: 'Program makes high-quality learning and teaching more accessible, so ambition—not access—sets the limit on what comes next.',
      studentCtaText: 'Start Learning',
      studentCtaLink: '/auth?mode=register&role=student',
      instructorCtaText: 'Start Teaching',
      instructorCtaLink: '/auth?mode=register&role=instructor'
    },
    paths: {
      eyebrow: 'One community, two ways forward',
      title: 'Choose the path that moves you.',
      copy: 'Whether you are growing a skill set or growing an audience, Program is designed to help your work go further.',
      studentTitle: 'Build skills that take you places.',
      studentCopy: 'Find focused courses, learn at your pace, and make every completed lesson count.',
      studentCtaText: 'Explore learning',
      studentCtaLink: '/auth?mode=register&role=student',
      instructorTitle: 'Turn what you know into impact.',
      instructorCopy: 'Create a course experience that reflects your expertise and reaches learners ready for it.',
      instructorCtaText: 'Start teaching',
      instructorCtaLink: '/auth?mode=register&role=instructor'
    }
  };

  const social = c.social || {};
  const socialLinks = {
    email: typeof social.email === 'string' ? social.email.trim() : '',
    instagram: getSafeExternalUrl(social.instagram),
    facebook: getSafeExternalUrl(social.facebook),
    tiktok: getSafeExternalUrl(social.tiktok),
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="landing-page" dir="ltr">
      <header className="landing-header">
        <nav className="landing-nav" aria-label="Primary navigation">
          <Link className="landing-brand" to="/" aria-label="Program home">
            <div className="landing-brand__icon">
              <img src={logo} alt="Program Logo" className="landing-brand__img" style={{ height: '28px', width: 'auto', scale: 2.5, }} />
            </div>
          </Link>

          <div className="landing-nav__links">
            <a href="#features">Features</a>
            <a href="#your-path">Your path</a>
          </div>

          <Link to="/auth" className="landing-nav__cta">Sign in</Link>
        </nav>
      </header>
      
      <GlobalAnnouncementBanner />

      <main>
        {/* HERO SECTION */}
        <section className="landing-hero landing-shell">
          <div className="landing-hero__text reveal-left">
            <p className="landing-eyebrow">{c.hero.eyebrow}</p>
            <h1>{c.hero.titlePart1} <span>{c.hero.titlePart2}</span></h1>
            <p className="landing-hero__copy">
              {c.hero.copy}
            </p>
            <div className="landing-hero__actions">
              <Link className="landing-button landing-button--student" to={c.hero.studentCtaLink}>
                {c.hero.studentCtaText} <ArrowIcon />
              </Link>
              <Link className="landing-button landing-button--instructor" to={c.hero.instructorCtaLink}>
                {c.hero.instructorCtaText} <ArrowIcon />
              </Link>
            </div>
          </div>
          <div className="landing-hero__visual reveal-right delay-200">
            <div className="hero-3d-placeholder">
              <div className="hero-3d-placeholder-inner">
                <div className="hero-3d-circle"></div>
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-illustration">
                  <path d="M120 70L80 130H150L120 70Z" fill="url(#paint1_linear)"/>
                  <rect x="50" y="80" width="40" height="40" rx="8" fill="url(#paint2_linear)" />
                  <defs>
                    <linearGradient id="paint1_linear" x1="80" y1="70" x2="150" y2="130" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#f59e0b"/>
                      <stop offset="1" stopColor="#ef4444"/>
                    </linearGradient>
                    <linearGradient id="paint2_linear" x1="50" y1="80" x2="90" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3b82f6"/>
                      <stop offset="1" stopColor="#10b981"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="landing-stats landing-shell">
          <div className="stats-grid reveal">
            {(c.stats || []).map((stat, idx) => (
              <div key={idx} className={`stat-card delay-${idx * 100}`}>
                <h3><CountUp end={stat.value} suffix={stat.suffix || ''} decimals={stat.isFloat ? 1 : 0} /></h3>
                <p>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES SHOWCASE */}
        <section id="features" className="landing-features landing-shell">
          <div className="landing-section-heading text-center mx-auto reveal">
            <p className="landing-eyebrow">How it works</p>
            <h2>Everything you need to succeed</h2>
            <p>From interactive assignments to comprehensive analytics, we provide the tools to elevate your learning and teaching experience.</p>
          </div>
          <div className="features-grid">
             <div className="feature-block reveal delay-100">
                <div className="feature-icon"><BookIcon /></div>
                <h4>Interactive Lessons</h4>
                <p>Engage with hands-on material that transforms passive reading into active skill-building.</p>
             </div>
             <div className="feature-block reveal delay-200">
                <div className="feature-icon"><ChartIcon /></div>
                <h4>Actionable Analytics</h4>
                <p>Track your progress or your students' performance with clear, insightful dashboards.</p>
             </div>
             <div className="feature-block reveal delay-300">
                <div className="feature-icon"><SparkIcon /></div>
                <h4>Community Driven</h4>
                <p>Connect with peers, share knowledge, and grow together in a supportive environment.</p>
             </div>
          </div>
        </section>

        {/* YOUR PATH SECTION */}
        <section className="landing-paths" id="your-path" aria-labelledby="paths-title">
          <div className="landing-shell">
            <div className="landing-section-heading text-center mx-auto reveal">
              <p className="landing-eyebrow">{c.paths.eyebrow}</p>
              <h2 id="paths-title">{c.paths.title}</h2>
              <p>{c.paths.copy}</p>
            </div>

            <div className="landing-paths__grid">
              <article className="landing-path-card landing-path-card--student reveal-left">
                <div className="landing-path-card__topline">
                  <span className="landing-path-card__badge landing-path-card__badge--student">For students</span>
                  <span className="landing-path-card__symbol landing-path-card__symbol--student" aria-hidden="true"><BookIcon /></span>
                </div>
                <h3>{c.paths.studentTitle}</h3>
                <p className="landing-path-card__intro">{c.paths.studentCopy}</p>
                <BenefitList benefits={studentBenefits} variant="student" />
                <Link className="landing-path-card__link landing-path-card__link--student" to={c.paths.studentCtaLink}>
                  {c.paths.studentCtaText} <ArrowIcon />
                </Link>
              </article>

              <article className="landing-path-card landing-path-card--instructor reveal-right">
                <div className="landing-path-card__topline">
                  <span className="landing-path-card__badge landing-path-card__badge--instructor">For instructors</span>
                  <span className="landing-path-card__symbol landing-path-card__symbol--instructor" aria-hidden="true"><SparkIcon /></span>
                </div>
                <h3>{c.paths.instructorTitle}</h3>
                <p className="landing-path-card__intro">{c.paths.instructorCopy}</p>
                <BenefitList benefits={instructorBenefits} variant="instructor" />
                <Link className="landing-path-card__link landing-path-card__link--instructor" to={c.paths.instructorCtaLink}>
                  {c.paths.instructorCtaText} <ArrowIcon />
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}


      </main>

      <footer className="landing-footer">
        <div className="landing-footer__inner landing-shell">
          <p className="landing-eyebrow">Your next chapter starts here</p>
          <h2>Join a community that is serious about growth.</h2>
          <p>Learn with purpose. Teach with confidence. Build what comes next together.</p>
          <Link className="landing-button landing-button--community" to="/auth?mode=register">
            Join Program <CheckIcon />
          </Link>

          <div className="landing-social-badges">
            {socialLinks.email && (
              <a href={`mailto:${socialLinks.email}`} aria-label="Email Us">
                <EmailIcon />
              </a>
            )}
            {socialLinks.instagram && (
              <a href={socialLinks.instagram} aria-label="Instagram">
                <InstagramIcon />
              </a>
            )}
            {socialLinks.facebook && (
              <a href={socialLinks.facebook} aria-label="Facebook">
                <FacebookIcon />
              </a>
            )}
            {socialLinks.tiktok && (
              <a href={socialLinks.tiktok} aria-label="TikTok">
                <TiktokIcon />
              </a>
            )}
          </div>

          <small>© {new Date().getFullYear()} Program. Built by Students. Powered by Purpose.</small>
        </div>
      </footer>
    </div>
  );
}
