import { useState, useEffect, useRef } from 'react';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import api from '../api/axios';

import CustomSelect from './CustomSelect';

export default function AuthPage({ onLoginSuccess, isLightMode, toggleTheme }) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Multi-step Registration State
  const [registerStep, setRegisterStep] = useState(1);
  const [stepDirection, setStepDirection] = useState('forward');
  
  // Step 1 Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [role, setRole] = useState('student');
  
  // Step 2 Fields
  const [department, setDepartment] = useState('');
  const [otherDepartment, setOtherDepartment] = useState('');
  const [college, setCollege] = useState('');
  const [year, setYear] = useState('');
  const [track, setTrack] = useState('');
  const [providedCourses, setProvidedCourses] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  
  // Step 3 Fields
  const [goalsText, setGoalsText] = useState('');
  const [selectedPills, setSelectedPills] = useState([]);
  
  // Loading State
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [authError, setAuthError] = useState('');

  const DEPARTMENTS = [
    "Computer Science", "Information Technology", "Software Engineering", 
    "Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
    "Business Administration", "Accounting", "Marketing",
    "Medicine", "Pharmacy", "Dentistry", "Architecture",
    "Arts & Humanities", "Law", "Sciences", "Education"
  ];

  const calculateStrength = (pass) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 1;
    if (/[A-Za-z]/.test(pass) && /[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    return strength;
  };
  const passStrength = calculateStrength(password);



  const PILLS = [
    { id: 'job', label: 'Get a job', icon: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>, color: '#f87171' },
    { id: 'projects', label: 'Build projects', icon: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>, color: '#9ca3af' },
    { id: 'skills', label: 'Learn skills', icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>, color: '#fb923c' },
    { id: 'freelance', label: 'Freelance', icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>, color: '#facc15' },
    { id: 'grad', label: 'Grad project', icon: <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>, color: '#a78bfa' },
    { id: 'cert', label: 'Get certified', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>, color: '#fcd34d' },
  ];

  const togglePill = (label) => {
    let newPills;
    if (selectedPills.includes(label)) {
      newPills = selectedPills.filter(p => p !== label);
    } else {
      newPills = [...selectedPills, label];
    }
    setSelectedPills(newPills);
    setGoalsText(newPills.join(', '));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (isLogin) {
      setIsCreatingAccount(true);
      try {
        const response = await api.post('/auth/login', { email, password, rememberMe });
        onLoginSuccess(response.data.user);
      } catch (err) {
        setAuthError(err.response?.data?.message || 'Failed to login');
        setIsCreatingAccount(false);
      }
    } else {
      const maxSteps = role === 'instructor' ? 2 : 3;
      if (registerStep < maxSteps) {
        if (registerStep === 1) {

          setIsCreatingAccount(true);
          try {
            await api.post('/auth/check-email', { email });
            setIsCreatingAccount(false);
            setStepDirection('forward');
            setRegisterStep(registerStep + 1);
          } catch (err) {
            setAuthError(err.response?.data?.message || 'Email already exists');
            setIsCreatingAccount(false);
          }
        } else {
          setStepDirection('forward');
          setRegisterStep(registerStep + 1);
        }
      } else {
        setIsCreatingAccount(true);
        try {
          const payload = {
            name: `${firstName} ${lastName}`.trim(), email, password, role,
            university: department === 'Other' ? otherDepartment : department,
            year,
            college,
            track,
            providedCourses,
            linkedinUrl,
            socialUrl,
            goalsText,
            selectedPills
          };
          const response = await api.post('/auth/register', payload);
          onLoginSuccess(response.data.user);
        } catch (err) {
          setAuthError(err.response?.data?.message || 'Registration failed');
          setIsCreatingAccount(false);
        }
      }
    }
  };

  const renderStepIcon = (num, label, icon) => {
    const isCompleted = registerStep > num;
    const isActive = registerStep === num;
    return (
      <div className={`step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
        <div className="step-icon">
          {isCompleted ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ) : icon}
        </div>
        <span className="step-label">{label}</span>
      </div>
    );
  };

  return (
    <div className="auth-wrapper animate-entrance">
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme} 
        className="nav-icon-btn-auth"
        title="Toggle Theme"
        style={{ position: 'fixed', top: '24px', left: '24px', zIndex: 100 }}
      >
        {isLightMode ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        )}
      </button>

      <div className="auth-split-grid">
        
        {/* Left Side: Branding / Marketing Copy */}
        <div className="auth-left">
          <div className="auth-header">
            <img 
              src={isLightMode ? `${logoLight}?v=3` : `${logoDark}?v=3`} 
              alt="Program Logo" 
              className="auth-logo"
            />
          </div>
          
          <h1>
            Learn from <span className="highlight">real courses.</span><br/>
            <span className="highlight">track real progress.</span>
          </h1>
          
          <p>
            Program connects students with instructor-built courses — browse, enroll, watch lessons, and track your progress in one place.
          </p>
        </div>

        {/* Right Side: Auth Card */}
        <div className="auth-right">
          <div className="auth-card solid-card">
            
            <div className="auth-header">
              <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
              <p>{isLogin ? 'Sign in to continue your learning journey' : 'Join Program and start your journey today'}</p>
            </div>

            {/* Segmented Control */}
            <div className="auth-tabs">
              <div className={`tab-slider ${!isLogin ? 'slide-right' : ''}`}></div>
              <button 
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => { setIsLogin(true); setRegisterStep(1); setStepDirection('forward'); }}
                type="button"
              >
                Sign In
              </button>
              <button 
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => { setIsLogin(false); setStepDirection('forward'); }}
                type="button"
              >
                Register
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>

              <div className={`expandable-section ${!isLogin ? 'expanded' : ''}`}>
                <div className="expandable-content">
                  {/* Visual Step Indicator for Registration */}
                  <div className={`step-indicator ${stepDirection}`}>
                    <div className="step-line">
                      <div className="step-progress" style={{ width: registerStep === 1 ? '0%' : (role === 'instructor' && registerStep === 2 ? '100%' : (registerStep === 2 ? '50%' : '100%')) }}></div>
                    </div>
                    
                    {renderStepIcon(1, 'Account', <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>)}
                    {renderStepIcon(2, role === 'instructor' ? 'Profile' : 'Academic', <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>)}
                    {role === 'student' && renderStepIcon(3, 'Vision', <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>)}
                  </div>

                  {/* Step 1: Account */}
                  {(!isLogin && registerStep === 1) && (
                    <div className="step-content animate-entrance">
                      <div className="role-selection" style={{ display: 'flex', gap: '10px', marginBottom: '0.75rem' }}>
                        <div 
                          className={`role-card ${role === 'student' ? 'selected' : ''}`} 
                          onClick={() => setRole('student')}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                          <div style={{ fontWeight: '600' }}>Student</div>
                        </div>
                        <div 
                          className={`role-card ${role === 'instructor' ? 'selected' : ''}`} 
                          onClick={() => setRole('instructor')}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                          <div style={{ fontWeight: '600' }}>Instructor</div>
                        </div>
                      </div>
                      
                      <div className="input-row">
                        <div className="input-group">
                          <label>First Name *</label>
                          <input type="text" placeholder="Ahmed" required={!isLogin} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </div>
                        <div className="input-group">
                          <label>Last Name *</label>
                          <input type="text" placeholder="Al-Rashidi" required={!isLogin} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Academic */}
                  {registerStep === 2 && (
                    <div className="step-content animate-entrance">
                      <div className="input-group">
                        <label>Department *</label>
                        <div className="custom-select-container">
                          <CustomSelect 
                            options={[
                              ...DEPARTMENTS.map(d => ({ value: d, label: d })),
                              { value: 'Other', label: 'Other' }
                            ]}
                            value={department}
                            onChange={setDepartment}
                            placeholder="e.g. Computer Science, Engineering"
                            icon={<svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>}
                          />
                        </div>
                      </div>
                      
                      {department === 'Other' && (
                        <div className="input-group animate-entrance">
                          <input type="text" placeholder="Type your department name..." value={otherDepartment} onChange={(e) => setOtherDepartment(e.target.value)} required />
                        </div>
                      )}

                      {role === 'student' ? (
                        <>
                          <div className="input-row">
                            <div className="input-group">
                              <label>College / Faculty *</label>
                              <div className="icon-input-wrapper">
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                <input type="text" placeholder="e.g. Engineering" required value={college} onChange={(e) => setCollege(e.target.value)} />
                              </div>
                            </div>
                            <div className="input-group">
                              <label>Year / Level *</label>
                              <CustomSelect 
                                options={[
                                  { value: '1', label: '1st Year' },
                                  { value: '2', label: '2nd Year' },
                                  { value: '3', label: '3rd Year' },
                                  { value: '4', label: '4th Year' },
                                  { value: '5', label: '5th Year' },
                                  { value: 'Graduated', label: 'Graduated' }
                                ]}
                                value={year}
                                onChange={setYear}
                                placeholder="Select year"
                                icon={<svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}
                              />
                            </div>
                          </div>

                          <div className="input-group">
                            <label>Track / Specialization *</label>
                            <div className="icon-input-wrapper">
                              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                              <input type="text" placeholder="e.g. Computer Science, AI, Full-Stack" required value={track} onChange={(e) => setTrack(e.target.value)} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="input-group">
                            <label>Courses you provide *</label>
                            <div className="icon-input-wrapper">
                              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                              <input type="text" placeholder="e.g. React, Node.js, Machine Learning" required value={providedCourses} onChange={(e) => setProvidedCourses(e.target.value)} />
                            </div>
                          </div>
                          <div className="input-row">
                            <div className="input-group">
                              <label>LinkedIn Profile</label>
                              <div className="icon-input-wrapper">
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                                <input type="url" placeholder="linkedin.com/in/username" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
                              </div>
                            </div>
                            <div className="input-group">
                              <label>Other Social / Website</label>
                              <div className="icon-input-wrapper">
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                <input type="url" placeholder="github.com/username" value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 3: Vision */}
                  {registerStep === 3 && role === 'student' && (
                    <div className="step-content animate-entrance">
                      <div className="vision-header">
                        <div className="vision-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </div>
                        <div>
                          <h3 className="vision-title">Your goal <span className="badge-optional">OPTIONAL</span></h3>
                          <p className="vision-subtitle">What do you hope to achieve with Program?</p>
                        </div>
                      </div>
                      
                      <div className="goal-pills">
                        {PILLS.map((pill) => (
                          <button
                            key={pill.id}
                            type="button"
                            className={`goal-pill ${selectedPills.includes(pill.label) ? 'selected' : ''}`}
                            onClick={() => togglePill(pill.label)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={pill.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {pill.icon}
                            </svg>
                            {pill.label}
                          </button>
                        ))}
                      </div>

                      <div className="smart-textarea-wrapper">
                        <textarea 
                          placeholder="Tell us more about your goals..."
                          value={goalsText}
                          onChange={(e) => setGoalsText(e.target.value)}
                          maxLength={400}
                        ></textarea>
                        <div className="char-count">{goalsText.length} / 400</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Core Auth Fields (Always visible for Login, visible in Step 1 for Register) */}
              {(isLogin || registerStep === 1) && (
                <div className="step-content animate-entrance">
                  {authError && <div className="auth-error-message" style={{ color: '#ef4444', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', fontSize: '0.9rem' }}>{authError}</div>}
                  <div className="input-group">
                    <label>Email Address *</label>
                    <input type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  
                  <div className="input-group">
                    <label>Password *</label>
                    <div className="password-input-wrapper">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder={isLogin ? '••••••••' : 'Min 8 characters'} 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                    {!isLogin && (
                      <div className="password-strength-container">
                        <div className="strength-bars">
                          <div className={`strength-bar ${passStrength >= 1 ? 'weak' : ''}`}></div>
                          <div className={`strength-bar ${passStrength >= 2 ? 'medium' : ''}`}></div>
                          <div className={`strength-bar ${passStrength >= 3 ? 'strong' : ''}`}></div>
                        </div>
                        <span className="strength-text">
                          {passStrength === 0 ? 'Password strength' : passStrength === 1 ? 'Weak' : passStrength === 2 ? 'Medium' : 'Strong'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isLogin && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--c-sub)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                  </label>
                  <a className="forgot-password">Forgot password?</a>
                </div>
              )}

              <div className="auth-actions">
                {!isLogin && registerStep > 1 && (
                  <button 
                    type="button" 
                    className="solid-btn auth-back-btn" 
                    onClick={() => {
                        setStepDirection('backward');
                        setRegisterStep(registerStep - 1);
                    }}
                    disabled={isCreatingAccount}
                  >
                    Back
                  </button>
                )}
                
                <button type="submit" className="solid-btn auth-submit-btn" disabled={isCreatingAccount}>
                  {isCreatingAccount ? (
                    <span className="spinner-wrapper">
                      <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                      {!isLogin && registerStep === 1 ? 'Checking...' : 'Creating account...'}
                    </span>
                  ) : (
                    isLogin ? (
                      <>Sign In <svg className="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></>
                    ) : (
                      registerStep === (role === 'instructor' ? 2 : 3) ? 'Create Account' : (
                        <>Continue <svg className="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></>
                      )
                    )
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
