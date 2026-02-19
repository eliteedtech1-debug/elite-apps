const express = require("express");
const passport = require("passport");
const attendanceController = require("../controllers/attendance");
const { signin, signout, status, report, dashboard, postAttendanceSetup, getAttendanceSetup, getAttendanceSetupById, getAttendanceAllAttendance, updateAttendanceStatus, getAttendanceSummary, getDetailedAttendance } = require("../controllers/newAttendance");

module.exports = (app) => {
  app.post("/attendance/check-in", attendanceController.checkIn);
  app.post("/attendance/check-out", attendanceController.checkOut);
  app.get("/attendance", attendanceController.getAllAttendance);
  app.get("/attendance/:id", attendanceController.getAttendanceById);
  app.delete("/attendance/:id", attendanceController.deleteAttendanceById);
  app.delete("/attendance", attendanceController.deleteAllAttendance);
  
  // Attendance Scanner for QR codes (requires authentication)
  app.post(
    "/admin/attendance/quick-scan",
    passport.authenticate('jwt', { session: false }),
    attendanceController.quickScan
  );
  
  // Quick checkout scanner for early departures (requires authentication)
  app.post(
    "/admin/attendance/quick-checkout",
    passport.authenticate('jwt', { session: false }),
    attendanceController.quickCheckout
  );
  
  // Get daily attendance records (requires authentication)
  app.get(
    "/admin/attendance/daily",
    passport.authenticate('jwt', { session: false }),
    attendanceController.getDailyAttendance
  );

  // Staff attendance endpoints
  app.post(
    "/admin/staff-attendance/quick-scan",
    passport.authenticate('jwt', { session: false }),
    attendanceController.staffQuickScan
  );

  app.post(
    "/admin/staff-attendance/quick-checkout",
    passport.authenticate('jwt', { session: false }),
    attendanceController.staffQuickCheckout
  );

  app.get(
    "/admin/staff-attendance/daily",
    passport.authenticate('jwt', { session: false }),
    attendanceController.getStaffDailyAttendance
  );
  
  app.post('/api/attendance/signin',signin);
  app.post('/api/attendance/signout', signout);
  app.get('/api/attendance/status/:user_id', status);
  app.get('/api/attendance/report/:user_id', report);
  app.get('/api/attendance/dashboard/:school_id',dashboard);
  app.post('/api/attendance-setup',postAttendanceSetup);
  app.get('/api/attendance-setup',getAttendanceSetup);
  app.get('/api/attendance-setup-by-id',getAttendanceSetupById);
  app.get('/api/attendance-all',getAttendanceAllAttendance);
  app.get('/api/attendance/summary', getAttendanceSummary);
  app.get('/api/attendance/details', getDetailedAttendance);
  app.post('/api/attendance-status',updateAttendanceStatus);
};
