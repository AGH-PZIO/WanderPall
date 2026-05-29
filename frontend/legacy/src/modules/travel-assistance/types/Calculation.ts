export type Expense = {
  id: string;
  calculation_id: string;
  category: string;
  amount: number;
  currency: string;
};

export interface ExpenseBase {
  category: string;
  amount: number;
  currency: string;
}

export type Calculation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  expenses: Expense[];
  total: number;
};

export type CreateCalculationDTO = {
  title: string;
  expenses: ExpenseBase[];
  total: number;
};
