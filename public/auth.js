/**
 * Authentication Page JavaScript
 * 
 * Handles login/signup forms, validation, and authentication flow
 */

(function() {
  'use strict';

  // DOM elements
  const backToHomeBtn = document.getElementById('back-to-home');
  const signinTab = document.getElementById('signin-tab');
  const signupTab = document.getElementById('signup-tab');
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');

  // Sign in form elements
  const signinFormElement = document.getElementById('signin-form-element');
  const signinEmailInput = document.getElementById('signin-email');
  const signinPasswordInput = document.getElementById('signin-password');
  const signinBtn = document.getElementById('signin-btn');
  const signinError = document.getElementById('signin-error');
  const forgotPasswordBtn = document.getElementById('forgot-password-btn');
  const googleSigninBtn = document.getElementById('google-signin-btn');

  // Sign up form elements
  const signupFormElement = document.getElementById('signup-form-element');
  const signupNameInput = document.getElementById('signup-name');
  const signupEmailInput = document.getElementById('signup-email');
  const signupPasswordInput = document.getElementById('signup-password');
  const signupPasswordConfirmInput = document.getElementById('signup-password-confirm');
  const signupBtn = document.getElementById('signup-btn');
  const signupError = document.getElementById('signup-error');
  const googleSignupBtn = document.getElementById('google-signup-btn');

  // Password reset modal elements
  const passwordResetModal = document.getElementById('password-reset-modal');
  const closeResetModal = document.getElementById('close-reset-modal');
  const resetEmailInput = document.getElementById('reset-email');
  const resetError = document.getElementById('reset-error');
  const resetSuccess = document.getElementById('reset-success');
  const sendResetBtn = document.getElementById('send-reset-btn');
  const cancelResetBtn = document.getElementById('cancel-reset-btn');

  // State
  let isLoading = false;

  /**
   * Initialize authentication page
   */
  function init() {
    console.log('Auth page initializing...');
    
    // Check for preferred tab from session storage
    const preferredTab = sessionStorage.getItem('auth_preferred_tab');
    if (preferredTab === 'signup') {
      switchTab('signup');
      sessionStorage.removeItem('auth_preferred_tab');
    }

    setupEventListeners();
    setupFormValidation();
    startAgileFlowAnimation();
    
    console.log('Auth page initialized successfully');
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Back to home button
    if (backToHomeBtn) {
      backToHomeBtn.addEventListener('click', () => {
        window.AuthUtils.redirectToHome();
      });
    }

    // Tab switching
    if (signinTab) {
      signinTab.addEventListener('click', () => switchTab('signin'));
    }
    if (signupTab) {
      signupTab.addEventListener('click', () => switchTab('signup'));
    }

    // Sign in form
    if (signinFormElement) {
      signinFormElement.addEventListener('submit', handleSigninSubmit);
    }

    // Sign up form
    if (signupFormElement) {
      signupFormElement.addEventListener('submit', handleSignupSubmit);
    }

    // Google authentication
    if (googleSigninBtn) {
      googleSigninBtn.addEventListener('click', handleGoogleAuth);
    }
    if (googleSignupBtn) {
      googleSignupBtn.addEventListener('click', handleGoogleAuth);
    }

    // Forgot password
    if (forgotPasswordBtn) {
      forgotPasswordBtn.addEventListener('click', openPasswordResetModal);
    }

    // Password reset modal
    if (closeResetModal) {
      closeResetModal.addEventListener('click', closePasswordResetModal);
    }
    if (cancelResetBtn) {
      cancelResetBtn.addEventListener('click', closePasswordResetModal);
    }
    if (sendResetBtn) {
      sendResetBtn.addEventListener('click', handlePasswordReset);
    }

    // Close modal on backdrop click
    if (passwordResetModal) {
      passwordResetModal.addEventListener('click', (e) => {
        if (e.target === passwordResetModal || e.target.classList.contains('modal-backdrop')) {
          closePasswordResetModal();
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
  }

  /**
   * Switch between signin and signup tabs
   * @param {string} tab - 'signin' or 'signup'
   */
  function switchTab(tab) {
    if (tab === 'signin') {
      signinTab.classList.add('active');
      signupTab.classList.remove('active');
      signinForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      clearErrors();
      signinEmailInput.focus();
    } else {
      signinTab.classList.remove('active');
      signupTab.classList.add('active');
      signinForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
      clearErrors();
      signupNameInput.focus();
    }
  }

  /**
   * Handle sign in form submission
   * @param {Event} e
   */
  async function handleSigninSubmit(e) {
    e.preventDefault();
    
    if (isLoading) return;

    const email = signinEmailInput.value.trim();
    const password = signinPasswordInput.value;

    // Basic validation
    if (!email || !password) {
      showError('signin', 'Please enter both email and password.');
      return;
    }

    if (!window.AuthUtils.isValidEmail(email)) {
      showError('signin', 'Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true, 'signin');
      clearError('signin');

      await window.AuthUtils.signInWithEmail(email, password);
      
      // Redirect will be handled by auth state change
      const returnUrl = window.AuthUtils.getReturnUrl();
      window.location.href = returnUrl;
      
    } catch (error) {
      console.error('Sign in error:', error);
      showError('signin', window.AuthUtils.getErrorMessage(error));
    } finally {
      setLoading(false, 'signin');
    }
  }

  /**
   * Handle sign up form submission
   * @param {Event} e
   */
  async function handleSignupSubmit(e) {
    e.preventDefault();
    
    if (isLoading) return;

    const name = signupNameInput.value.trim();
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value;
    const confirmPassword = signupPasswordConfirmInput.value;

    // Validation
    const validation = validateSignupForm(name, email, password, confirmPassword);
    if (!validation.valid) {
      showError('signup', validation.message);
      return;
    }

    try {
      setLoading(true, 'signup');
      clearError('signup');

      await window.AuthUtils.signUpWithEmail(email, password, name);
      
      // Redirect will be handled by auth state change
      const returnUrl = window.AuthUtils.getReturnUrl();
      window.location.href = returnUrl;
      
    } catch (error) {
      console.error('Sign up error:', error);
      showError('signup', window.AuthUtils.getErrorMessage(error));
    } finally {
      setLoading(false, 'signup');
    }
  }

  /**
   * Handle Google authentication
   */
  async function handleGoogleAuth() {
    if (isLoading) return;

    try {
      setLoading(true, 'google');
      clearErrors();

      await window.AuthUtils.signInWithGoogle();
      
      // Redirect will be handled by auth state change
      const returnUrl = window.AuthUtils.getReturnUrl();
      window.location.href = returnUrl;
      
    } catch (error) {
      console.error('Google auth error:', error);
      const activeTab = signinTab.classList.contains('active') ? 'signin' : 'signup';
      showError(activeTab, window.AuthUtils.getErrorMessage(error));
    } finally {
      setLoading(false, 'google');
    }
  }

  /**
   * Validate signup form
   * @param {string} name
   * @param {string} email
   * @param {string} password
   * @param {string} confirmPassword
   * @returns {Object} {valid: boolean, message: string}
   */
  function validateSignupForm(name, email, password, confirmPassword) {
    if (!name) {
      return { valid: false, message: 'Please enter your full name.' };
    }

    if (name.length < 2) {
      return { valid: false, message: 'Name must be at least 2 characters long.' };
    }

    if (!email) {
      return { valid: false, message: 'Please enter your email address.' };
    }

    if (!window.AuthUtils.isValidEmail(email)) {
      return { valid: false, message: 'Please enter a valid email address.' };
    }

    const passwordValidation = window.AuthUtils.validatePassword(password);
    if (!passwordValidation.valid) {
      return passwordValidation;
    }

    if (password !== confirmPassword) {
      return { valid: false, message: 'Passwords do not match.' };
    }

    return { valid: true, message: '' };
  }

  /**
   * Set up real-time form validation
   */
  function setupFormValidation() {
    // Email validation on blur
    [signinEmailInput, signupEmailInput].forEach(input => {
      if (input) {
        input.addEventListener('blur', () => {
          const email = input.value.trim();
          if (email && !window.AuthUtils.isValidEmail(email)) {
            input.style.borderColor = '#ef4444';
          } else {
            input.style.borderColor = '';
          }
        });
      }
    });

    // Password confirmation validation
    if (signupPasswordConfirmInput) {
      signupPasswordConfirmInput.addEventListener('input', () => {
        const password = signupPasswordInput.value;
        const confirmPassword = signupPasswordConfirmInput.value;
        
        if (confirmPassword && password !== confirmPassword) {
          signupPasswordConfirmInput.style.borderColor = '#ef4444';
        } else {
          signupPasswordConfirmInput.style.borderColor = '';
        }
      });
    }

    // Password strength indicator (optional enhancement)
    if (signupPasswordInput) {
      signupPasswordInput.addEventListener('input', () => {
        const password = signupPasswordInput.value;
        const validation = window.AuthUtils.validatePassword(password);
        
        if (password && !validation.valid) {
          signupPasswordInput.style.borderColor = '#ef4444';
        } else if (password) {
          signupPasswordInput.style.borderColor = '#10b981';
        } else {
          signupPasswordInput.style.borderColor = '';
        }
      });
    }
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} e
   */
  function handleKeyboardShortcuts(e) {
    // Tab switching with Ctrl/Cmd + number
    if ((e.ctrlKey || e.metaKey) && e.key === '1') {
      e.preventDefault();
      switchTab('signin');
    } else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
      e.preventDefault();
      switchTab('signup');
    }

    // Escape to close modal
    if (e.key === 'Escape') {
      closePasswordResetModal();
    }
  }

  /**
   * Open password reset modal
   */
  function openPasswordResetModal() {
    if (passwordResetModal) {
      passwordResetModal.classList.remove('hidden');
      resetEmailInput.value = signinEmailInput.value;
      resetEmailInput.focus();
      clearResetMessages();
    }
  }

  /**
   * Close password reset modal
   */
  function closePasswordResetModal() {
    if (passwordResetModal) {
      passwordResetModal.classList.add('hidden');
      resetEmailInput.value = '';
      clearResetMessages();
    }
  }

  /**
   * Handle password reset
   */
  async function handlePasswordReset() {
    const email = resetEmailInput.value.trim();

    if (!email) {
      showResetError('Please enter your email address.');
      return;
    }

    if (!window.AuthUtils.isValidEmail(email)) {
      showResetError('Please enter a valid email address.');
      return;
    }

    try {
      setResetLoading(true);
      clearResetMessages();

      await window.AuthUtils.sendPasswordReset(email);
      showResetSuccess('Password reset email sent! Check your inbox.');
      
      setTimeout(() => {
        closePasswordResetModal();
      }, 2000);

    } catch (error) {
      console.error('Password reset error:', error);
      showResetError(window.AuthUtils.getErrorMessage(error));
    } finally {
      setResetLoading(false);
    }
  }

  /**
   * Show error message
   * @param {string} formType - 'signin' or 'signup'
   * @param {string} message
   */
  function showError(formType, message) {
    const errorEl = formType === 'signin' ? signinError : signupError;
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  /**
   * Clear error message
   * @param {string} formType - 'signin' or 'signup'
   */
  function clearError(formType) {
    const errorEl = formType === 'signin' ? signinError : signupError;
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  }

  /**
   * Clear all error messages
   */
  function clearErrors() {
    clearError('signin');
    clearError('signup');
  }

  /**
   * Set loading state
   * @param {boolean} loading
   * @param {string} context - 'signin', 'signup', or 'google'
   */
  function setLoading(loading, context) {
    isLoading = loading;

    // Update button states
    [signinBtn, signupBtn, googleSigninBtn, googleSignupBtn].forEach(btn => {
      if (btn) {
        btn.disabled = loading;
      }
    });

    // Update button text
    if (context === 'signin' && signinBtn) {
      signinBtn.textContent = loading ? 'Signing In...' : 'Sign In';
    } else if (context === 'signup' && signupBtn) {
      signupBtn.textContent = loading ? 'Creating Account...' : 'Create Account';
    } else if (context === 'google') {
      [googleSigninBtn, googleSignupBtn].forEach(btn => {
        if (btn) {
          const span = btn.querySelector('span');
          if (span) {
            span.textContent = loading ? 'Please wait...' : 'Continue with Google';
          }
        }
      });
    }
  }

  /**
   * Show reset error message
   * @param {string} message
   */
  function showResetError(message) {
    if (resetError) {
      resetError.textContent = message;
      resetError.classList.remove('hidden');
    }
  }

  /**
   * Show reset success message
   * @param {string} message
   */
  function showResetSuccess(message) {
    if (resetSuccess) {
      resetSuccess.textContent = message;
      resetSuccess.classList.remove('hidden');
    }
  }

  /**
   * Clear reset messages
   */
  function clearResetMessages() {
    if (resetError) {
      resetError.textContent = '';
      resetError.classList.add('hidden');
    }
    if (resetSuccess) {
      resetSuccess.textContent = '';
      resetSuccess.classList.add('hidden');
    }
  }

  /**
   * Set password reset loading state
   * @param {boolean} loading
   */
  function setResetLoading(loading) {
    if (sendResetBtn) {
      sendResetBtn.disabled = loading;
      sendResetBtn.textContent = loading ? 'Sending...' : 'Send Reset Link';
    }
  }

  /**
   * Handle form submission errors gracefully
   * @param {Error} error
   * @param {string} context
   */
  function handleFormError(error, context) {
    console.error(`${context} error:`, error);
    
    // Show user-friendly error message
    const message = window.AuthUtils.getErrorMessage(error);
    showError(context, message);
    
    // Reset form state
    setLoading(false, context);
  }

  /**
   * Initialize page when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /**
   * Start agile flow animation with cycling active states
   */
  function startAgileFlowAnimation() {
    const flowSteps = document.querySelectorAll('.flow-step');
    if (flowSteps.length === 0) return;

    let currentStep = 0;
    
    function cycleSteps() {
      // Remove active class from all steps
      flowSteps.forEach(step => step.classList.remove('active'));
      
      // Add active class to current step
      if (flowSteps[currentStep]) {
        flowSteps[currentStep].classList.add('active');
      }
      
      // Move to next step
      currentStep = (currentStep + 1) % flowSteps.length;
    }
    
    // Start the animation after initial load delay
    setTimeout(() => {
      cycleSteps();
      setInterval(cycleSteps, 1200); // Change active step every 1.2 seconds
    }, 3000); // Wait 3 seconds for initial animations to complete
  }

  // Export for testing purposes
  window.AuthPage = {
    switchTab,
    handleSigninSubmit,
    handleSignupSubmit,
    handleGoogleAuth,
    validateSignupForm,
    startAgileFlowAnimation
  };

})();