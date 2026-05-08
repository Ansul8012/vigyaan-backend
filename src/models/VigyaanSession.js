const mongoose = require('mongoose');

const vigyaanSessionSchema = new mongoose.Schema(
  {
    isOpen: {
      type: Boolean,
      default: false,
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    openedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('VigyaanSession', vigyaanSessionSchema);