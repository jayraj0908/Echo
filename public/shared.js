/**
 * Shared Authentication Utilities
 * 
 * Common Firebase authentication functions used across all pages
 * (landing, login, and app pages)
 */

(function() {
  'use strict';

  // Global authentication state
  window.AuthUtils = {
    currentUser: null,
    isInitialized: false,
    callbacks: []
  };

  /**
   * Initialize Firebase Auth listener
   * This should be called on every page
   */
  window.AuthUtils.init = function() {
    if (!window.auth) {
      console.error('Firebase auth not initialized');
      return;
    }

    // Set up auth state listener
    window.auth.onAuthStateChanged((user) => {
      window.AuthUtils.currentUser = user;
      window.AuthUtils.isInitialized = true;
      
      // Call all registered callbacks
      window.AuthUtils.callbacks.forEach(callback => {
        try {
          callback(user);
        } catch (error) {
          console.error('Auth callback error:', error);
        }
      });
    });
  };

  /**
   * Register a callback for auth state changes
   * @param {Function} callback - Function to call when auth state changes
   */
  window.AuthUtils.onAuthStateChanged = function(callback) {
    window.AuthUtils.callbacks.push(callback);
    
    // If already initialized, call immediately
    if (window.AuthUtils.isInitialized) {
      callback(window.AuthUtils.currentUser);
    }
  };

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  window.AuthUtils.isAuthenticated = function() {
    return window.AuthUtils.currentUser !== null;
  };

  /**
   * Get current user info
   * @returns {Object|null}
   */
  window.AuthUtils.getCurrentUser = function() {
    return window.AuthUtils.currentUser;
  };

  /**
   * Redirect to login page
   * @param {string} returnUrl - URL to return to after login
   */
  window.AuthUtils.redirectToLogin = function(returnUrl = null) {
    const loginUrl = '/login.html';
    if (returnUrl) {
      sessionStorage.setItem('auth_return_url', returnUrl);
    }
    window.location.href = loginUrl;
  };

  /**
   * Redirect to app page
   */
  window.AuthUtils.redirectToApp = function() {
    window.location.href = '/app.html';
  };

  /**
   * Redirect to landing page
   */
  window.AuthUtils.redirectToHome = function() {
    window.location.href = '/';
  };

  /**
   * Get return URL and clear it from storage
   * @returns {string|null}
   */
  window.AuthUtils.getReturnUrl = function() {
    const returnUrl = sessionStorage.getItem('auth_return_url');
    if (returnUrl) {
      sessionStorage.removeItem('auth_return_url');
    }
    return returnUrl || '/app.html';
  };

  /**
   * Sign out the current user
   */
  window.AuthUtils.signOut = async function() {
    try {
      await window.auth.signOut();
      window.AuthUtils.redirectToHome();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  /**
   * Show/hide loading state
   * @param {boolean} loading
   * @param {string} elementId
   */
  window.AuthUtils.setLoading = function(loading, elementId = 'auth-loading') {
    const loadingEl = document.getElementById(elementId);
    if (loadingEl) {
      loadingEl.style.display = loading ? 'flex' : 'none';
    }
  };

  /**
   * Display auth error message
   * @param {string} message
   * @param {string} elementId
   */
  window.AuthUtils.showError = function(message, elementId = 'auth-error') {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  };

  /**
   * Clear auth error message
   * @param {string} elementId
   */
  window.AuthUtils.clearError = function(elementId = 'auth-error') {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  };

  /**
   * Get friendly error message from Firebase error
   * @param {Error} error
   * @returns {string}
   */
  window.AuthUtils.getErrorMessage = function(error) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed. Please try again.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  };

  /**
   * Validate email format
   * @param {string} email
   * @returns {boolean}
   */
  window.AuthUtils.isValidEmail = function(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate password strength
   * @param {string} password
   * @returns {Object} {valid: boolean, message: string}
   */
  window.AuthUtils.validatePassword = function(password) {
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long.' };
    }
    return { valid: true, message: '' };
  };

  /**
   * Handle Google authentication
   */
  window.AuthUtils.signInWithGoogle = async function() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await window.auth.signInWithPopup(provider);
      
      // Check if this is a new user and create user document
      if (result.additionalUserInfo.isNewUser) {
        await window.db.collection('users').doc(result.user.uid).set({
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      return result.user;
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  };

  /**
   * Handle email/password sign in
   * @param {string} email
   * @param {string} password
   */
  window.AuthUtils.signInWithEmail = async function(email, password) {
    try {
      const result = await window.auth.signInWithEmailAndPassword(email, password);
      return result.user;
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
    }
  };

  /**
   * Handle email/password sign up
   * @param {string} email
   * @param {string} password
   * @param {string} displayName
   */
  window.AuthUtils.signUpWithEmail = async function(email, password, displayName) {
    try {
      const result = await window.auth.createUserWithEmailAndPassword(email, password);
      
      // Update user profile with display name
      if (displayName) {
        await result.user.updateProfile({
          displayName: displayName
        });
      }
      
      // Create user document in Firestore
      await window.db.collection('users').doc(result.user.uid).set({
        email: email,
        displayName: displayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return result.user;
    } catch (error) {
      console.error('Email sign up error:', error);
      throw error;
    }
  };

  /**
   * Send password reset email
   * @param {string} email
   */
  window.AuthUtils.sendPasswordReset = async function(email) {
    try {
      await window.auth.sendPasswordResetEmail(email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  /**
   * Page protection utilities
   */
  window.AuthUtils.PageProtection = {
    /**
     * Protect a page - redirect to login if not authenticated
     * @param {Function} onAuthenticated - Callback when user is authenticated
     */
    requireAuth: function(onAuthenticated) {
      window.AuthUtils.onAuthStateChanged((user) => {
        if (user) {
          if (onAuthenticated) onAuthenticated(user);
        } else {
          window.AuthUtils.redirectToLogin(window.location.pathname);
        }
      });
    },

      /**
   * Redirect authenticated users away from auth pages
   * @param {Function} onUnauthenticated - Callback when user is not authenticated
   */
  redirectIfAuthenticated: function(onUnauthenticated) {
    let hasRedirected = false;
    
    window.AuthUtils.onAuthStateChanged((user) => {
      if (user && !hasRedirected) {
        console.log('User is authenticated, redirecting to app...');
        hasRedirected = true;
        window.AuthUtils.redirectToApp();
      } else if (!user && !hasRedirected) {
        console.log('User is not authenticated, showing login form...');
        hasRedirected = true;
        if (onUnauthenticated) onUnauthenticated();
      }
    });
  }
  };

  // Auto-initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.AuthUtils.init(), 100);
    });
  } else {
    setTimeout(() => window.AuthUtils.init(), 100);
  }

})();