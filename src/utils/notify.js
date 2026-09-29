const Notification = require("../models/Notification");

async function notify({ userId, type, message, reportId, claimId }) {
  return Notification.create({ userId, type, message, reportId, claimId });
}

module.exports = notify;
