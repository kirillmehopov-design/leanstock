import * as reservationService from '../services/reservationService.js';

export async function createReservation(req, res, next) {
  try {
    const reservation = await reservationService.createReservation({ tenantId: req.tenant.id, actorUserId: req.user.id, data: req.body });
    res.status(201).json(reservation);
  } catch (error) { next(error); }
}

export async function listReservations(req, res, next) {
  try { res.json({ data: await reservationService.listReservations({ tenantId: req.tenant.id }) }); }
  catch (error) { next(error); }
}

export async function confirmReservation(req, res, next) {
  try {
    res.status(201).json(await reservationService.confirmReservation({ tenantId: req.tenant.id, actorUserId: req.user.id, reservationId: req.params.id }));
  } catch (error) { next(error); }
}

export async function cancelReservation(req, res, next) {
  try {
    res.json(await reservationService.cancelReservation({ tenantId: req.tenant.id, actorUserId: req.user.id, reservationId: req.params.id }));
  } catch (error) { next(error); }
}
