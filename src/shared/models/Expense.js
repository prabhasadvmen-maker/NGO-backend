import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    expenseId: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: [
        'Project Expenditure',
        'Event Expenses',
        'Staff Salary',
        'Utilities & Bills',
        'Rent',
        'Office Supplies',
        'Travel & Transport',
        'Campaign Marketing',
        'Others'
      ],
      default: 'Others',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['cash', 'bank_transfer', 'cheque', 'card', 'online', 'other'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      required: [true, 'Payment status is required'],
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate sequential expenseId
expenseSchema.pre('save', async function (next) {
  if (!this.expenseId) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      
      const count = await mongoose.model('Expense').countDocuments({
        createdAt: { $gte: startOfYear, $lte: endOfYear }
      });
      
      const sequence = String(count + 1).padStart(5, '0');
      this.expenseId = `EXP-${year}-${sequence}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
