import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import api from '../api/axios';

import CustomSelect from './CustomSelect';
import { COLLEGES } from '../data/colleges';
import { MAJORS } from '../data/majors';
import { ACADEMIC_TYPES, SCHOOL_LEVELS } from '../data/academicGroups';

export default function AuthPage({ onLoginSuccess, isLightMode, toggleTheme }) {
  const { t, i18n } = useTranslation();
  // Footer's "Become an Instructor" link (?mode=register&role=instructor) lands
  // here pre-selected, since register/login share this one component/route.
  const initialParams = new URLSearchParams(window.location.search);
  const [isLogin, setIsLogin] = useState(initialParams.get('mode') !== 'register');

  // Multi-step Registration State
  const [registerStep, setRegisterStep] = useState(1);
  const [stepDirection, setStepDirection] = useState('forward');

  // Step 1 Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [role, setRole] = useState(initialParams.get('role') === 'instructor' ? 'instructor' : 'student');
  
  // Step 2 Fields
  const [college, setCollege] = useState('');
  const [year, setYear] = useState('');
  const [major, setMajor] = useState('');
  const [academicType, setAcademicType] = useState('college');
  const [academicGroup, setAcademicGroup] = useState('');
  const [providedCoursesList, setProvidedCoursesList] = useState([]);
  const [courseInput, setCourseInput] = useState('');
  const [instructorStatus, setInstructorStatus] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  
  // Step 3 Fields
  const [goalsText, setGoalsText] = useState('');
  
  // Loading State
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [authError, setAuthError] = useState('');

  // OTP & Reset State
  const [authView, setAuthView] = useState('default'); // 'default', 'forgot_request', 'otp_verify'
  const [otpPurpose, setOtpPurpose] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [forgotResendCooldown, setForgotResendCooldown] = useState(60);

  useEffect(() => {
    let timer;
    if (authView === 'otp_verify' && forgotResendCooldown > 0) {
      timer = setInterval(() => {
        setForgotResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authView, forgotResendCooldown]);

  const handleResendForgotOtp = async () => {
    if (forgotResendCooldown > 0 || isCreatingAccount) return;
    setIsCreatingAccount(true);
    setAuthError('');
    try {
      if (otpPurpose === 'password_reset') {
        await api.post('/auth/reset-password/request-otp', {
          email: otpEmail,
          newPassword
        });
      } else if (otpPurpose === 'register_verification') {
        await api.post('/auth/resend-verification', { email: otpEmail });
      }
      setForgotResendCooldown(60);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Error resending verification code');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  useEffect(() => {
    let timer;
    if (registerOtpSent && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [registerOtpSent, resendCooldown]);

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isCreatingAccount) return;
    setIsCreatingAccount(true);
    setAuthError('');
    try {
      await api.post('/auth/send-registration-otp', {
        name: `${firstName} ${lastName}`.trim(),
        email,
        password
      });
      setResendCooldown(60);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Error resending verification code');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const calculateStrength = (pass) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 1;
    if (/[A-Za-z]/.test(pass) && /[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    return strength;
  };
  const passStrength = calculateStrength(password);

  const getTranslatedError = (msg) => {
    if (!msg) return '';
    let rawMsg = msg;
    let attempts = null;
    if (typeof msg === 'string' && msg.includes('|')) {
      const parts = msg.split('|');
      rawMsg = parts[0];
      attempts = parts[1];
    }
    if (rawMsg === 'Invalid email or password') {
      if (attempts !== null && attempts !== undefined) {
        return t('auth.err_invalid_credentials_attempts', 'Invalid email or password ({{attempts}} attempts remaining)', { attempts });
      }
      return t('auth.err_invalid_credentials', 'Invalid email or password');
    }
    if (rawMsg === 'An account with this email already exists' || rawMsg === 'This email is already in use.' || rawMsg === 'This email is already exists') return t('auth.err_email_exists', 'An account with this email already exists');
    if (rawMsg === 'Invalid code.' || rawMsg === 'Invalid verification code') return t('auth.err_invalid_code', 'Invalid verification code');
    if (rawMsg === 'This code has expired.' || rawMsg === 'Verification expired. Please restart registration.') return t('auth.err_code_expired', 'Code expired. Please request a new one.');
    if (rawMsg === 'This code has already been used.') return t('auth.err_code_used', 'This code has already been used.');
    if (rawMsg === 'Your email address is not verified.') return t('auth.err_email_not_verified', 'Your email address is not verified.');
    if (typeof rawMsg === 'string' && rawMsg.includes('Account is locked')) return t('auth.err_account_locked', 'Account is locked. Please reset your password.');
    if (typeof rawMsg === 'string' && rawMsg.includes('Your account has been blocked')) return t('auth.err_account_blocked', 'Your account has been blocked. Please contact support');
    return t(`auth.errors.${rawMsg}`, rawMsg);
  };



  const PILLS = [
    { id: 'job', label: t('auth.goals.job'), icon: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>, color: '#f87171' },
    { id: 'projects', label: t('auth.goals.projects'), icon: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>, color: '#9ca3af' },
    { id: 'skills', label: t('auth.goals.skills'), icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>, color: '#fb923c' },
    { id: 'freelance', label: t('auth.goals.freelance'), icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>, color: '#facc15' },
    { id: 'grad', label: t('auth.goals.grad'), icon: <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>, color: '#a78bfa' },
    { id: 'cert', label: t('auth.goals.cert'), icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>, color: '#fcd34d' },
  ];

  const selectedPills = PILLS.filter(pill => 
    goalsText.split(',').map(s => s.trim()).includes(pill.label)
  ).map(p => p.label);

  const togglePill = (label) => {
    if (selectedPills.includes(label)) {
      const newText = goalsText.split(',')
        .map(s => s.trim())
        .filter(s => s !== label && s !== '')
        .join(', ');
      setGoalsText(newText);
    } else {
      setGoalsText(goalsText ? `${goalsText}, ${label}` : label);
    }
  };

  const INSTRUCTOR_STATUS_OPTIONS = [
    { value: 'student', label: t('auth.instructor_status_student', 'Student') },
    { value: 'graduate', label: t('auth.instructor_status_graduate', 'Graduated') },
    { value: 'employed', label: t('auth.instructor_status_employed', 'Employed / Working') },
    { value: 'unemployed', label: t('auth.instructor_status_unemployed', 'Not Working / Job Seeker') },
    { value: 'teacher', label: t('auth.instructor_status_teacher', 'Teacher / Educator') },
    { value: 'doctor', label: t('auth.instructor_status_doctor', 'Academic Doctor / Professor') },
    { value: 'teaching_assistant', label: t('auth.instructor_status_teaching_assistant', 'Teaching Assistant (TA)') },
  ];

  const handleAddCourse = (e) => {
    if (e) e.preventDefault();
    const trimmed = courseInput.trim();
    if (trimmed && !providedCoursesList.some(course => course.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
      setProvidedCoursesList(prev => [...prev, trimmed]);
      setCourseInput('');
    }
  };

  const handleRemoveCourse = (courseToRemove) => {
    setProvidedCoursesList(prev => prev.filter(c => c !== courseToRemove));
  };

  const handleCourseKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddCourse();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (authView === 'forgot_request') {
      if (newPassword !== confirmNewPassword) {
        setAuthError(t('auth.password_mismatch') || 'Passwords do not match');
        return;
      }

      setIsCreatingAccount(true);
      try {
        await api.post('/auth/reset-password/request-otp', { email: otpEmail, newPassword });
        setOtpPurpose('password_reset');
        setForgotResendCooldown(60);
        setAuthView('otp_verify');
      } catch (err) {
        setAuthError(err.response?.data?.message || 'Failed to request OTP');
      } finally {
        setIsCreatingAccount(false);
      }
      return;
    }

    if (authView === 'otp_verify') {
      setIsCreatingAccount(true);
      try {
        if (otpPurpose === 'password_reset') {
          await api.post('/auth/reset-password/verify-otp', { email: otpEmail, otp: otpCode });
          setAuthError('');
          setAuthView('default');
          setIsLogin(true);
        } else if (otpPurpose === 'register_verification') {
          await api.post('/auth/verify-email', { email: otpEmail, otp: otpCode });
          const response = await api.post('/auth/login', { email: otpEmail, password, rememberMe });
          localStorage.setItem(`${response.data.user.role}_lang`, i18n.language);
          onLoginSuccess(response.data.user);
        }
      } catch (err) {
        setAuthError(err.response?.data?.message || 'Verification failed');
      } finally {
        setIsCreatingAccount(false);
      }
      return;
    }

    if (isLogin) {
      setIsCreatingAccount(true);
      try {
        const response = await api.post('/auth/login', { email, password, rememberMe });
        localStorage.setItem(`${response.data.user.role}_lang`, i18n.language);
        onLoginSuccess(response.data.user);
      } catch (err) {
        if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
          setOtpEmail(email);
          setOtpPurpose('register_verification');
          setAuthView('otp_verify');
          setForgotResendCooldown(60);
          // Login only tells us verification is missing — it doesn't send a
          // code itself, so the account arrives at the OTP screen with
          // nothing to enter unless we request one here.
          try {
            await api.post('/auth/resend-verification', { email });
          } catch (resendErr) {
            setAuthError(resendErr.response?.data?.message || 'Failed to send verification code');
          }
        } else if (err.response?.data?.code === 'LOCKED_PENDING_RESET') {
          setOtpEmail(email);
          setAuthView('forgot_request');
        } else {
          const errMsg = err.response?.data?.message || 'Failed to login';
          const remAttempts = err.response?.data?.remainingAttempts;
          setAuthError(remAttempts !== undefined ? `${errMsg}|${remAttempts}` : errMsg);
        }
        setIsCreatingAccount(false);
      }
    } else {
      const maxSteps = role === 'instructor' ? 2 : 3;
      if (registerStep < maxSteps) {
        if (registerStep === 1) {
          if (!registerOtpSent) {
            setIsCreatingAccount(true);
            try {
              await api.post('/auth/send-registration-otp', {
                name: `${firstName} ${lastName}`.trim(),
                email,
                password
              });
              setRegisterOtpSent(true);
              setResendCooldown(60);
              setAuthError('');
            } catch (err) {
              setAuthError(err.response?.data?.message || 'Error sending verification code');
            } finally {
              setIsCreatingAccount(false);
            }
          } else {
            setIsCreatingAccount(true);
            try {
              await api.post('/auth/verify-registration-otp', { email, otp: otpCode });
              setStepDirection('forward');
              setRegisterStep(registerStep + 1);
              setAuthError('');
            } catch (err) {
              setAuthError(err.response?.data?.message || 'Invalid verification code');
            } finally {
              setIsCreatingAccount(false);
            }
          }
        } else {
          setStepDirection('forward');
          setRegisterStep(registerStep + 1);
        }
      } else {
        let finalCourses = [...providedCoursesList];
        if (courseInput.trim() && !finalCourses.includes(courseInput.trim())) {
          finalCourses.push(courseInput.trim());
        }

        if (role === 'instructor') {
          if (!instructorStatus) {
            setAuthError(t('auth.instructor_status_required', 'Please select your current status / profession'));
            return;
          }
          if (finalCourses.length === 0) {
            setAuthError(t('auth.no_courses_added', 'Please add at least one course'));
            return;
          }
        }

        setIsCreatingAccount(true);
        try {
          const payload = {
            name: `${firstName} ${lastName}`.trim(), email, password, role,
            year,
            college,
            major,
            academicType,
            academicGroup: academicType === 'school' ? academicGroup : college,
            providedCourses: finalCourses.join(', '),
            instructorStatus,
            linkedinUrl,
            socialUrl,
            goalsText,
            selectedPills
          };
          const response = await api.post('/auth/register', payload);
          localStorage.setItem(`${response.data.user.role}_lang`, i18n.language);
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
      {/* Utility Actions */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 100, display: 'flex', gap: '12px' }} dir="ltr">
        <button 
          onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ar" : "en")} 
          className="nav-icon-btn-auth"
          style={{ fontWeight: '600', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}
        >
          {i18n.language === "ar" ? "EN" : "AR"}
        </button>
      </div>

      <div className="auth-split-grid">
        
        {/* Left Side: Branding / Marketing Copy */}
        <div className="auth-left">
          <div className="auth-header">
            <img 
              src={isLightMode ? logoLight : logoDark} 
              alt="Program Logo" 
              className="auth-logo"
            />
          </div>
          
          <h1>
            {t('auth.hero_h1_1')} <span className="highlight">{t('auth.hero_h1_highlight_1')}</span><br/>
            <span className="highlight">{t('auth.hero_h1_highlight_2')}</span>
          </h1>
          
          <p>
            {t('auth.hero_copy')}
          </p>
        </div>

        {/* Right Side: Auth Card */}
        <div className="auth-right">
          <div className="auth-card solid-card">
            
            <div className="auth-header">
              <h2>{isLogin ? t('auth.welcome_back') : t('auth.create_account')}</h2>
              <p>{isLogin ? t('auth.sign_in_desc') : t('auth.join_desc')}</p>
            </div>

            {/* Segmented Control */}
            <div className="auth-tabs">
              <div className={`tab-slider ${!isLogin ? 'slide-right' : ''}`}></div>
              <button 
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => { setIsLogin(true); setRegisterStep(1); setStepDirection('forward'); }}
                type="button"
              >
                {t('auth.sign_in')}
              </button>
              <button 
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => { setIsLogin(false); setStepDirection('forward'); }}
                type="button"
              >
                {t('auth.register')}
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
              {authView === 'default' ? (
                <>
                  <div className={`expandable-section ${!isLogin ? 'expanded' : ''}`}>
                <div className="expandable-content">
                  {/* Visual Step Indicator for Registration */}
                  <div className={`step-indicator ${stepDirection}`}>
                    <div className="step-line">
                      <div className="step-progress" style={{ width: registerStep === 1 ? '0%' : (role === 'instructor' && registerStep === 2 ? '100%' : (registerStep === 2 ? '50%' : '100%')) }}></div>
                    </div>
                    
                    {renderStepIcon(1, t('auth.step_account'), <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>)}
                    {renderStepIcon(2, role === 'instructor' ? t('auth.step_profile') : t('auth.step_academic'), <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>)}
                    {role === 'student' && renderStepIcon(3, t('auth.step_vision'), <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>)}
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
                          <div style={{ fontWeight: '600' }}>{t('auth.role_student')}</div>
                        </div>
                        <div 
                          className={`role-card ${role === 'instructor' ? 'selected' : ''}`} 
                          onClick={() => setRole('instructor')}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                          <div style={{ fontWeight: '600' }}>{t('auth.role_instructor')}</div>
                        </div>
                      </div>
                      
                      <div className="input-row">
                        <div className="input-group">
                          <label>{t('auth.first_name')}</label>
                          <input type="text" placeholder="Ahmed" required={!isLogin} value={firstName} onChange={(e) => { if (/^[a-zA-Z\u0600-\u06FF\s\-']*$/.test(e.target.value)) setFirstName(e.target.value); }} />
                        </div>
                        <div className="input-group">
                          <label>{t('auth.last_name')}</label>
                          <input type="text" placeholder="Al-Rashidi" required={!isLogin} value={lastName} onChange={(e) => { if (/^[a-zA-Z\u0600-\u06FF\s\-']*$/.test(e.target.value)) setLastName(e.target.value); }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Academic */}
                  {registerStep === 2 && (
                    <div className="step-content animate-entrance">
                      {role === 'student' ? (
                        <>
                          <div className="input-row">
                            <div className="input-group">
                              <label>Academic path</label>
                              <CustomSelect options={ACADEMIC_TYPES} value={academicType} onChange={(value) => { setAcademicType(value); setAcademicGroup(''); }} placeholder="Choose College / Major or School" />
                            </div>
                            {academicType === 'college' ? <>
                            <div className="input-group">
                              <label>{t('auth.college')}</label>
                              <CustomSelect 
                                options={COLLEGES.map(c => ({ value: c.id, label: t(c.key, c.id) }))}
                                value={college}
                                onChange={setCollege}
                                placeholder={t('auth.college_placeholder')}
                                icon={<svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>}
                              />
                            </div>
                            <div className="input-group">
                              <label>{t('auth.year')}</label>
                              <CustomSelect 
                                options={[
                                  { value: '1', label: t('auth.years.year_1') },
                                  { value: '2', label: t('auth.years.year_2') },
                                  { value: '3', label: t('auth.years.year_3') },
                                  { value: '4', label: t('auth.years.year_4') },
                                  { value: '5', label: t('auth.years.year_5') },
                                  { value: 'Graduated', label: t('auth.years.graduated') }
                                ]}
                                value={year}
                                onChange={setYear}
                                placeholder={t('auth.year_placeholder')}
                                icon={<svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}
                              />
                            </div>
                          <div className="input-group">
                            <label>{t('auth.major')} *</label>
                            <CustomSelect
                              options={MAJORS.map(m => ({ value: m.id, label: t(`majors.${m.id}`) }))}
                              value={major}
                              onChange={setMajor}
                              placeholder={t('auth.major_placeholder')}
                              icon={<svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>}
                            />
                            </div>
                            </> : <>
                            <div className="input-group">
                              <label>School level *</label>
                              <CustomSelect options={SCHOOL_LEVELS} value={academicGroup} onChange={setAcademicGroup} placeholder="Select school level" />
                            </div>
                            </>}
                          </div>
                          </>
                      ) : (
                        <>
                          <div className="input-group">
                            <label>{t('auth.instructor_status')} *</label>
                            <CustomSelect
                              options={INSTRUCTOR_STATUS_OPTIONS}
                              value={instructorStatus}
                              onChange={setInstructorStatus}
                              placeholder={t('auth.instructor_status_placeholder')}
                              icon={<svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}
                            />
                          </div>

                          <div className="input-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label>{t('auth.courses_provided')}</label>
                              {providedCoursesList.length > 0 && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--c-orange, #f97316)', fontWeight: '600' }}>
                                  {providedCoursesList.length} {t('auth.courses_count')}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <div className="icon-input-wrapper" style={{ flex: 1 }}>
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                <input 
                                  type="text" 
                                  placeholder={t('auth.courses_provided_placeholder')} 
                                  value={courseInput} 
                                  onChange={(e) => { if (/^[a-zA-Z\u0600-\u06FF\s,.-0-9#+]*$/.test(e.target.value)) setCourseInput(e.target.value); }}
                                  onKeyDown={handleCourseKeyDown}
                                  maxLength={120}
                                />
                              </div>
                              <button 
                                type="button" 
                                className="solid-btn"
                                onClick={handleAddCourse}
                                style={{
                                  padding: '0 18px',
                                  borderRadius: '12px',
                                  fontSize: '0.9rem',
                                  height: '46px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  gap: '6px'
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                <span>{t('auth.add_course')}</span>
                              </button>
                            </div>

                            {providedCoursesList.length > 0 && (
                              <div className="courses-tag-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                {providedCoursesList.map((course, idx) => (
                                  <div 
                                    key={idx} 
                                    className="course-chip animate-entrance"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 12px',
                                      borderRadius: '10px',
                                      background: 'var(--bg-main)',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.85rem',
                                      fontWeight: '600',
                                      border: '1px solid rgba(249, 115, 22, 0.35)',
                                      boxShadow: 'var(--inner-shadow)'
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #f97316)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                    <span>{course}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCourse(course)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: '0 2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s',
                                        marginLeft: '2px'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                      title={t('auth.remove_course')}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="input-row">
                            <div className="input-group">
                              <label>{t('auth.linkedin')}</label>
                              <div className="icon-input-wrapper">
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                                <input type="url" placeholder="linkedin.com/in/username" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
                              </div>
                            </div>
                            <div className="input-group">
                              <label>{t('auth.social_website')}</label>
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
                          <h3 className="vision-title">{t('auth.vision_title')} <span className="badge-optional">{t('auth.optional')}</span></h3>
                          <p className="vision-subtitle">{t('auth.vision_subtitle')}</p>
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
                          placeholder={t('auth.vision_placeholder')}
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
                  {authError && (
                    <div 
                      className="auth-error-message" 
                      style={{ 
                        color: '#ef4444', 
                        marginBottom: '1rem', 
                        padding: '8px 16px', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        borderRadius: '8px', 
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        width: 'fit-content',
                        maxWidth: '100%',
                        boxShadow: 'var(--inner-shadow, inset 0 2px 4px rgba(0, 0, 0, 0.4))',
                        border: 'none'
                      }}
                    >
                      {getTranslatedError(authError)}
                    </div>
                  )}
                  <div className="input-row">
                    <div className="input-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '22px' }}>
                        <label>{t('auth.email')}</label>
                      </div>
                      <input type="email" placeholder="you@example.com" required value={email} onChange={(e) => { setEmail(e.target.value); setRegisterOtpSent(false); }} />
                    </div>
                    
                    <div className="input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '22px', flexWrap: 'wrap', gap: '4px' }}>
                          <label style={{ whiteSpace: 'nowrap' }}>{t('auth.password')}</label>
                          {!isLogin && (
                            <div className="password-strength-container" style={{ margin: 0, gap: '8px' }}>
                              <div className="strength-bars" style={{ width: '60px', flex: 'none' }}>
                                <div className={`strength-bar ${passStrength >= 1 ? 'weak' : ''}`}></div>
                                <div className={`strength-bar ${passStrength >= 2 ? 'medium' : ''}`}></div>
                                <div className={`strength-bar ${passStrength >= 3 ? 'strong' : ''}`}></div>
                              </div>
                              <span className="strength-text" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                {passStrength === 0 ? t('auth.password_strength') : passStrength === 1 ? t('auth.strength_weak') : passStrength === 2 ? t('auth.strength_medium') : t('auth.strength_strong')}
                              </span>
                            </div>
                          )}
                        </div>
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
                    </div>
                  </div>
                  {!isLogin && registerOtpSent && (
                    <div className="input-group" style={{ marginTop: '1rem' }}>
                      <label>{t('auth.verification_code', 'Verification Code')}</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="6-digit code" 
                        maxLength={6} 
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        style={{ letterSpacing: '0.2rem', textAlign: 'center', fontSize: '1.2rem' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--c-sub)', margin: 0 }}>
                          {t('auth.code_sent_to', 'Code sent to {{email}}', { email })}
                        </p>
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resendCooldown > 0 || isCreatingAccount}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: resendCooldown > 0 ? 'var(--c-sub)' : 'var(--c-primary, #f97316)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                            padding: 0,
                            textDecoration: resendCooldown > 0 ? 'none' : 'underline'
                          }}
                        >
                          {resendCooldown > 0 ? t('auth.resend_in', 'Resend in {{seconds}}s', { seconds: resendCooldown }) : t('auth.resend_code', 'Resend Code')}
                        </button>
                      </div>
                    </div>
                  )}
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
                    {t('auth.remember_me')}
                  </label>
                  <a className="forgot-password" onClick={() => { setOtpEmail(email); setAuthError(''); setAuthView('forgot_request'); }} style={{ cursor: 'pointer' }}>{t('auth.forgot_password')}</a>
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
                    {t('auth.back')}
                  </button>
                )}
                
                <button type="submit" className="solid-btn auth-submit-btn" disabled={isCreatingAccount}>
                  {isCreatingAccount ? (
                    <span className="spinner-wrapper">
                      <svg className="btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                      {isLogin ? t('auth.signing_in') : (registerStep === 1 ? t('auth.checking') : t('auth.creating_account'))}
                    </span>
                  ) : (
                    isLogin ? (
                      <>{t('auth.sign_in')} <svg className="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></>
                    ) : (
                      registerStep === (role === 'instructor' ? 2 : 3) ? t('auth.create_account') : (
                        <>{t('auth.continue')} <svg className="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></>
                      )
                    )
                  )}
                </button>
              </div>
                </>
              ) : authView === 'forgot_request' ? (
                <div className="step-content animate-entrance">
                  {authError && (
                    <div className="auth-error-message" style={{ color: '#ef4444', marginBottom: '1rem', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                      {getTranslatedError(authError)}
                    </div>
                  )}
                  <div className="input-group">
                    <label>{t('auth.email')}</label>
                    <input type="email" required value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>{t('auth.new_password', 'New Password')}</label>
                    <div className="password-input-wrapper">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        required 
                        autoComplete="new-password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        className="password-toggle"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>{t('auth.confirm_new_password', 'Confirm New Password')}</label>
                    <div className="password-input-wrapper">
                      <input 
                        type={showConfirmNewPassword ? "text" : "password"} 
                        required 
                        autoComplete="new-password" 
                        value={confirmNewPassword} 
                        onChange={(e) => setConfirmNewPassword(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        className="password-toggle"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      >
                        {showConfirmNewPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="auth-actions" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="solid-btn auth-back-btn" onClick={() => { setAuthError(''); setAuthView('default'); }}>{t('auth.back')}</button>
                    <button type="submit" className="solid-btn auth-submit-btn" disabled={isCreatingAccount}>
                      {isCreatingAccount ? <span className="spinner-wrapper">{t('auth.checking')}</span> : t('auth.request_otp', 'Request OTP')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="step-content animate-entrance">
                  <div style={{ marginBottom: '1rem', color: 'var(--c-text)', fontSize: '0.95rem' }}>
                    {t('auth.otp_verify_desc', 'An OTP has been sent to {{email}}. Please enter it below to {{action}}.', {
                      email: otpEmail,
                      action: otpPurpose === 'password_reset' ? t('auth.action_reset_password', 'reset your password') : t('auth.action_verify_account', 'verify your account')
                    })}
                  </div>
                  {authError && (
                    <div className="auth-error-message" style={{ color: '#ef4444', marginBottom: '1rem', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                      {getTranslatedError(authError)}
                    </div>
                  )}
                  <div className="input-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>{t('auth.otp_code', 'OTP Code')}</label>
                      <button
                        type="button"
                        onClick={handleResendForgotOtp}
                        disabled={forgotResendCooldown > 0 || isCreatingAccount}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: forgotResendCooldown > 0 ? 'var(--c-sub)' : 'var(--c-primary, #f97316)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: forgotResendCooldown > 0 ? 'not-allowed' : 'pointer',
                          padding: 0,
                          textDecoration: forgotResendCooldown > 0 ? 'none' : 'underline'
                        }}
                      >
                        {forgotResendCooldown > 0 ? t('auth.resend_in', 'Resend in {{seconds}}s', { seconds: forgotResendCooldown }) : t('auth.resend_code', 'Resend Code')}
                      </button>
                    </div>
                    <input type="text" required value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6} style={{ letterSpacing: '0.2rem', textAlign: 'center', fontSize: '1.2rem' }} />
                  </div>
                  <div className="auth-actions" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="solid-btn auth-back-btn" onClick={() => { setAuthError(''); setAuthView('default'); }}>{t('auth.back')}</button>
                    <button type="submit" className="solid-btn auth-submit-btn" disabled={isCreatingAccount}>
                      {isCreatingAccount ? <span className="spinner-wrapper">{t('auth.checking')}</span> : t('auth.verify_otp', 'Verify OTP')}
                    </button>
                  </div>
                </div>
              )}
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
