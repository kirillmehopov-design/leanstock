import * as authService from '../services/authService.js';

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function registerSuperAdmin(req, res, next) {
  try {
    const result = await authService.registerSuperAdmin(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ code: 'INVALID_TOKEN', message: 'Verification token is required.' });
    }
    const result = await authService.verifyEmail(token);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const result = await authService.logout(req.body.refreshToken);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function requestPasswordReset(req, res, next) {
  try {
    const result = await authService.requestPasswordReset(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
