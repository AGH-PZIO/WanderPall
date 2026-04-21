export type Expense = {
  id: string;
  calculation_id: string;
  category: string;
  amount: number;
};

export interface ExpenseBase {
  category: string;
  amount: number;
}

export type Calculation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  expenses: Expense[];
};

export type CreateCalculationDTO = {
  title: string;
  expenses: ExpenseBase[];
};
