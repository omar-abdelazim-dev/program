import { Link } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import logoDark from '../assets/logo-dark.png';
import '../styles/landing-page.css';

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
    story: {
      eyebrowLeft: 'Who we are',
      titleLeft: 'Learning should open doors for everyone.',
      copyLeft: 'Program began with a simple belief: exceptional education should feel close, practical, and personal. We bring curious learners together with people who have the experience to guide them.',
      eyebrowRight: 'Our vision',
      titleRight: 'A global learning community powered by real expertise.',
      copyRight: 'We are building a place where knowledge travels farther, instructors are rewarded for what they know, and every learner can turn a next step into lasting progress.'
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
    },
    colors: {
      primaryText: '#18181b',
      secondaryText: '#71717a',
      accentStudent: '#3b82f6',
      accentInstructor: '#f59e0b'
    }
  };

  return (
    <div className="landing-page" dir="ltr" style={{
      '--landing-primary-text': c.colors.primaryText,
      '--landing-secondary-text': c.colors.secondaryText,
      '--landing-accent-student': c.colors.accentStudent,
      '--landing-accent-instructor': c.colors.accentInstructor
    }}>
      <header className="landing-hero">
        <div className="landing-hero__shapes" aria-hidden="true">
          <span className="landing-shape landing-shape--square" />
          <span className="landing-shape landing-shape--circle" />
          <span className="landing-shape landing-shape--triangle" />
          <span className="landing-shape landing-shape--bar" />
        </div>

        <nav className="landing-nav landing-shell" aria-label="Primary navigation">
          <Link className="landing-brand" to="/" aria-label="Program home">
            <img src={logoDark} alt="Program Logo" className="landing-brand__img" style={{ height: '32px', width: 'auto' }} />
          </Link>

          <div className="landing-nav__links">
            <a href="#our-story">Our story</a>
            <a href="#your-path">Your path</a>
            <Link to="/auth">Sign in</Link>
          </div>
        </nav>

        <div className="landing-hero__content landing-shell">
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
      </header>

      <main>
        <section className="landing-story" id="our-story" aria-labelledby="story-title">
          <div className="landing-story__grid landing-shell">
            <article className="landing-story__column">
              <p className="landing-eyebrow landing-eyebrow--student">{c.story.eyebrowLeft}</p>
              <h2 id="story-title">{c.story.titleLeft}</h2>
              <p>
                {c.story.copyLeft}
              </p>
            </article>

            <article className="landing-story__column landing-story__column--vision">
              <p className="landing-eyebrow landing-eyebrow--instructor">{c.story.eyebrowRight}</p>
              <h2>{c.story.titleRight}</h2>
              <p>
                {c.story.copyRight}
              </p>
            </article>
          </div>
        </section>

        <section className="landing-paths" id="your-path" aria-labelledby="paths-title">
          <div className="landing-shell">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">{c.paths.eyebrow}</p>
              <h2 id="paths-title">{c.paths.title}</h2>
              <p>{c.paths.copy}</p>
            </div>

            <div className="landing-paths__grid">
              <article className="landing-path-card landing-path-card--student">
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

              <article className="landing-path-card landing-path-card--instructor">
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
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__inner landing-shell">
          <p className="landing-eyebrow">Your next chapter starts here</p>
          <h2>Join a community that is serious about growth.</h2>
          <p>Learn with purpose. Teach with confidence. Build what comes next together.</p>
          <Link className="landing-button landing-button--community" to="/auth?mode=register">
            Join Program <CheckIcon />
          </Link>
          <small>© {new Date().getFullYear()} Program. Bulilt by Students. Powered by Purpose.</small>
        </div>
      </footer>
    </div>
  );
}
