const express = require('express');
const cors = require('cors');
const Joi = require('joi');

const app = express();
app.use(cors());
app.use(express.json());

// API key auth middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.headers['x-api-key'];
  if (process.env.API_KEY && (!key || key !== process.env.API_KEY)) {
    return res.status(401).json({ success: false, error: 'Invalid or missing API key' });
  }
  next();
});

// Expense schema for input validation
const expenseSchema = Joi.object({
  amount: Joi.number().required(),
  category: Joi.string().required(),
});

// Budget summary endpoint
app.post('/budget-summary', async (req, res) => {
  try {
    // Validate input expenses
    const { error } = Joi.array().items(expenseSchema).validate(req.body.expenses);
    if (error) {
      return res.status(400).json({ success: false, error: 'Invalid expenses', message: error.details[0].message });
    }

    // Group expenses by category and calculate totals
    const expensesByCategory = {};
    req.body.expenses.forEach((expense) => {
      if (!expensesByCategory[expense.category]) {
        expensesByCategory[expense.category] = 0;
      }
      expensesByCategory[expense.category] += expense.amount;
    });

    // Calculate budget summary
    const budgetSummary = {};
    Object.keys(expensesByCategory).forEach((category) => {
      budgetSummary[category] = expensesByCategory[category];
    });

    // Overspend warnings
    const overspendWarnings = [];
    Object.keys(budgetSummary).forEach((category) => {
      if (budgetSummary[category] > (req.body.budgets && req.body.budgets[category]) || 0) {
        overspendWarnings.push(`Overspend warning: ${category} (${budgetSummary[category]})`);
      }
    });

    // Return budget summary with overspend warnings
    return res.json({
      success: true,
      data: {
        budgetSummary,
        overspendWarnings,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  return res.json({ success: true, data: 'API is healthy' });
});

// 404 handler
app.use((req, res) => {
  return res.status(404).json({ success: false, error: 'Not found', message: 'Endpoint not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  return res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});